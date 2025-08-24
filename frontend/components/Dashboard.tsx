"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { getUserStats, getQuestionHistory } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { AnalyticsCard } from "./AnalyticsCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";


   //Types from backend

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

interface DashboardProps {
  onNavigateToGenerator: () => void;
}


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
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null);

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
      
      // Date filtering
      let byDate = true;
      if (selectedDateRange) {
        const itemDate = new Date(h.created_at);
        const now = new Date();
        
        switch (selectedDateRange) {
          case 'today':
            byDate = itemDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            byDate = itemDate >= weekAgo;
            break;
          case 'fortnight':
            const fortnightAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
            byDate = itemDate >= fortnightAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            byDate = itemDate >= monthAgo;
            break;
          default:
            byDate = true;
        }
      }
      
      return bySubject && byMode && byDate;
    });
  }, [history, selectedSubject, selectedMode, selectedDateRange]);

  // Achievement badges calculation (feedback-free)
  const achievementBadges = useMemo(() => {
    const badges = [];
    const totalGenerations = stats?.total_generations ?? 0;
    const currentStreak = profile?.study_streak ?? 0;
    const subjectBreakdown = stats?.subject_breakdown || {};
    const subjectCount = Object.keys(subjectBreakdown).length;
    
    // Generation milestones
    if (totalGenerations >= 1) {
      badges.push({ icon: '🎯', title: 'First Question Generated', description: 'Generated your first question', category: 'generation' });
    }
    if (totalGenerations >= 10) {
      badges.push({ icon: '📚', title: 'Question Explorer', description: '10+ questions generated', category: 'generation' });
    }
    if (totalGenerations >= 50) {
      badges.push({ icon: '🚀', title: 'Question Master', description: '50+ questions generated', category: 'generation' });
    }
    if (totalGenerations >= 100) {
      badges.push({ icon: '🌟', title: 'Century Club', description: '100+ questions generated', category: 'generation' });
    }
    
    // Consistency streaks
    if (currentStreak >= 3) {
      badges.push({ icon: '📈', title: 'Getting Consistent', description: '3+ days streak', category: 'streak' });
    }
    if (currentStreak >= 7) {
      badges.push({ icon: '🔥', title: 'Week Warrior', description: '7+ days streak', category: 'streak' });
    }
    if (currentStreak >= 30) {
      badges.push({ icon: '👑', title: 'Consistency Champion', description: '30+ days streak', category: 'streak' });
    }
    
    // Subject diversity - All-Rounder for all 4 GS Papers
    const hasGS1 = subjectBreakdown['GS1'] > 0;
    const hasGS2 = subjectBreakdown['GS2'] > 0;
    const hasGS3 = subjectBreakdown['GS3'] > 0;
    const hasGS4 = subjectBreakdown['GS4'] > 0;
    
    if (hasGS1 && hasGS2 && hasGS3 && hasGS4) {
      badges.push({ icon: '📖', title: 'All-Rounder', description: 'All 4 GS Papers covered', category: 'diversity' });
    }
    
    return badges;
  }, [stats, profile]);

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
      {/* Header - Made responsive */}
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl sm:text-3xl font-bold">📊 Your Activity Dashboard</CardTitle>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            This dashboard summarizes your question generation activity, study streaks, and progress.
          </p>
        </CardHeader>
      </Card>

      {/* Daily Limit - Made responsive */}
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle>Daily Task Limit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-2">
            <div className="text-xs sm:text-sm text-gray-600">Resets daily at midnight (UTC)</div>
            <div className="text-xs sm:text-sm font-medium">{usedToday}/{DAILY_LIMIT} used</div>
          </div>
          <Progress value={percentToday} className="h-3 mb-3" />
          <div className="flex flex-wrap gap-1 mb-1">
            {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
              <div
                key={i}
                className={`h-2 sm:h-3 w-8 sm:w-10 rounded ${i < usedToday ? "bg-violet-500" : "bg-gray-200"}`}
              />
            ))}
          </div>
          <div className={`text-xs ${remainingToday <= 0 ? "text-red-600" : "text-gray-600"}`}>
            {remainingToday <= 0 ? "Daily limit reached" : `${remainingToday} remaining today`}
          </div>
        </CardContent>
      </Card>

      {/* KPIs - Made responsive */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Generation Card */}
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Total Generations</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">{stats?.total_generations ?? 0}</div>
              <div className="text-xs sm:text-sm text-gray-600">Questions Generated</div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500 text-center">
                {stats?.total_generations >= 100 ? '🏆 Century achiever!' :
                 stats?.total_generations >= 50 ? '🥇 Gold level!' :
                 stats?.total_generations >= 25 ? '🥈 Silver level!' :
                 stats?.total_generations >= 10 ? '🥉 Bronze level!' :
                 stats?.total_generations >= 1 ? '⭐ Getting started!' :
                 '🌟 Ready to begin!'}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Achievement Badges */}
        <Card className="md:col-span-2 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              🏆 Achievement Badges
              <span className="text-xs sm:text-sm font-normal text-gray-500">({achievementBadges.length} earned)</span>
            </CardTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Unlock badges by generating questions, maintaining streaks, and exploring subjects</p>
          </CardHeader>
          <CardContent className="pt-0">
            {achievementBadges.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <div className="text-3xl sm:text-4xl mb-3">🌟</div>
                <div className="text-base sm:text-lg font-medium mb-2">Ready to Start Your Journey?</div>
                <div className="text-xs sm:text-sm">Generate your first question to unlock achievement badges!</div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Badge Categories */}
                {['generation', 'streak', 'diversity'].map(category => {
                  const categoryBadges = achievementBadges.filter(badge => badge.category === category);
                  if (categoryBadges.length === 0) return null;
                  
                  const categoryInfo = {
                    generation: { title: 'Generation Milestones', color: 'from-blue-50 to-blue-100 border-blue-200' },
                    streak: { title: 'Consistency Streaks', color: 'from-orange-50 to-orange-100 border-orange-200' },
                    diversity: { title: 'Subject Mastery', color: 'from-green-50 to-green-100 border-green-200' }
                  };
                  
                  return (
                    <div key={category} className="space-y-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                        {categoryInfo[category]?.title}
                        <span className="text-xs text-gray-500">({categoryBadges.length})</span>
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {categoryBadges.map((badge, index) => (
                          <div
                            key={`${category}-${index}`}
                            className={`bg-gradient-to-br ${categoryInfo[category]?.color} rounded-lg p-2 sm:p-3 text-center hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105 group border`}
                            title={badge.description}
                          >
                            <div className="text-xl sm:text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">{badge.icon}</div>
                            <div className="text-xs font-semibold text-gray-800 truncate" title={badge.title}>{badge.title}</div>
                            <div className="text-xs text-gray-600 mt-1 leading-tight" title={badge.description}>
                              {badge.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {/* Progress indicators for next achievements */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                    🎯 Next Achievements
                  </h4>
                  <div className="space-y-2 text-xs text-gray-600">
                    {(() => {
                      const nextAchievements = [];
                      const totalGenerations = stats?.total_generations ?? 0;
                      const currentStreak = profile?.study_streak ?? 0;
                      const subjectBreakdown = stats?.subject_breakdown || {};
                      
                      // Next generation milestone
                      if (totalGenerations === 0) {
                        nextAchievements.push(`Generate your first question to unlock 'First Question Generated'`);
                      } else if (totalGenerations < 10) {
                        const remaining = 10 - totalGenerations;
                        nextAchievements.push(`Generate ${remaining} more questions for 'Question Explorer'`);
                      } else if (totalGenerations < 50) {
                        const remaining = 50 - totalGenerations;
                        nextAchievements.push(`Generate ${remaining} more questions for 'Question Master'`);
                      } else if (totalGenerations < 100) {
                        const remaining = 100 - totalGenerations;
                        nextAchievements.push(`Generate ${remaining} more questions for 'Century Club'`);
                      }
                      
                      // Next streak milestone
                      if (currentStreak < 3) {
                        const remaining = 3 - currentStreak;
                        nextAchievements.push(`Maintain streak for ${remaining} more days for 'Getting Consistent'`);
                      } else if (currentStreak < 7) {
                        const remaining = 7 - currentStreak;
                        nextAchievements.push(`Maintain streak for ${remaining} more days for 'Week Warrior'`);
                      } else if (currentStreak < 30) {
                        const remaining = 30 - currentStreak;
                        nextAchievements.push(`Maintain streak for ${remaining} more days for 'Consistency Champion'`);
                      }
                      
                      // All-Rounder achievement
                      const hasGS1 = subjectBreakdown['GS1'] > 0;
                      const hasGS2 = subjectBreakdown['GS2'] > 0;
                      const hasGS3 = subjectBreakdown['GS3'] > 0;
                      const hasGS4 = subjectBreakdown['GS4'] > 0;
                      const missingSubjects = [];
                      
                      if (!hasGS1) missingSubjects.push('GS1');
                      if (!hasGS2) missingSubjects.push('GS2');
                      if (!hasGS3) missingSubjects.push('GS3');
                      if (!hasGS4) missingSubjects.push('GS4');
                      
                      if (missingSubjects.length > 0) {
                        nextAchievements.push(`Try ${missingSubjects.join(', ')} for 'All-Rounder' badge`);
                      }
                      
                      return nextAchievements.slice(0, 3).map((achievement, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          <span>{achievement}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics */}
      <AnalyticsCard stats={stats} />

      {/* Streak Calendar - Made responsive */}
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle>🔥 Study Streak Calendar</CardTitle>
          <p className="text-xs sm:text-sm text-gray-600">Your daily activity over the past month</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-orange-600">{profile?.study_streak ?? 0}</div>
            <div className="text-xs sm:text-sm text-gray-600">Current Streak (days)</div>
            <div className="text-xs text-gray-500 mt-1">
              {profile?.study_streak >= 30 ? '🏆 Consistency Master!' : 
               profile?.study_streak >= 14 ? '🔥 On Fire!' : 
               profile?.study_streak >= 7 ? '💪 Building Momentum!' : 
               profile?.study_streak >= 3 ? '📈 Getting Started!' : 
               '🌟 Begin Your Journey!'}
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3 sm:mb-4">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={index} className="text-center text-xs font-medium text-gray-500 p-1">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {[...Array(35)].map((_, i) => {
              const dayIndex = i - 28; // Show last 4 weeks + current week
              const isToday = dayIndex === 0;
              const isPastActive = dayIndex < 0 && dayIndex >= -(profile?.study_streak ?? 0);
              const isFutureDay = dayIndex > 0;
              
              return (
                <div
                  key={i}
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
                    isToday
                      ? 'bg-blue-500 text-white ring-1 sm:ring-2 ring-blue-200 shadow-md'
                      : isPastActive
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : isFutureDay
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                  }`}
                  title={isToday ? 'Today' : isPastActive ? 'Active day' : isFutureDay ? 'Future' : 'Inactive'}
                >
                  {isToday ? '📍' : 
                   isPastActive ? '✓' : 
                   isFutureDay ? '○' : '·'}
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4 sm:mt-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-md sm:rounded-lg"></div>
              <span>Active day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-md sm:rounded-lg"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 rounded-md sm:rounded-lg"></div>
              <span>Inactive</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History - Made responsive */}
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Recent History</CardTitle>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Select value={selectedSubject || "all"} onValueChange={(value) => setSelectedSubject(value === "all" ? null : value)}>
              <SelectTrigger className="w-full sm:w-[120px] md:w-[180px]">
                <SelectValue placeholder="Filter by Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subj) => (
                  <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMode || "all"} onValueChange={(value) => setSelectedMode(value === "all" ? null : (value as "topic" | "paper"))}>
              <SelectTrigger className="w-full sm:w-[120px] md:w-[180px]">
                <SelectValue placeholder="Filter by Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="topic">Topic-wise</SelectItem>
                <SelectItem value="paper">Whole Paper</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedDateRange || "all"} onValueChange={(value) => setSelectedDateRange(value === "all" ? null : value)}>
              <SelectTrigger className="w-full sm:w-[120px] md:w-[180px]">
                <SelectValue placeholder="Filter by Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="fortnight">Last 15 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => { setSelectedSubject(null); setSelectedMode(null); setSelectedDateRange(null); }}>
              Clear
            </Button>
          </div>
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
                      : item.questions.slice(0, 150) + (item.questions.length > 150 ? "..." : "")}
                    {item.questions.length > 150 && (
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

      {/* Footer - Made responsive */}
      <div className="max-w-6xl mx-auto flex items-center justify-end">
        <Button onClick={onNavigateToGenerator} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white w-full sm:w-auto">
           Back to Generator
        </Button>
      </div>
    </div>
  );
};
