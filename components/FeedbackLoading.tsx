"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const STEPS = [
  { label: "Checking your responses", delay: 0 },
  { label: "Evaluating answers", delay: 3000 },
  { label: "Generating detailed feedback", delay: 8000 },
  { label: "Preparing your results", delay: 14000 },
];

export default function FeedbackLoading() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((step, i) => {
      const completeDelay = step.delay + 2200;
      timers.push(
        setTimeout(() => setCompletedSteps((prev) => [...prev, i]), completeDelay)
      );
      if (i + 1 < STEPS.length) {
        timers.push(
          setTimeout(() => setActiveStep(i + 1), step.delay + 2500)
        );
      }
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen text-white bg-hero-gradient">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-10 px-6"
      >
        {/* Animated brain/analysis icon */}
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.12, 0.35] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-24 h-24 rounded-full bg-secondary/30"
          />
          <motion.div
            animate={{ scale: [1, 1.22, 1], opacity: [0.25, 0.08, 0.25] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            className="absolute w-36 h-36 rounded-full bg-secondary/20"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-secondary/30 border-t-secondary"
          />
          {/* Inner dot */}
          <motion.div
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute w-4 h-4 rounded-full bg-secondary/60"
          />
        </div>

        {/* Title */}
        <div className="text-center">
          <motion.h2
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xl font-semibold text-white"
          >
            Analyzing your interview
          </motion.h2>
          <p className="text-gray-500 text-sm mt-1">This usually takes 20–30 seconds</p>
        </div>

        {/* Steps list */}
        <div className="flex flex-col gap-4 w-full max-w-xs">
          {STEPS.map((step, i) => {
            const done = completedSteps.includes(i);
            const active = activeStep === i && !done;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: i <= activeStep ? 1 : 0.3, x: 0 }}
                transition={{ duration: 0.4, delay: step.delay / 1000 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                  {done ? (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      className="w-5 h-5 text-secondary"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </motion.svg>
                  ) : active ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 rounded-full border-2 border-secondary/30 border-t-secondary"
                    />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-600" />
                  )}
                </div>

                <span
                  className={`text-sm font-medium transition-colors duration-300 ${
                    done
                      ? "text-secondary"
                      : active
                      ? "text-white"
                      : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
