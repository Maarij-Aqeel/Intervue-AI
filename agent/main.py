import asyncio
import json
import os
import logging
from datetime import datetime, timezone

import aiohttp
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import Agent, AgentSession, AutoSubscribe, JobContext, WorkerOptions, cli, llm, room_io
from livekit.plugins import cartesia, deepgram, silero
from livekit.plugins import openai as lk_openai

from prompt import build_system_prompt

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("intervue-agent")

OPENROUTER_API_KEY = os.environ["OPENROUTER_API_KEY"]
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEEPSEEK_FLASH = "deepseek/deepseek-v4-flash"


async def _openrouter_json(messages: list[dict]) -> str:
    """Call OpenRouter with json_object response format, return raw content string."""
    async with aiohttp.ClientSession() as http:
        async with http.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEEPSEEK_FLASH,
                "response_format": {"type": "json_object"},
                "messages": messages,
            },
            timeout=aiohttp.ClientTimeout(total=60),
        ) as resp:
            data = await resp.json()
            return data["choices"][0]["message"]["content"]


async def _extract_qa(conversation_log: list[dict], questions: list[str]) -> list[dict]:
    if not conversation_log:
        return [{"question": q, "answer": "No answer provided"} for q in questions]

    transcript = "\n".join(
        f"{'Interviewer' if m['role'] == 'assistant' else 'Candidate'}: {m['content']}"
        for m in conversation_log
        if m["role"] in ("user", "assistant")
    )

    system = (
        "You extract interview question-answer pairs from a transcript. "
        'Return ONLY valid JSON: {"pairs": [{"question": "...", "answer": "..."}]}. '
        "If a question was not answered, use \"No answer provided\"."
    )
    user = (
        f"Original questions:\n"
        + "\n".join(f"{i+1}. {q}" for i, q in enumerate(questions))
        + f"\n\nTranscript:\n{transcript}"
    )

    try:
        raw = await _openrouter_json([{"role": "system", "content": system}, {"role": "user", "content": user}])
        return json.loads(raw).get("pairs", [])
    except Exception as e:
        logger.error("Q&A extraction failed: %s", e)
        return [{"question": q, "answer": "No answer provided"} for q in questions]


async def _submit_evaluation(
    interview_id: str,
    user_id: str,
    qa: list[dict],
    started_at: str,
    completed_at: str,
) -> None:
    next_app_url = os.environ.get("NEXT_APP_URL", "http://localhost:3000").rstrip("/")
    try:
        async with aiohttp.ClientSession() as http:
            async with http.post(
                f"{next_app_url}/api/evaluate",
                json={
                    "interviewId": interview_id,
                    "userId": user_id,
                    "startedAt": started_at,
                    "completedAt": completed_at,
                    "qa": qa,
                },
                timeout=aiohttp.ClientTimeout(total=60),
            ) as resp:
                body = await resp.text()
                if resp.status != 200:
                    logger.error("Evaluation endpoint error %s: %s", resp.status, body)
                else:
                    logger.info("Evaluation submitted for interview %s", interview_id)
    except Exception as e:
        logger.error("Failed to submit evaluation: %s", e)


class InterviewAgent(Agent):
    def __init__(self, *, instructions: str, name: str, questions: list[str], duration: int):
        super().__init__(instructions=instructions)
        self._name = name
        self._questions = questions
        self._duration = duration

    async def on_enter(self) -> None:
        await self.session.say(
            f"Hello {self._name}, I'm Alexis. I'll be conducting your technical interview today. "
            f"We have {self._duration} minutes and I'll ask you {len(self._questions)} questions. "
            "Take your time with each answer — I value clear reasoning. Ready to begin?",
            allow_interruptions=False,
        )


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    meta = json.loads(ctx.room.metadata or "{}")
    questions: list[str] = meta.get("questions", [])
    name: str = meta.get("name", "Candidate")
    duration: int = int(meta.get("duration", 10))
    interview_id: str = meta.get("interviewId", "")
    user_id: str = meta.get("userId", "")

    logger.info("Waiting for participant to join room %s", interview_id)
    # Block until the human participant is actually in the room so that
    # session.start() has a real audio track to attach to and on_enter() can
    # speak immediately.
    participant = await ctx.wait_for_participant()
    logger.info("Participant joined: %s", participant.identity)

    started_at = datetime.now(timezone.utc).isoformat()
    conversation_log: list[dict] = []

    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="en-US"),
        llm=lk_openai.LLM(
            model=DEEPSEEK_FLASH,
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
        ),
        tts=cartesia.TTS(
            voice=os.environ.get("CARTESIA_VOICE_ID", "694f9389-aac1-45b6-b726-9d9369183238"),
        ),
        vad=silero.VAD.load(),
    )

    @session.on("conversation_item_added")
    def on_item_added(ev) -> None:
        item = ev.item
        if not isinstance(item, llm.ChatMessage):
            return
        text: str = item.text_content or ""
        if not text:
            return
        conversation_log.append({"role": item.role, "content": text})
        if item.role == "user":
            asyncio.create_task(
                ctx.room.local_participant.publish_data(
                    json.dumps({"type": "transcript", "text": text}).encode(),
                    reliable=True,
                )
            )

    @ctx.room.on("data_received")
    def on_data(data: rtc.DataPacket) -> None:
        try:
            msg = json.loads(data.data.decode())
            if msg.get("type") == "time_warning":
                session.generate_reply(
                    instructions="Only 30 seconds remain. Wrap up the interview gracefully after this answer.",
                )
        except Exception:
            pass

    done = asyncio.Event()

    @session.on("close")
    def on_session_close(ev) -> None:
        done.set()

    await session.start(
        agent=InterviewAgent(
            instructions=build_system_prompt(questions, name, duration),
            name=name,
            questions=questions,
            duration=duration,
        ),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            participant_identity=participant.identity,
        ),
    )

    try:
        await asyncio.wait_for(done.wait(), timeout=(duration + 2) * 60)
    except asyncio.TimeoutError:
        logger.info("Hard timeout reached for interview %s", interview_id)
        session.shutdown()

    completed_at = datetime.now(timezone.utc).isoformat()
    logger.info("Extracting Q&A for interview %s", interview_id)

    qa = await _extract_qa(conversation_log, questions)
    await _submit_evaluation(interview_id, user_id, qa, started_at, completed_at)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
