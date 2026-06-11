import { useEffect, useState } from "react";
import { getinterview } from "@/lib/db/Handleinterview";
import { isUUID } from "@/lib/utils";
import { Interview } from "@/types/allTypes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import FormatQuestions from "@/lib/FormatQuestions";

export function useInterviewLogic({
  id,
  setError,
}: {
  id: string;
  setError: any;
}) {
  // All Variables/States
  const [interview, setInterview] = useState<null | Interview>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState("");
  const [questionsArray, setQuestionsArray] = useState<string[]>([]);
  const [interviewFound, setInterviewFound] = useState(true);
  const router = useRouter();

  // Fetch interview
  useEffect(() => {
    const fetchInterview = async () => {
      if (!isUUID(id)) {
        setInterviewFound(false);
        return;
      }

      try {
        const data = await getinterview(id);
        if (!data) {
          setInterviewFound(false);
        } else {
          setInterview(data);
          setInterviewFound(true);
        }
      } catch (error) {
        console.error("Failed to fetch interview:", error);
        setInterviewFound(false);
      }
    };

    fetchInterview();
  }, [id]); 

  // Redirect if Interview is not found 
  useEffect(() => {
    if (!interviewFound && interview === null) {
      toast.error("Invalid Interview Id. Redirecting...");
      setError(true)
      router.push("/");
    }
  }, [interviewFound, interview, router]);

  // Fetch questions when interview is loaded
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!interview || !isUUID(id)) return;

      try {
        setIsLoading(true);

        const res = await fetch("/api/n8n", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(interview),
        });

        if (!res.ok) {
          throw new Error(`Fetch failed with status ${res.status}`);
        }
        const data = await res.json();
        if (data) {
          const formatted = FormatQuestions(data);
          setQuestions(formatted);
          setQuestionsArray(data.output?.questions ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch questions", err);
        toast.error("Failed to get Questions. Try again later.");
        setError(true)
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [interview?.id, id]);

  return {
    interview,
    questions,
    questionsArray,
    isLoading,
  };
}
