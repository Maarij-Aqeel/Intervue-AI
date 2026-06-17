import { motion } from "framer-motion";
import TranscriptBox from "@/components/Transcript";
import Progress from "@/components/Progress";
import LiveKitInterview, { TranscriptEntry } from "@/components/LiveKitInterview";

interface InterviewContentProps {
  progressValue: number;
  transcript: TranscriptEntry[];
  setTranscript: React.Dispatch<React.SetStateAction<TranscriptEntry[]>>;
  questionsArray: string[];
  timeLeft: number;
  stopCall: boolean;
  profile: any;
  setError: any;
  duration: number;
  interviewId: string;
  onAgentReady?: () => void;
  audioLevelRef?: React.MutableRefObject<number>;
}

export const InterviewContent = ({
  progressValue,
  transcript,
  setTranscript,
  questionsArray,
  timeLeft,
  stopCall,
  profile,
  duration,
  interviewId,
  setError,
  onAgentReady,
  audioLevelRef,
}: InterviewContentProps) => {
  return (
    <>
      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-6 w-full"
      >
        <Progress progress={progressValue} />
      </motion.div>

      {/* Headless LiveKit connection (feeds the orb + transcript) */}
      <LiveKitInterview
        questionsArray={questionsArray}
        timeleft={timeLeft}
        setError={setError}
        stopCall={stopCall}
        name={profile?.name || "Candidate"}
        setTranscript={setTranscript}
        interviewId={interviewId}
        userId={profile?.id || ""}
        duration={duration}
        onAgentReady={onAgentReady}
        audioLevelRef={audioLevelRef}
      />

      {/* Live transcript — pinned center-bottom, on top of the glass layer */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-20">
        <TranscriptBox transcript={transcript} />
      </div>
    </>
  );
};
