const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const FLASH_MODEL = "deepseek/deepseek-v4-flash";
const PRO_MODEL = "deepseek/deepseek-v4-pro";

type DifficultyConfig = {
  model: string;
  reasoning?: { effort: "none" | "low" | "medium" | "high" | "max" };
  depth: string;
};

const DIFFICULTY_CONFIG: Record<string, DifficultyConfig> = {
  Beginner: {
    model: FLASH_MODEL,
    // Non-think mode — no reasoning overhead
    depth: "foundational and conceptual, suitable for junior developers",
  },
  Intermediate: {
    model: FLASH_MODEL,
    reasoning: { effort: "high" },
    depth: "practical and applied, suitable for mid-level developers solving real-world problems",
  },
  Professional: {
    model: PRO_MODEL,
    reasoning: { effort: "max" },
    depth: "advanced and architectural, suitable for senior engineers — include system design, scalability, trade-offs, and edge cases",
  },
};

const baseSystemPrompt = `You are an expert technical interviewer. Generate interview questions as a strict JSON object.
Return ONLY valid JSON with no markdown, no code fences, no explanation — just the object:
{ "questions": ["question 1", "question 2", ...] }`;

export async function retrieveQuestions(interview: {
  title: string;
  difficulty: string;
  duration: number;
}): Promise<{ output: { questions: string[] } } | null> {
  const config = DIFFICULTY_CONFIG[interview.difficulty] ?? DIFFICULTY_CONFIG.Beginner;
  const count = Math.max(3, Math.round(interview.duration / 4));

  const body: Record<string, unknown> = {
    model: config.model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: baseSystemPrompt },
      {
        role: "user",
        content: `Generate exactly ${count} interview questions for a ${interview.title} interview lasting ${interview.duration} minutes.
Difficulty: ${interview.difficulty} — questions should be ${config.depth}.
Vary the topics to cover the breadth of the domain and increase difficulty progressively.`,
      },
    ],
  };

  if (config.reasoning) {
    body.reasoning = config.reasoning;
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;

  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.content;
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.questions)) return null;

  return { output: { questions: parsed.questions } };
}
