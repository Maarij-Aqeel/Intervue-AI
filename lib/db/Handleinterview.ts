import { supabase } from "../supabase/client";
import { getAdminSupabase } from "../supabase/admin";

export const insertInterview = async (
  interviewData: {
    id: string;
    title: string;
    difficulty: string;
    duration: number;
  },
  userid: string
) => {
  if (!userid) {
    console.error("User not authenticated");
    return { error: "User not authenticated" };
  }

  const { id, title, difficulty, duration } = interviewData;

  const { error: insertError } = await supabase.from("interviews").insert({
    id: id,
    created_by: userid,
    title,
    difficulty,
    duration,
  });

  if (insertError) {
    console.error("Error inserting Interview data: " + insertError.message);
    return { error: insertError.message };
  }

  return { message: "Interview data insertion successful!" };
};

export const getinterview = async (interviewId: string) => {
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("id", interviewId)
    .single();

  if (error) {
    console.log("Error fetching interview", error.message);
    return null;
  }

  return data;
};

export const insertsessions = async (
  sessionData: {
    interview_id: string;
    student_id: string;
    scores: number;
    status: string;
    questions: Array<{ question: string; answer: string }>;
    feedback: {
      strengths: string;
      needed_improvements: string;
    };
    assignedBy?: string | null;
    startedAt: string;
    completedAt: string;
  },
  useAdmin = false
) => {
  const {
    interview_id,
    student_id,
    scores,
    status,
    questions,
    feedback,
    startedAt,
    completedAt,
  } = sessionData;

  const client = useAdmin ? await getAdminSupabase() : supabase;

  const { error: updateError } = await client
    .from("interview_sessions")
    .update({
      scores,
      status,
      questions,
      feedback,
      started_at: startedAt,
      completed_at: completedAt,
    })
    .eq("interview_id", interview_id)
    .eq("student_id", student_id);

  if (updateError) {
    console.error("Error updating session data: " + updateError.message);
    return { error: updateError.message };
  }

  return { message: "Session data insertion successful!" };
};

export const getsessions = async (userid: string) => {
  const { data, error } = await supabase
    .from("interview_sessions")
    .select(
      `
      *,interviews(id,title,difficulty,duration,created_at)
  `
    )
    .eq("student_id", userid)
    .order("started_at", { ascending: false });

  if (error) {
    console.log("Error getting user interviews ", error.message);
    throw error;
  }
  return data;
};

export const getsession = async (interviewId: string, student_id: string) => {
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*,interviews(title,difficulty,duration)")
    .match({ student_id: student_id, interview_id: interviewId });

  if (error) throw error;

  if (!data || data.length === 0 || !data[0]) {
    throw new Error("No session data found");
  }
  return data;
};
