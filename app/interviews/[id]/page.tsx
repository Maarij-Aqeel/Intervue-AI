"use client";

import gettime from "@/lib/time";
import { useInterviewLogic } from "@/app/hooks/useInterviewLogic";
import { TextFade } from "@/components/FadeUp";
import { use, useEffect, useState } from "react";
import { useUser } from "@/app/context/user-context";
import TimerWrapper from "@/components/TimerWrapper";
import { usePathname } from "next/navigation";
import { useInterceptRouteChange } from "@/app/hooks/useInterceptRoute";
import Error from "@/components/Error";
import InterviewConnecting from "@/components/InterviewConnecting";
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
  const [agentConnected, setAgentConnected] = useState(false);

  useInterceptRouteChange(pending);

  useEffect(() => {
    setPending(true);
  }, [pathname]);

  if (error) {
    return <Error msg="Unable to generate Questions. Try again Later" />;
  }

  const vapitime = interview ? gettime(interview.duration * 60) : "";

  return (
    <TextFade
      direction="up"
      className="flex flex-col min-h-screen px-4 py-4 overflow-hidden bg-hero-gradient"
    >
      {/* One dynamic loading screen for BOTH phases:
          generating questions, then connecting the agent. */}
      {!agentConnected && <InterviewConnecting />}

      {/* Mount the interview once questions exist so LiveKit connects.
          Kept hidden until the agent is live. */}
      {!isLoading && interview && (
        <div className={agentConnected ? "" : "hidden"}>
          <TimerWrapper
            interview={interview}
            profile={profile}
            vapitime={vapitime}
            questions={questions}
            questionsArray={questionsArray}
            transcript={transcript}
            setTranscript={setTranscript}
            setError={setError}
            agentConnected={agentConnected}
            onAgentReady={() => setAgentConnected(true)}
          />
        </div>
      )}
    </TextFade>
  );
}
