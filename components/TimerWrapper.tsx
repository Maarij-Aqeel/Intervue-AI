"use client";

import { useState } from "react";
import { useInterviewTimer } from "@/app/hooks/useInterviewTimer";
import { InterviewHeader } from "@/components/InterviewHeader";
import { InterviewContent } from "@/components/InterviewContent";
import { TranscriptEntry } from "@/components/LiveKitInterview";
import InterviewConnecting from "@/components/InterviewConnecting";

export default function TimerWrapper({
  interview,
  profile,
  setError,
  vapitime,
  questions,
  questionsArray,
  transcript,
  setTranscript,
}: {
  interview: any;
  setError: any;
  profile: any;
  vapitime: string;
  questions: any;
  questionsArray: string[];
  transcript: TranscriptEntry[];
  setTranscript: React.Dispatch<React.SetStateAction<TranscriptEntry[]>>;
}) {
  const [agentConnected, setAgentConnected] = useState(false);

  const { minutes, seconds, timeLeft, progressValue, stopCall, setStopCall } =
    useInterviewTimer({
      duration: interview.duration,
      interviewId: interview.id,
      profile,
      agentConnected,
    });

  return (
    <div className="w-full">
      {/* Connecting overlay — shown until agent audio track arrives */}
      {!agentConnected && <InterviewConnecting />}

      {/* Interview UI — always mounted so LiveKit connects immediately;
          hidden via CSS while agent is still joining */}
      <div className={!agentConnected ? "hidden" : ""}>
        <InterviewHeader
          minutes={minutes}
          seconds={seconds}
          timeLeft={timeLeft}
          onEndInterview={() => setStopCall(true)}
        />

        <InterviewContent
          progressValue={progressValue}
          transcript={transcript}
          setTranscript={setTranscript}
          questionsArray={questionsArray}
          timeLeft={timeLeft}
          stopCall={stopCall}
          profile={profile}
          duration={interview.duration}
          interviewId={interview.id}
          setError={setError}
          onAgentReady={() => setAgentConnected(true)}
        />
      </div>
    </div>
  );
}
