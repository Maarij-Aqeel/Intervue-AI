"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useInterviewTimer } from "@/app/hooks/useInterviewTimer";
import { InterviewHeader } from "@/components/InterviewHeader";
import { InterviewContent } from "@/components/InterviewContent";
import { TranscriptEntry } from "@/components/LiveKitInterview";
import InterviewConnecting from "@/components/InterviewConnecting";

// 3D canvas — client only, no SSR
const VoiceOrb = dynamic(() => import("@/components/VoiceOrb"), { ssr: false });

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
  // Shared mutable audio level (0..1) — written by LiveKit analysis,
  // read by the orb in its own rAF loop (no re-renders).
  const audioLevelRef = useRef(0);

  const { minutes, seconds, timeLeft, progressValue, stopCall, setStopCall } =
    useInterviewTimer({
      duration: interview.duration,
      interviewId: interview.id,
      profile,
      agentConnected,
    });

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Background reactive voice orb */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
        <VoiceOrb levelRef={audioLevelRef} />
      </div>

      {/* Subtle glass layer — light frost so the premium blob still reads,
          with bottom darkening for transcript legibility */}
      <div className="fixed inset-0 z-0 backdrop-blur-sm bg-gradient-to-b from-transparent via-black/10 to-black/40 pointer-events-none" />

      {/* Connecting overlay — shown until agent audio track arrives */}
      {!agentConnected && (
        <div className="relative z-20">
          <InterviewConnecting />
        </div>
      )}

      {/* Interview UI — always mounted so LiveKit connects immediately */}
      <div className={`relative z-10 ${!agentConnected ? "hidden" : ""}`}>
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
          audioLevelRef={audioLevelRef}
        />
      </div>
    </div>
  );
}
