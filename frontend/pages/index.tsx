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

// Types
import { GeneratedQuestion } from "@/lib/supabase";

interface Subject {
  name: string;
  topics: string[];
}

export default function UPSCQuestionGenerator() {
  const {
    user,
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
  const [mode, setMode] = useState<"topic" | "paper">("topic");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [generatingAllAnswers, setGeneratingAllAnswers] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState("llama3-70b");
  const [answerLoadingIndex, setAnswerLoadingIndex] = useState<number | null>(null);

  // NEW: variant toggle → default "compact", change to "spacious" if wanted
  const [cardVariant, setCardVariant] = useState<"compact" | "spacious">("compact");

  // Load subjects
  useEffect(() => {
    fetchSubjects();
  }, []);

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
    setQuestions([]);
    setAnswers({});
    setLoading(true);

    try {
      const endpoint = mode === "paper" ? "/api/generate_whole_paper" : "/api/generate_questions";
      const payload =
        mode === "paper"
          ? { subject: selectedSubject, use_ca: useCurrentAffairs, months: 6, model: selectedModel }
          : { topic: selectedTopic, num: numQuestions, use_ca: useCurrentAffairs, months: 6, model: selectedModel };

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

  // Return the main interface for both authenticated and guest users
  return (
    <div className="min-h-screen bg-gradient-to-r from-orange-50 to-blue-50 p-4 space-y-6">
      {/* HEADER */}
      <Card className="max-w-5xl mx-auto shadow-md">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="w-20" />
            <CardTitle className="flex-1 text-center text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-orange-400 via-blue-400 to-orange-500 
  bg-clip-text text-transparent drop-shadow-sm">
              IntrepidQ
            </CardTitle>

            {/* Conditional rendering: User menu for authenticated users, Sign In button for guests */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-gradient-to-r from-orange-400 to-blue-500 hover:from-orange-500 hover:to-blue-600 text-white flex items-center font-semibold tracking-wide">
                    <Menu className="w-5 h-5 mr-2" /> MENU
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuLabel className="text-orange-600 font-semibold">
                    {authLoading ? "Checking..." : user?.email ?? "Guest"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>📊 Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/profile")}>👤 Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/about")}>ℹ️ About</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>🚪 Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={handleGoogleSignIn}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center font-semibold tracking-wide"
                disabled={authLoading}
              >
                {authLoading ? "Loading..." : "🚀 Sign In with Google"}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* MODE SELECTOR with compact/spacious toggle */}
      <Card className="max-w-5xl mx-auto shadow-sm">
        <CardContent
          className={cn(
            cardVariant === "compact"
              ? "py-4"
              : "py-8"
          )}
        >
          <div
            className={cn(
              "mx-auto flex flex-col items-center",
              cardVariant === "compact" ? "gap-3" : "gap-6"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-bold text-orange-800",
                  cardVariant === "compact"
                    ? "text-lg sm:text-xl md:text-2xl"
                    : "text-2xl md:text-3xl"
                )}
              >
                🎯 Select Question Generation Mode
              </span>
            </div>

            <div
              className={cn(
                "flex flex-col sm:flex-row items-center justify-center",
                cardVariant === "compact" ? "gap-3" : "gap-6"
              )}
            >
              <Button
                className={cn(
                  "rounded-xl font-semibold transition-all shadow-sm",
                  cardVariant === "compact"
                    ? "px-5 md:px-6 py-2.5 text-base"
                    : "px-8 md:px-10 py-4 text-lg",
                  mode === "topic"
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                    : "bg-white border border-orange-400 text-orange-700 hover:bg-orange-50"
                )}
                onClick={() => setMode("topic")}
              >
                📚 Topic-wise
              </Button>

              <Button
                className={cn(
                  "rounded-xl font-semibold transition-all shadow-sm",
                  cardVariant === "compact"
                    ? "px-5 md:px-6 py-2.5 text-base"
                    : "px-8 md:px-10 py-4 text-lg",
                  mode === "paper"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                    : "bg-white border border-blue-400 text-blue-700 hover:bg-blue-50"
                )}
                onClick={() => setMode("paper")}
              >
                📄 Whole Paper
              </Button>
            </div>

            {mode === "paper" && (
              <div
                className={cn(
                  "text-blue-800 bg-blue-50 border border-blue-200 rounded-md",
                  cardVariant === "compact"
                    ? "text-xs md:text-sm px-3 py-2"
                    : "text-sm md:text-base px-4 py-3"
                )}
              >
                10 questions · 10 marks each · 1 hour · 100 marks
              </div>
            )}

            {/* toggle button to switch look */}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setCardVariant(cardVariant === "compact" ? "spacious" : "compact")}
            >
              ZOOM ({cardVariant})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guest user information */}
      {!user && (
        <Card className="max-w-5xl mx-auto shadow-sm border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="text-center">
              <div className="text-blue-800 font-medium mb-2">
                🎆 Welcome, Guest! You have 2 free question generations per day.
              </div>
              <div className="text-blue-600 text-sm">
                Generate unlimited answers! Sign in with Google to get 5 question generations per day, save your history, and access premium features!
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CONFIG + RESULTS */}
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
          isGenerateDisabled={loading}
          loading={loading}
          onGenerate={handleGenerateQuestions}
          mode={mode}
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
  );
}