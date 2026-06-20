import { NextResponse } from "next/server";
import { insertsessions } from "@/lib/db/Handleinterview";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = "deepseek/deepseek-v4-flash";

const evaluationPrompt = `You are a professional technical interview evaluator.
You will receive a set of interview questions and the candidate's spoken answers.
Evaluate the candidate's overall technical understanding, reasoning, and clarity.
Consider all answers together — ignore minor transcription flaws unless they affect meaning.

Return ONLY valid JSON with this exact structure:
{
  "score": <integer 0-100>,
  "feedback": {
    "strengths": "<bullet points: what was done well>",
    "needed_improvements": "<bullet points: what needs improvement>"
  }
}`;

export async function POST(req: Request) {
  try {
    const { interviewId, userId, startedAt, completedAt, qa, incomplete } =
      await req.json();

    if (!interviewId || !userId) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Interview terminated before any real answer — mark pending, skip evaluation.
    const noAnswers =
      incomplete ||
      !Array.isArray(qa) ||
      qa.length === 0 ||
      qa.every(
        (p: { answer?: string }) =>
          !p.answer ||
          !p.answer.trim() ||
          p.answer.trim().toLowerCase() === "no answer provided"
      );

    if (noAnswers) {
      const dbResult = await insertsessions(
        {
          interview_id: interviewId,
          student_id: userId,
          scores: 0,
          status: "pending",
          questions: [],
          feedback: { strengths: "", needed_improvements: "" },
          startedAt: startedAt ?? new Date().toISOString(),
          completedAt: completedAt ?? new Date().toISOString(),
        },
        true
      );
      if (dbResult?.error) {
        throw new Error(`DB update failed: ${dbResult.error}`);
      }
      return NextResponse.json({ success: true, status: "pending" });
    }

    const userResponse = qa
      .map(
        ({ question, answer }: { question: string; answer: string }) =>
          `Question: ${question}\nAnswer: ${answer}`
      )
      .join("\n\n");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: evaluationPrompt },
          { role: "user", content: userResponse },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    const dbResult = await insertsessions(
      {
        interview_id: interviewId,
        student_id: userId,
        scores: parsed.score,
        status: "Completed",
        questions: qa,
        feedback: parsed.feedback,
        startedAt: startedAt ?? new Date().toISOString(),
        completedAt: completedAt ?? new Date().toISOString(),
      },
      true
    );

    if (dbResult?.error) {
      throw new Error(`DB update failed: ${dbResult.error}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Evaluation error:", err);
    return NextResponse.json(
      { error: "Evaluation failed", details: String(err) },
      { status: 500 }
    );
  }
}
