import { retrieveQuestions } from "@/lib/generateQuestions";

export async function POST(req: Request) {
  const interview = await req.json();
  const data = await retrieveQuestions(interview);
  if (!data) {
    throw new Error("Unable to generate Questions");
  }
  return Response.json(data);
}
