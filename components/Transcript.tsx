"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { TranscriptEntry } from "./LiveKitInterview";

export default function TranscriptBox({
  transcript,
}: {
  transcript: TranscriptEntry[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 1 }}
      className="w-full mx-auto"
    >
      <div className="relative p-6 rounded-2xl border border-gray-600/30 bg-gradient-to-br from-gray-800/80 via-gray-900/90 to-black/80 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            Live Transcript
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-gradient-to-t from-secondary to-primary rounded-full"
                  animate={{
                    height: [8, 24, 12, 20, 8],
                    opacity: [0.4, 1, 0.6, 0.9, 0.4],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <motion.span
              className="text-sm font-medium bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Listening
            </motion.span>
          </div>
        </div>

        {/* Scrollable messages — scrollbar hidden, auto-scrolls to bottom */}
        <div
          ref={scrollRef}
          className="max-h-72 overflow-y-auto space-y-3 pr-1"
          style={{ scrollbarWidth: "none" }}
        >
          <AnimatePresence initial={false}>
            {transcript.map((entry, index) => {
              const isPending = entry.role === "user-pending";
              const isAgent = entry.role === "assistant";

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className={`flex flex-col gap-0.5 ${
                    isAgent ? "items-start" : "items-end"
                  }`}
                >
                  <span
                    className={`text-xs font-semibold px-1 ${
                      isAgent ? "text-primary/70" : "text-secondary/70"
                    }`}
                  >
                    {isAgent ? "Alexis" : "You"}
                  </span>

                  <div
                    className={`relative max-w-[90%] px-4 py-2 rounded-2xl text-sm font-medium leading-relaxed ${
                      isAgent
                        ? "bg-primary/10 border border-primary/20 text-gray-100 rounded-tl-none"
                        : "bg-secondary/10 border border-secondary/20 text-gray-100 rounded-tr-none"
                    }`}
                  >
                    {isPending ? (
                      /* Typing indicator — three animated dots */
                      <span className="flex items-center gap-1 h-4">
                        {[...Array(3)].map((_, i) => (
                          <motion.span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-secondary/70 inline-block"
                            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                          />
                        ))}
                      </span>
                    ) : (
                      entry.text
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {transcript.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className="flex items-center justify-center h-32 text-gray-400"
            >
              <motion.div
                className="text-center"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <p className="text-sm font-medium">Waiting for audio...</p>
                <motion.div
                  className="w-10 h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent mx-auto mt-3"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Fade at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-gray-900/90 to-transparent rounded-b-2xl pointer-events-none" />
      </div>
    </motion.div>
  );
}
