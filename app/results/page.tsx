"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Loading from "@/components/Loading";
import FeedbackLoading from "@/components/FeedbackLoading";
import useSWR from "swr";
import {
  getStatusVariant,
  getDifficultyColor,
  getScoreColor,
  scoreMessage,
} from "@/lib/utils";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import CircularProgress from "@/components/Radix_score";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { getsession } from "@/lib/db/Handleinterview";
import { isUUID } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MessageSquare,
  HelpCircle,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Error from "@/components/Error";

export default function SingleInterview() {
  const searchParams = useSearchParams();
  const interview_id = searchParams.get("p") || "";
  const student_id = searchParams.get("q") || "";
  const [session_data, setSessionData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const router = useRouter();

  // Validate UUID
  useEffect(() => {
    if (!interview_id || !student_id) return;
    if (!isUUID(interview_id) || !isUUID(student_id)) router.push("/");
  }, [student_id, interview_id]);

  const { data, error, isLoading } = useSWR(
    interview_id && student_id ? [`session`, interview_id, student_id] : null,
    () => getsession(interview_id, student_id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      // Poll until evaluation completes or the interview is marked pending.
      refreshInterval: (latest) => {
        const row = Array.isArray(latest) ? latest[0] : null;
        const s = row?.status;
        return s === "Completed" || s === "pending" ? 0 : 2000;
      },
    }
  );

  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0 && data[0]) {
      setSessionData(data[0]);
      try {
        const raw = data[0].questions;
        setQuestions(Array.isArray(raw) ? raw : (JSON.parse(raw) ?? []));
      } catch {
        setQuestions([]);
      }
    }
  }, [data]);

  if (error) {
    return <Error msg="Unable to get interview results" />;
  }

  if (isLoading || !data || !session_data) {
    return <Loading msg1="Getting your interview results..." />;
  }

  // Interview ended before any answer — nothing to evaluate.
  if (session_data.status?.toLowerCase() === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center px-4 bg-hero-gradient text-white">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-bold">Interview not completed</h2>
          <p className="text-gray-400">
            This interview ended before any answers were recorded, so there's
            no feedback to show. You can retake it whenever you're ready.
          </p>
        </div>
        <Button
          asChild
          className="bg-primary text-gray-900 hover:bg-primary/90 px-6 py-5 rounded-full font-semibold"
        >
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (session_data.status !== "Completed") {
    return <FeedbackLoading />;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-hero-gradient">
      <div className="max-w-7xl mx-auto">
        <Card className="bg-surface/30 backdrop-blur-md text-white border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-3xl">
          {session_data && (
            <>
              {/* Header Section */}
              <CardHeader className="p-8 border-b border-border bg-surface/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div className="space-y-2">
                    <CardTitle className="text-4xl font-bold bg-gradient-to-r from-white to-gray-600 bg-clip-text text-transparent leading-tight">
                      {session_data.interviews.title}
                    </CardTitle>
                    <CardDescription className="text-muted text-lg">
                      Interview Results & Analysis
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Badge
                      className={`${getDifficultyColor(
                        session_data.interviews.difficulty
                      )} text-lg font-medium px-4 py-2 rounded-full transition-all duration-200 hover:scale-105`}
                    >
                      {session_data.interviews.difficulty}
                    </Badge>
                    <Badge
                      className={`${getStatusVariant(
                        session_data.status
                      )} text-lg font-medium px-4 py-2 rounded-full transition-all duration-200 hover:scale-105`}
                    >
                      {session_data.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8">
                <div className="grid gap-8 lg:grid-cols-3">
                  {/* Interview Details */}
                  <Card className="bg-gray-800/40 backdrop-blur-sm text-white border-gray-600/30 lg:col-span-1 transition-all duration-300 hover:bg-gray-800/50 hover:border-gray-600/50">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl font-semibold flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        Interview Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <span className="text-lg text-gray-400 font-medium">
                            Started
                          </span>
                          <span className="text-white font-medium">
                            {new Date(
                              session_data.started_at + "Z"
                            ).toLocaleString("en-PK", {
                              timeZone: "Asia/Karachi",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="text-lg text-gray-400 font-medium">
                            Completed
                          </span>
                          <span className="text-white font-medium">
                            {new Date(
                              session_data.completed_at
                            ).toLocaleDateString("en-PK", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 pt-2 border-t border-gray-700/50">
                          <div className="p-2 rounded-lg bg-primary/20">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg text-gray-400">
                              Duration
                            </span>
                            <span className="text-white font-medium">
                              {session_data.interviews.duration} minutes
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Score Section */}
                  <Card className="bg-gray-800/40 backdrop-blur-sm text-white border-gray-600/30 lg:col-span-2 transition-all duration-300 hover:bg-gray-800/50 hover:border-gray-600/50">
                    <CardHeader className="pb-6">
                      <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                        Overall Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-6">
                      <div className="relative">
                        <CircularProgress value={session_data.scores} />
                      </div>
                      <div className="text-center space-y-2">
                        <CardDescription
                          className={`text-xl font-semibold ${getScoreColor(
                            session_data.scores
                          )}`}
                        >
                          {scoreMessage(session_data.scores)}
                        </CardDescription>
                        <p className="text-gray-400 text-sm">
                          Your performance has been evaluated across multiple
                          criteria
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Feedback Section */}
                  <Card className="lg:col-span-3 bg-gray-800/40 backdrop-blur-sm text-white border-gray-600/30 transition-all duration-300 hover:bg-gray-800/50 hover:border-gray-600/50">
                    <CardHeader className="pb-6">
                      <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <MessageSquare className="h-6 w-6 text-primary" />
                        </div>
                        Detailed Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Strengths */}
                        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 backdrop-blur-sm transition-all duration-300 hover:from-emerald-500/15 hover:to-emerald-600/10 hover:border-emerald-500/30">
                          <CardHeader className="space-y-4">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                                <img
                                  src="https://img.icons8.com/?size=100&id=uEYO02ekLzVD&format=png&color=10b981"
                                  alt="Strengths"
                                  className="w-8 h-8"
                                />
                              </div>
                              <CardTitle className="text-2xl font-bold text-emerald-300">
                                Strengths
                              </CardTitle>
                            </div>
                            <CardDescription className="text-gray-200 text-base leading-relaxed">
                              <ReactMarkdown
                                components={{
                                  ul: ({ node, ...props }) => (
                                    <ul
                                      className="list-disc pl-5 space-y-1 marker:text-emerald-500"
                                      {...props}
                                    />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="text-sm" {...props} />
                                  ),
                                }}
                              >
                                {session_data?.feedback?.strengths}
                              </ReactMarkdown>
                            </CardDescription>
                          </CardHeader>
                        </Card>

                        {/* Areas of Improvement */}
                        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 backdrop-blur-sm transition-all duration-300 hover:from-amber-500/15 hover:to-amber-600/10 hover:border-amber-500/30">
                          <CardHeader className="space-y-4">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30">
                                <img
                                  src="https://img.icons8.com/?size=100&id=117363&format=png&color=f59e0b"
                                  alt="Improvements"
                                  className="w-8 h-8"
                                />
                              </div>
                              <CardTitle className="text-2xl font-bold text-amber-300">
                                Areas for Improvement
                              </CardTitle>
                            </div>
                            <CardDescription className="text-gray-200 text-base leading-relaxed">
                              <ReactMarkdown
                                components={{
                                  ul: ({ node, ...props }) => (
                                    <ul
                                      className="list-disc pl-5 space-y-1 marker:text-yellow-500"
                                      {...props}
                                    />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="text-sm" {...props} />
                                  ),
                                }}
                              >
                                {session_data?.feedback?.needed_improvements}
                              </ReactMarkdown>
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Questions & Answers Section */}
                  <Card className="lg:col-span-3 bg-gray-800/40 backdrop-blur-sm text-white border-gray-600/30 transition-all duration-300 hover:bg-gray-800/50 hover:border-gray-600/50">
                    <CardHeader className="pb-6">
                      <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <HelpCircle className="h-6 w-6 text-primary" />
                        </div>
                        Questions & Answers
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Review your responses to interview questions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(!questions || questions.length === 0) ? (
                        <p className="text-gray-400 text-center py-8">
                          Results are still being processed — please wait a moment.
                        </p>
                      ) : (
                      <Accordion
                        type="single"
                        collapsible
                        className="w-full space-y-4"
                      >
                        {questions.map((qa, index) => (
                          <AccordionItem
                            key={index}
                            value={`item-${index}`}
                            className="border border-gray-700/50 rounded-lg bg-gray-800/30 backdrop-blur-sm transition-all duration-200 hover:bg-gray-800/50 hover:border-gray-600/50"
                          >
                            <AccordionTrigger className="text-left text-white/90 hover:no-underline px-6 py-4 font-medium">
                              <span className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold">
                                  {index + 1}
                                </span>
                                {qa.question}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-200 px-6 pb-6 pt-2 leading-relaxed border-t border-gray-700/30">
                              <div className="bg-gray-900/30 rounded-lg p-4 border-l-4 border-primary/30">
                                {qa.answer}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Back to Dashboard Button */}
                <div className="flex justify-center mt-12">
                  <Button
                    asChild
                    className="bg-primary text-gray-900 hover:bg-primary/90 transition-all duration-200 transform hover:scale-105 px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl"
                  >
                    <Link href="/dashboard" className="flex items-center gap-3">
                      <ArrowLeft className="h-5 w-5" />
                      Back to Dashboard
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
