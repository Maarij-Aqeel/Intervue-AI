"use client";
import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { InterviewSession } from "@/types/allTypes";
import { containerVariants, itemVariants } from "@/lib/animations";
import { useUser } from "../context/user-context";
import {
  getScoreColor,
  getDifficultyColor,
  getStatusVariant,
} from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { getsessions } from "@/lib/db/Handleinterview";
import { useRouter } from "next/navigation";
import {
  TableCell,
  TableHeader,
  TableBody,
  Table,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Calendar,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { DashboardStats } from "@/components/DashboardStats";
import Achievements from "@/components/Acheivements";
import Loading from "@/components/Loading";
import Error from "@/components/Error";

export default function Dashboard() {
  const { user, profile } = useUser();
  const [interviewsessions, setAllSessions] = useState<InterviewSession[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [authcheck, SetAuthCheck] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      router.push("/login");
    } else {
      SetAuthCheck(false);
    }
  }, [user, router]);

  const handleInterviewClick = (interview: InterviewSession) => {
    if (interview.status.toLocaleLowerCase() != "pending") {
      router.push(`/results/?p=${interview.interviews.id}&q=${profile?.id}`);
    } else {
      router.push(`/interviews/${interview.interviews.id}`);
    }
  };

  const fetchSessions = useCallback((id: string) => getsessions(id), []);

  // SWR to prevent multiple calls to DB
  const {
    data: allsessions,
    error,
    isLoading,
  } = useSWR(profile?.id ?? null, fetchSessions, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  useEffect(() => {
    if (allsessions) {
      const parsed = allsessions.map((session: any) => {
        let questions = session.questions;
        if (typeof questions === "string") {
          try {
            questions = JSON.parse(questions);
          } catch {
            questions = [];
          }
        }
        return { ...session, questions: questions ?? [] };
      });

      // Sort latest first — by session start, fall back to interview creation
      const sorted = parsed.sort((a: any, b: any) => {
        const ta = new Date(
          a.started_at ?? a.interviews?.created_at ?? 0
        ).getTime();
        const tb = new Date(
          b.started_at ?? b.interviews?.created_at ?? 0
        ).getTime();
        return tb - ta;
      });

      setAllSessions(sorted);
    }
  }, [allsessions]);

  if (error) {
    return <Error msg="Unable to get User data." />;
  }
  if (isLoading || authcheck) {
    return <Loading msg1="Loading your Dashboard..." />;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-hero-gradient">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 space-y-8"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants}>
            <Card className="bg-surface/40 backdrop-blur-md text-white border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-3xl">
              <CardHeader className="p-8 border-b border-border bg-surface/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div className="space-y-3">
                    <CardTitle className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent leading-tight flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                      Welcome back,
                      <h1 className="bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
                        {profile?.name || "User"}
                      </h1>
                    </CardTitle>
                    <CardDescription className="text-muted text-lg flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      {new Date().toLocaleDateString("en-PK", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={itemVariants}>
            <DashboardStats interviewsessions={interviewsessions} />
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Recent Interviews Table */}
            <motion.div variants={itemVariants} className="xl:col-span-2">
              <Card className="bg-surface/70 backdrop-blur-md text-white border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-3xl">
                <CardHeader className="p-6 border-b border-gray-700/50">
                  <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                    Recent Interviews
                  </CardTitle>
                  <CardDescription className="text-muted">
                    Track your interview performance and progress
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border hover:bg-surface">
                          <TableHead className="text-white/80 font-semibold p-4">
                            Interview
                          </TableHead>
                          <TableHead className="text-white/80 font-semibold p-4">
                            Score
                          </TableHead>
                          <TableHead className="text-white/80 font-semibold p-4">
                            Difficulty
                          </TableHead>
                          <TableHead className="text-white/80 font-semibold p-4">
                            Duration
                          </TableHead>
                          <TableHead className="text-white/80 font-semibold p-4">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {(isExpanded
                            ? interviewsessions
                            : interviewsessions.slice(0, 7)
                          ).map((interview, index) => (
                            <motion.tr
                              key={interview.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={() => handleInterviewClick(interview)}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-border hover:bg-surface transition-all duration-200 group cursor-pointer"
                              whileHover={{ x: 5 }}
                            >
                              <TableCell className="font-medium text-white group-hover:text-primary transition-colors p-4">
                                <div className="space-y-1">
                                  <p className="font-semibold">
                                    {interview.interviews.title}
                                  </p>
                                  <p className="text-xs text-muted">
                                    {new Date(
                                      interview.interviews.created_at
                                    ).toLocaleDateString("en-PK", {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="p-4">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`text-2xl font-bold ${getScoreColor(
                                      interview.scores
                                    )}`}
                                  >
                                    {interview.scores != null
                                      ? `${interview.scores}%`
                                      : "N/A"}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="p-4">
                                <Badge
                                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all duration-200 hover:scale-105 ${getDifficultyColor(
                                    interview.interviews.difficulty
                                  )}`}
                                >
                                  {interview.interviews.difficulty}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-300 p-4 font-medium">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-primary" />
                                  {interview.interviews.duration} min
                                </div>
                              </TableCell>
                              <TableCell className="p-4">
                                <Badge
                                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all duration-200 hover:scale-105 ${getStatusVariant(
                                    interview.status
                                  )}`}
                                >
                                  {interview.status}
                                </Badge>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>

                  {interviewsessions.length > 7 && (
                    <div className="flex justify-center p-6 border-t border-border">
                      <Button
                        onClick={() => setIsExpanded(!isExpanded)}
                        variant="ghost"
                        className="text-primary rounded-xl  hover:text-primary/90 hover:bg-primary/10 transition-all duration-200 flex items-center gap-2"
                      >
                        {isExpanded ? (
                          <>
                            Show Less <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Show More <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Achievements Section */}
            <motion.div variants={itemVariants} className="xl:col-span-1">
              <Card className="bg-surface/70 backdrop-blur-md text-white border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-3xl h-fit">
                <CardHeader className="p-6 border-b border-border/50">
                  <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Award className="w-6 h-6 text-primary" />
                    </div>
                    Achievements
                  </CardTitle>
                  <CardDescription className="text-muted">
                    Your accomplishments and milestones
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Achievements interviewsessions={interviewsessions} />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quick Stats Summary */}
          <motion.div variants={itemVariants}>
            <Card className="bg-surface/60 backdrop-blur-md text-white border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-3xl">
              <CardHeader className="p-6 border-b border-border">
                <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  Performance Overview
                </CardTitle>
                <CardDescription className="text-muted">
                  Your interview journey at a glance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      {interviewsessions.length}
                    </div>
                    <div className="text-sm text-muted">Total Interviews</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-emerald-400">
                      {
                        interviewsessions.filter(
                          (s) => s.status.toLowerCase() === "completed"
                        ).length
                      }
                    </div>
                    <div className="text-sm text-muted">Completed</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-yellow-400">
                      {interviewsessions.length > 0
                        ? Math.round(
                            interviewsessions.reduce(
                              (acc, curr) => acc + curr.scores,
                              0
                            ) / interviewsessions.length
                          )
                        : 0}
                      %
                    </div>
                    <div className="text-sm text-muted">Average Score</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-blue-400">
                      {interviewsessions.filter((s) => s.scores > 80).length}
                    </div>
                    <div className="text-sm text-muted">High Scores</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
