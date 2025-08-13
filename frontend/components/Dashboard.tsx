"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { getUserStats, getQuestionHistory } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

/* =====================
   Types from backend
===================== */

interface UserStats {
  total_generations: number;
  total_questions: number;
  feedback_count: number;
  individual_feedback_count: number;
  generation_feedback_count: number;
  overall_average_rating: number;
  individual_average_rating: number;
  generation_average_rating: number;
  subject_breakdown: Record<string, number>;
  mode_breakdown: {
    topic: number;
    paper: number;
  };
  current_affairs_usage: number;
}

interface HistoryItem {
  id: string;
  subject: string;
  topic?: string | null;
  mode: "topic" | "paper";
  questions: string;
  use_current_affairs: boolean;
  question_count: number;
  created_at: string;
}

/* =====================
   Props
===================== */

interface DashboardProps {
  onNavigateToGenerator: () => void;
}

/* =====================
   Component
===================== */

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToGenerator }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [limitProfile, setLimitProfile] = useState<{ generation_count_today: number; last_generation_date: string | null } | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<"topic" | "paper" | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* Fetch stats & history */
  useEffect(() => {
  let cancelled = false;
  if (!user?.id) return; // <-- ensures we wait for login

  (async () => {
    try {
      setLoading(true);
      const [statsResp, historyResp]: [UserStats, { history: HistoryItem[] }] = await Promise.all([
        getUserStats().catch(() => { throw new Error("Failed to load stats"); }),
        getQuestionHistory(100).catch(() => { throw new Error("Failed to load history"); }),
      ]);
      if (!cancelled) {
        setStats(statsResp);
        setHistory(historyResp?.history || []);
      }
    } catch (err: any) {
      toast({
        title: "Error loading dashboard",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();
  return () => { cancelled = true; };
}, [user?.id, toast]);

  /* Fetch daily limit from Supabase */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("user_profiles")
          .select("generation_count_today,last_generation_date")
          .eq("id", user.id)
          .maybeSingle();
        if (!cancelled) setLimitProfile(data as any);
      } catch {
        // no-op; fallback to useAuth profile if needed
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, profile?.generation_count_today, profile?.last_generation_date]);

  const subjects = useMemo(() => Object.keys(stats?.subject_breakdown || {}), [stats]);

  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      const bySubject = selectedSubject ? h.subject === selectedSubject : true;
      const byMode = selectedMode ? h.mode === selectedMode : true;
      return bySubject && byMode;
    });
  }, [history, selectedSubject, selectedMode]);

  /* Daily limit logic */
  const DAILY_LIMIT = 5;
  const todayIso = new Date().toISOString().slice(0, 10);
  const lastDateIso = (((limitProfile?.last_generation_date as any) || (profile?.last_generation_date as any) || "") as string).slice(0, 10);
  const resolvedCount = (limitProfile?.generation_count_today ?? (profile as any)?.generation_count_today ?? 0) as number;
  const usedToday = lastDateIso === todayIso ? resolvedCount : 0;
  const remainingToday = Math.max(0, DAILY_LIMIT - usedToday);
  const percentToday = Math.min(100, (usedToday / DAILY_LIMIT) * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-6">
      {/* Header */}
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">📊 Your Activity Dashboard</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            This dashboard summarizes your generated data, profile info, and feedback.
          </p>
        </CardHeader>
      </Card>

      {/* Daily Limit */}
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle>Daily Task Limit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Resets daily at midnight (UTC)</div>
            <div className="text-sm font-medium">{usedToday}/{DAILY_LIMIT} used</div>
          </div>
          <Progress value={percentToday} className="h-3 mb-3" />
          <div className="flex gap-1 mb-1">
            {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
              <div
                key={i}
                className={`h-3 w-10 rounded ${i < usedToday ? "bg-violet-500" : "bg-gray-200"}`}
              />
            ))}
          </div>
          <div className={`text-xs ${remainingToday <= 0 ? "text-red-600" : "text-gray-600"}`}>
            {remainingToday <= 0 ? "Daily limit reached" : `${remainingToday} remaining today`}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="py-6 text-center">
            <div className="text-xs uppercase text-gray-500 mb-1">Total Generations</div>
            <div className="text-3xl font-bold text-blue-600">{stats?.total_generations ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <div className="text-xs uppercase text-gray-500 mb-1">Total Questions</div>
            <div className="text-3xl font-bold text-green-600">{stats?.total_questions ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <div className="text-xs uppercase text-gray-500 mb-1">Feedback Submitted</div>
            <div className="text-3xl font-bold text-purple-600">{stats?.feedback_count ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">
              Q: {stats?.individual_feedback_count ?? 0} • Gen: {stats?.generation_feedback_count ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <div className="text-xs uppercase text-gray-500 mb-1">Avg Ratings</div>
            <div className="text-lg font-semibold">Questions: {(stats?.individual_average_rating ?? 0).toFixed(1)}</div>
            <div className="text-xs text-gray-500">Generations: {(stats?.generation_average_rating ?? 0).toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <div className="text-xs uppercase text-gray-500 mb-1">Overall Feedback</div>
            <div className="text-lg font-semibold text-purple-600">
              Avg: {(stats?.overall_average_rating ?? 0).toFixed(1)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total: {stats?.feedback_count ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & History */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subjects */}
        <Card>
          <CardHeader>
            <CardTitle>Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 && <div className="text-sm text-gray-500">No subject data yet.</div>}
            <div className="space-y-4">
              {subjects.map((subj) => {
                const count = stats?.subject_breakdown?.[subj] || 0;
                const pct = (count / Math.max(1, stats?.total_generations || 1)) * 100;
                const selected = selectedSubject === subj;
                return (
                  <div key={subj} className={`p-2 rounded border ${selected ? "border-blue-500 bg-blue-50" : "border-transparent"}`}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="font-medium">{subj}</div>
                      <div>{count}</div>
                    </div>
                    <Progress value={pct} className="h-2 mb-2" />
                    <div className="flex gap-2">
                      <Button size="sm" variant={selected ? "default" : "outline"} onClick={() => setSelectedSubject(selected ? null : subj)}>
                        {selected ? "Clear Filter" : "Filter by Subject"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedSubject(null); setSelectedMode(null); }}>
                        Reset All
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Modes */}
        <Card>
          <CardHeader>
            <CardTitle>Modes & Current Affairs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {["topic", "paper"].map((mode) => (
                <div key={mode}>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="font-medium">{mode === "topic" ? "Topic-wise" : "Whole Paper"}</div>
                    <div>{stats?.mode_breakdown?.[mode] ?? 0}</div>
                  </div>
                  <Progress
                    value={((stats?.mode_breakdown?.[mode] || 0) / Math.max(1, stats?.total_generations || 1)) * 100}
                    className="h-2 mb-2"
                  />
                  <Button
                    size="sm"
                    variant={selectedMode === mode ? "default" : "outline"}
                    onClick={() => setSelectedMode(selectedMode === mode ? null : mode as "topic" | "paper")}
                  >
                    {selectedMode === mode ? "Clear Filter" : `Filter ${mode === "topic" ? "Topic-wise" : "Whole Paper"}`}
                  </Button>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm mb-1">
                  <div className="font-medium">Current Affairs Used</div>
                  <div>{stats?.current_affairs_usage ?? 0}</div>
                </div>
                <Progress
                  value={((stats?.current_affairs_usage || 0) / Math.max(1, stats?.total_generations || 1)) * 100}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent History</CardTitle>
          <Button size="sm" variant="outline" onClick={() => { setSelectedSubject(null); setSelectedMode(null); }}>
            Clear All Filters
          </Button>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-sm text-gray-500">No history found for the selected filters.</div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {filteredHistory.map((item) => (
                <div key={item.id} className="p-3 border rounded-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-semibold">{item.subject}</span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span className="uppercase text-xs tracking-wide px-2 py-0.5 rounded bg-gray-100 border">
                        {item.mode}
                      </span>
                      {item.use_current_affairs && (
                        <span className="ml-2 text-xs text-orange-700 italic">CA</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                  {item.topic && (
                    <div className="text-xs text-gray-600 mt-1">
                      <span className="font-medium">Topic:</span> {item.topic}
                    </div>
                  )}
                  <div className="text-sm mt-2 whitespace-pre-wrap">
                    {expandedId === item.id
                      ? item.questions
                      : item.questions.slice(0, 200) + (item.questions.length > 200 ? "..." : "")}
                    {item.questions.length > 200 && (
                      <button
                        className="ml-2 text-blue-600 text-xs"
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      >
                        {expandedId === item.id ? "Show Less" : "Show More"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="max-w-6xl mx-auto flex items-center justify-end">
        <Button onClick={onNavigateToGenerator} className="text-lg py-6 px-8">
          🚀 Back to Generator
        </Button>
      </div>
    </div>
  );
};
