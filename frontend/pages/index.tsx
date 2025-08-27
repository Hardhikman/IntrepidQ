"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// Components
import { QuestionGenerator } from "@/components/QuestionGenerator";
import { ChatWindow } from "@/components/Chatwindow";
import FloatingHeader from "@/components/FloatingHeader";

// UI
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Types
import { GeneratedQuestion } from "@/lib/supabase";

interface Subject {
  name: string;
  topics: string[];
}

export default function UPSCQuestionGenerator() {
  const {
    user,
    profile,
    loading: authLoading,
    signOut,
    signInWithGoogle,
    refreshProfile,
    applyLocalGenerationIncrement,
  } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // State
  const [subjects, setSubjects] = useState<Record<string, Subject>>({});
  const [selectedSubject, setSelectedSubject] = useState("GS1");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [useCurrentAffairs, setUseCurrentAffairs] = useState(false);
  const [mode, setMode] = useState<"topic" | "keyword" | "paper">("topic");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [generatingAllAnswers, setGeneratingAllAnswers] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState("llama3-70b");
  const [answerLoadingIndex, setAnswerLoadingIndex] = useState<number | null>(null);

  // NEW: Keyword query state for keyword mode
  const [keywordQuery, setKeywordQuery] = useState("");

  // Daily limit tracking
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [guestGenerationsUsed, setGuestGenerationsUsed] = useState(0);

  // Helper function to get remaining guest generations
  const getRemainingGuestGenerations = () => {
    return Math.max(2 - guestGenerationsUsed, 0);
  };

  // Check guest limit status from server
  const checkGuestLimitFromServer = async () => {
    if (user) return; // Only for guests
    
    try {
      const response = await fetch('/api/check_guest_limit', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGuestGenerationsUsed(data.generations_used || 0);
        setDailyLimitReached(data.limit_reached || false);
      }
    } catch (error) {
      // Silently handle errors - fallback to default state
      setGuestGenerationsUsed(0);
      setDailyLimitReached(false);
    }
  };

  // Load subjects
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Check daily limits
  useEffect(() => {
    checkDailyLimits();
  }, [user, loading, authLoading, profile]);

  const checkDailyLimits = () => {
    if (authLoading) return;
    
    if (user && profile) {
      // Authenticated user - check from profile
      const today = new Date().toISOString().slice(0, 10);
      const lastDate = profile?.last_generation_date;
      const count = lastDate === today ? (profile?.generation_count_today || 0) : 0;
      setDailyLimitReached(count >= 5);
    } else if (!user) {
      // Guest user - check from server
      checkGuestLimitFromServer();
    } else {
      setDailyLimitReached(false);
    }
  };

  useEffect(() => {
    const shouldPoll = loading || generatingAllAnswers || answerLoadingIndex !== null;
    if (!shouldPoll) return;
    const id = window.setInterval(() => {
      refreshProfile?.();
    }, 3000);
    return () => window.clearInterval(id);
  }, [loading, generatingAllAnswers, answerLoadingIndex, refreshProfile]);

  const fetchSubjects = async () => {
    setSubjectsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";
      const response = await fetch(`${baseUrl}/api/subjects`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (!data.subjects) throw new Error("No subjects returned");

      setSubjects(data.subjects);
      if (data.subjects?.GS1?.topics?.length > 0) {
        setSelectedTopic(data.subjects.GS1.topics[0]);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleSubjectChange = (sub: string) => {
    setSelectedSubject(sub);
    if (subjects[sub]?.topics?.length > 0) {
      setSelectedTopic(subjects[sub].topics[0]);
    } else {
      setSelectedTopic("");
    }
  };

  const handleGenerateQuestions = async () => {
    if (mode === "topic" && !selectedTopic) {
      toast({ title: "Warning", description: "Please select a topic", variant: "destructive" });
      return;
    }
    
    if (mode === "keyword" && !keywordQuery.trim()) {
      toast({ title: "Warning", description: "Please enter keywords", variant: "destructive" });
      return;
    }
    
    setQuestions([]);
    setAnswers({});
    setLoading(true);

    try {
      let endpoint, payload;
      
      if (mode === "paper") {
        endpoint = "/api/generate_whole_paper";
        payload = { subject: selectedSubject, use_ca: useCurrentAffairs, months: 6, model: selectedModel };
      } else if (mode === "keyword") {
        endpoint = "/api/generate_questions_from_keywords";
        payload = { 
          keywords: keywordQuery.split(',').map(k => k.trim()).filter(k => k.length > 0),
          num: numQuestions, 
          use_ca: useCurrentAffairs, 
          months: 6, 
          model: selectedModel,
          subject: selectedSubject
        };
      } else {
        endpoint = "/api/generate_questions";
        payload = { topic: selectedTopic, num: numQuestions, use_ca: useCurrentAffairs, months: 6, model: selectedModel };
      }

      const sessionResponse = await supabase.auth.getSession();
      const token = sessionResponse.data.session?.access_token;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          const errorData = await response.json();
          if (errorData.guest_limit_reached) {
            // Update guest state from server response
            setDailyLimitReached(true);
            setGuestGenerationsUsed(2); // Reached limit
            
            // Guest user hit limit - show special toast with sign-in option
            toast({
              title: "Question Generation Limit Reached",
              description: `You've reached your daily limit of ${errorData.guest_daily_limit} question generations. Sign in with Google to get ${errorData.user_daily_limit} question generations per day! You can still generate unlimited answers.`,
              variant: "destructive",
              action: (
                <Button 
                  size="sm" 
                  onClick={handleGoogleSignIn}
                  className="ml-2 bg-blue-600 hover:bg-blue-700"
                >
                  Sign In
                </Button>
              ),
            });
          } else {
            // Authenticated user hit limit
            setDailyLimitReached(true);
            toast({
              title: "Daily Limit Reached",
              description: errorData.error || "Daily generation limit reached",
              variant: "destructive",
            });
          }
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const qs: GeneratedQuestion[] = (data.questions || []).map((q: any) =>
        typeof q === "string"
          ? {
              id: Math.random().toString(),
              subject: selectedSubject,
              topic: selectedTopic,
              mode,
              question: q,
              thinking: "",
              use_current_affairs: useCurrentAffairs,
              question_count: 1,
              created_at: new Date().toISOString(),
            }
          : {
              id: Math.random().toString(),
              subject: selectedSubject,
              topic: selectedTopic,
              mode,
              question: q.question || q.questions,
              thinking: q.thinking || "",
              use_current_affairs: useCurrentAffairs,
              question_count: 1,
              created_at: new Date().toISOString(),
            }
      );
      setQuestions(qs);
      
      // Update guest state after successful generation
      if (!user) {
        setGuestGenerationsUsed(prev => {
          const newCount = prev + 1;
          if (newCount >= 2) {
            setDailyLimitReached(true);
          }
          return newCount;
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      applyLocalGenerationIncrement?.(1);
      refreshProfile?.();
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      toast({
        title: "Success",
        description: "Signing you in...",
        variant: "default",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Google sign-in failed",
        variant: "destructive",
      });
    }
  };

  const handleGenerateAllAnswers = async () => {
    if (questions.length === 0) return;
    setGeneratingAllAnswers(true);
    try {
      const sessionResponse = await supabase.auth.getSession();
      const token = sessionResponse.data.session?.access_token;

      const response = await fetch("/api/generate_answers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ questions: questions.map((q) => q.question) }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate answers");
      }

      const data = await response.json();
      const newAnswers: Record<number, any> = {};
      (data.answers || []).forEach((a: any, i: number) => (newAnswers[i] = a));
      setAnswers(newAnswers);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate answers", variant: "destructive" });
    } finally {
      setGeneratingAllAnswers(false);
      // Don't increment local counter for answer generation
      refreshProfile?.();
    }
  };

  const handleGenerateSingleAnswer = async (idx: number, text: string) => {
    setAnswerLoadingIndex(idx);
    try {
      const sessionResponse = await supabase.auth.getSession();
      const token = sessionResponse.data.session?.access_token;

      const response = await fetch("/api/generate_answers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ questions: [text] }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate answer");
      }

      const data = await response.json();
      const ans = data.answers?.[0];
      if (ans) {
        setAnswers((prev) => ({ ...prev, [idx]: ans }));
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Single answer failed", variant: "destructive" });
    } finally {
      setAnswerLoadingIndex(null);
      // Don't increment local counter for answer generation
      refreshProfile?.();
    }
  };

  // NEW: Handle keyword-based question generation
  const handleGenerateQuestionsFromKeywords = async () => {
    if (mode === "keyword" && !keywordQuery.trim()) {
      toast({ title: "Warning", description: "Please enter keywords", variant: "destructive" });
      return;
    }
    
    setQuestions([]);
    setAnswers({});
    setLoading(true);

    try {
      const endpoint = "/api/generate_questions_from_keywords";
      const payload = { 
        keywords: keywordQuery.split(',').map(k => k.trim()).filter(k => k.length > 0),
        num: numQuestions, 
        use_ca: useCurrentAffairs, 
        months: 6, 
        model: selectedModel,
        subject: selectedSubject  // Add subject to payload
      };

      const sessionResponse = await supabase.auth.getSession();
      const token = sessionResponse.data.session?.access_token;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          const errorData = await response.json();
          if (errorData.guest_limit_reached) {
            // Update guest state from server response
            setDailyLimitReached(true);
            setGuestGenerationsUsed(2); // Reached limit
            
            // Guest user hit limit - show special toast with sign-in option
            toast({
              title: "Question Generation Limit Reached",
              description: `You've reached your daily limit of ${errorData.guest_daily_limit} question generations. Sign in with Google to get ${errorData.user_daily_limit} question generations per day! You can still generate unlimited answers.`,
              variant: "destructive",
              action: (
                <Button 
                  size="sm" 
                  onClick={handleGoogleSignIn}
                  className="ml-2 bg-blue-600 hover:bg-blue-700"
                >
                  Sign In
                </Button>
              ),
            });
          } else {
            // Authenticated user hit limit
            setDailyLimitReached(true);
            toast({
              title: "Daily Limit Reached",
              description: errorData.error || "Daily generation limit reached",
              variant: "destructive",
            });
          }
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const qs: GeneratedQuestion[] = (data.questions || []).map((q: any) =>
        typeof q === "string"
          ? {
              id: Math.random().toString(),
              subject: selectedSubject,
              topic: keywordQuery, // Use keyword query as topic
              mode: "keyword",
              question: q,
              thinking: "",
              use_current_affairs: useCurrentAffairs,
              question_count: 1,
              created_at: new Date().toISOString(),
            }
          : {
              id: Math.random().toString(),
              subject: selectedSubject,
              topic: keywordQuery, // Use keyword query as topic
              mode: "keyword",
              question: q.question || q.questions,
              thinking: q.thinking || "",
              use_current_affairs: useCurrentAffairs,
              question_count: 1,
              created_at: new Date().toISOString(),
            }
      );
      setQuestions(qs);
      
      // Update guest state after successful generation
      if (!user) {
        setGuestGenerationsUsed(prev => {
          const newCount = prev + 1;
          if (newCount >= 2) {
            setDailyLimitReached(true);
          }
          return newCount;
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      applyLocalGenerationIncrement?.(1);
      refreshProfile?.();
    }
  };

  // Return the main interface for both authenticated and guest users
  return (
    <div className="min-h-screen bg-gradient-to-r from-orange-50 to-blue-50">
      {/* Floating Header */}
      <FloatingHeader
        user={user}
        authLoading={authLoading}
        signOut={signOut}
        signInWithGoogle={signInWithGoogle}
      />

      {/* Main Content with padding adjusted for taller floating header */}
      <div className="pt-16 p-4 space-y-6">
        {/* Mode selection card */}
      <Card className="max-w-3xl mx-auto shadow-md bg-gradient-to-r from-orange-50 to-blue-50 border border-gray-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="font-bold text-orange-800 text-center text-lg sm:text-xl">
               Select Question Generation Mode
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <button
              className={cn(
                "rounded-xl font-semibold transition-all shadow-sm w-full sm:w-auto px-5 py-2.5 text-base",
                mode === "topic"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                  : "bg-white border border-orange-400 text-orange-700 hover:bg-orange-50"
              )}
              onClick={() => setMode("topic")}
            >
              📚 Topic-wise
            </button>
            
            <button
              className={cn(
                "rounded-xl font-semibold transition-all shadow-sm w-full sm:w-auto px-5 py-2.5 text-base",
                mode === "keyword"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                  : "bg-white border border-purple-400 text-purple-700 hover:bg-purple-50"
              )}
              onClick={() => setMode("keyword")}
            >
              🔍 Keyword-based
            </button>
            
            <button
              className={cn(
                "rounded-xl font-semibold transition-all shadow-sm w-full sm:w-auto px-5 py-2.5 text-base",
                mode === "paper"
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                  : "bg-white border border-blue-400 text-blue-700 hover:bg-blue-50"
              )}
              onClick={() => setMode("paper")}
            >
              📄 Whole Paper
            </button>
          </div>
          
          {mode === "paper" && (
            <div className="text-blue-800 bg-blue-50 border border-blue-200 rounded-md text-center w-full text-xs md:text-sm px-3 py-2 mt-3">
              10 questions · 10 marks each · 1 hour · 100 marks
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guest user information - Made responsive */}
      {!user && (
        <Card className="max-w-5xl mx-auto shadow-sm border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="text-center">
              <div className="text-blue-800 font-medium mb-2 text-sm sm:text-base">
                {dailyLimitReached 
                  ? '🚫 Daily limit reached! You have 0 question generations remaining today.' 
                  : `🎆 Welcome, Guest! You have ${getRemainingGuestGenerations()} question generation${getRemainingGuestGenerations() === 1 ? '' : 's'} remaining today.`
                }
              </div>
              <div className="text-blue-600 text-xs sm:text-sm">
                {dailyLimitReached 
                  ? '🚀 Sign in with Google to get 5 question generations per day, save your history, and access premium features!' 
                  : 'Generate unlimited answers! Sign in with Google to get 5 question generations per day, save your history, and access premium features!'
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Authenticated user daily limit notification - Made responsive */}
      {user && dailyLimitReached && (
        <Card className="max-w-5xl mx-auto shadow-sm border-orange-200 bg-orange-50">
          <CardContent className="py-4">
            <div className="text-center">
              <div className="text-orange-800 font-medium mb-2 text-sm sm:text-base">
                🚫 Daily Limit Reached! You've used all 5 question generations today.
              </div>
              <div className="text-orange-600 text-xs sm:text-sm">
                Your daily limit will reset tomorrow. You can still generate unlimited answers!
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CONFIG + RESULTS - Made responsive */}
      <section className="max-w-5xl mx-auto space-y-6">
        <QuestionGenerator
          subjects={subjects}
          selectedSubject={selectedSubject}
          selectedTopic={selectedTopic}
          setSelectedTopic={setSelectedTopic}
          handleSubjectChange={handleSubjectChange}
          subjectsLoading={subjectsLoading}
          numQuestions={numQuestions}
          setNumQuestions={setNumQuestions}
          useCurrentAffairs={useCurrentAffairs}
          setUseCurrentAffairs={setUseCurrentAffairs}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          isGenerateDisabled={loading || dailyLimitReached}
          loading={loading}
          onGenerate={handleGenerateQuestions}
          mode={mode}
          dailyLimitReached={dailyLimitReached}
          // NEW: Pass keyword-related props
          keywordQuery={keywordQuery}
          setKeywordQuery={setKeywordQuery}
          onGenerateFromKeywords={handleGenerateQuestionsFromKeywords}
        />

        <div id="results-section">
          {questions.length > 0 && Object.keys(answers).length === 0 && (
            <div className="mb-4">
              <Button
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                onClick={handleGenerateAllAnswers}
                disabled={generatingAllAnswers}
              >
                {generatingAllAnswers ? "Generating Answers..." : "Generate Answers for All"}
              </Button>
            </div>
          )}

          <ChatWindow
            questions={questions}
            answers={answers}
            loading={loading}
            onGenerateAnswer={handleGenerateSingleAnswer}
            answerLoadingIndex={answerLoadingIndex}
          />
        </div>
      </section>
      </div>
    </div>
  );
}
