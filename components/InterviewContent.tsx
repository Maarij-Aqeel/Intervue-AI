import { motion } from "framer-motion";
import TranscriptBox from "@/components/Transcript";
import Progress from "@/components/Progress";
import LiveKitInterview, { TranscriptEntry } from "@/components/LiveKitInterview";
import InterviewBackground from "./InterviewBackground";

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
}: InterviewContentProps) => {
  return (
    <>
      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-8 w-full"
      >
        <Progress progress={progressValue} />
      </motion.div>

      {/* Interview Assistant */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="flex items-center justify-start mt-10 ml-10 relative"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
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
          />
        </motion.div>
      </motion.div>

      {/* Transcript */}
      <div className="flex justify-center">
        <TranscriptBox transcript={transcript} />
      </div>

      {/* Background decoration */}
      <InterviewBackground />
    </>
  );
};
