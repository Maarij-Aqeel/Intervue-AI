"use client";

import gettime from "@/lib/time";
import Loading from "@/components/Loading";
import { useInterviewLogic } from "@/app/hooks/useInterviewLogic";
import { TextFade } from "@/components/FadeUp";
import { use, useEffect, useState } from "react";
import { useUser } from "@/app/context/user-context";
import TimerWrapper from "@/components/TimerWrapper";
import { usePathname } from "next/navigation";
import { useInterceptRouteChange } from "@/app/hooks/useInterceptRoute";
import Error from "@/components/Error";
import { TranscriptEntry } from "@/components/LiveKitInterview";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [error, setError] = useState<Error | null>(null);
  const { interview, questions, questionsArray, isLoading } = useInterviewLogic({
    id,
    setError,
  });
  const [pending, setPending] = useState(false);
  const { profile } = useUser();
  const pathname = usePathname();
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  useInterceptRouteChange(pending);

  useEffect(() => {
    setPending(true);
  }, [pathname]);

  if (isLoading || !interview) {
    return (
      <Loading
        msg1="Preparing your interview..."
        msg2="Generating personalized questions"
      />
    );
  }

  if (error) {
    return <Error msg="Unable to generate Questions. Try again Later" />;
  }

  const vapitime = gettime(interview.duration * 60);

  return (
    <TextFade
      direction="up"
      className="flex flex-col min-h-screen px-4 py-4 overflow-hidden bg-hero-gradient"
    >
      <TimerWrapper
        interview={interview}
        profile={profile}
        vapitime={vapitime}
        questions={questions}
        questionsArray={questionsArray}
        transcript={transcript}
        setTranscript={setTranscript}
        setError={setError}
      />
    </TextFade>
  );
}
