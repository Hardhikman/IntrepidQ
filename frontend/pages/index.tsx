"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// Add this interface for our video popup
interface VideoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Add this simple video popup component
const VideoPopup = ({ open, onOpenChange }: VideoPopupProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative bg-white rounded-lg overflow-hidden w-full max-w-3xl">
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="aspect-video w-full">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/L_sTf2JZlJc?autoplay=1" // Updated with your video URL
            title="IntrepidQ AI Introduction"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        <div className="p-4 text-center">
          <h3 className="text-lg font-semibold">Welcome to IntrepidQ AI</h3>
          <p className="text-sm text-gray-600 mt-1">
            Learn how IntrepidQ AI can help you prepare for the UPSC CSE exam.
          </p>
        </div>
      </div>
    </div>
  );
};

// Components
import { QuestionGenerator } from "@/components/QuestionGenerator";
import { ChatWindow } from "@/components/Chatwindow";
import FloatingHeader from "@/components/FloatingHeader";
import { ScreenshotUploader } from "@/components/ScreenshotUploader";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  // Add state for video popup
  const [showVideoPopup, setShowVideoPopup] = useState(false);

  // State
  const [subjects, setSubjects] = useState<Record<string, Subject>>({});
  const [selectedSubject, setSelectedSubject] = useState("GS1");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(3);
  const [useCurrentAffairs, setUseCurrentAffairs] = useState(false);
  const [mode, setMode] = useState<"topic" | "keyword" | "paper" | "currentAffairs">("topic");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [generatingAllAnswers, setGeneratingAllAnswers] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState("llama3-70b");
  const [answerLoadingIndex, setAnswerLoadingIndex] = useState<number | null>(null);
  // Add models state
  const [models, setModels] = useState<{ id: string; name: string }[]>([
    { id: "llama3-70b", name: "Llama3 (70B)" },
    { id: "moonshot-k2", name: "Moonshot (K2)" },
    { id: "gemma2-9b", name: "Gemma2 (9B)" },
  ]);

  // NEW: Keyword query state for keyword mode
  const [keywordQuery, setKeywordQuery] = useState("");
  
  // NEW: Keywords fetched from Upstash for current affairs mode
  const [fetchedKeywords, setFetchedKeywords] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState("");

  // NEW: News source state
  const [newsSource, setNewsSource] = useState("all");

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

  // Load subjects and models
  useEffect(() => {
    fetchSubjects();
    fetchModels();
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

  // Show video popup when page loads (for all users)
  useEffect(() => {
    // Only show popup once per session
    if (typeof window !== 'undefined' && !sessionStorage.getItem('videoPopupShown')) {
      // Set a small delay to ensure page is loaded
      const timer = setTimeout(() => {
        setShowVideoPopup(true);
        sessionStorage.setItem('videoPopupShown', 'true');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

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

  const fetchModels = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";
      const response = await fetch(`${baseUrl}/api/models`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (data.models && data.models.length > 0) {
        setModels(data.models);
        // Set the first model as selected if it's not already set or if the current model is not in the list
        if (!data.models.some((model: any) => model.id === selectedModel)) {
          setSelectedModel(data.models[0].id);
        }
      }
    } catch (err: any) {
      console.error("Error fetching models:", err);
      // Keep using the hardcoded models as fallback
      toast({ title: "Notice", description: "Using default model list", variant: "default" });
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

  // NEW: Fetch keywords from Upstash when topic is selected in current affairs mode
  const fetchKeywordsForTopic = async (topic: string) => {
    if (!topic || mode !== "currentAffairs") return;
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";
      const response = await fetch(`${baseUrl}/api/get_keywords_for_topic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setFetchedKeywords(data.keywords || []);
      
      // Auto-select the first keyword if available
      if (data.keywords && data.keywords.length > 0) {
        setSelectedKeyword(data.keywords[0]);
      } else {
        setSelectedKeyword("");
      }
    } catch (err: any) {
      console.error("Error fetching keywords:", err);
      toast({ title: "Error", description: "Failed to fetch keywords for topic", variant: "destructive" });
      setFetchedKeywords([]);
      setSelectedKeyword("");
    }
  };

  // Effect to fetch keywords when topic changes in current affairs mode
  useEffect(() => {
    if (mode === "currentAffairs" && selectedTopic) {
      fetchKeywordsForTopic(selectedTopic);
    } else {
      setFetchedKeywords([]);
      setSelectedKeyword("");
    }
  }, [selectedTopic, mode]);

  const handleGenerateQuestions = async () => {
    if ((mode === "topic" || mode === "currentAffairs") && !selectedTopic) {
      toast({ title: "Warning", description: "Please select a topic", variant: "destructive" });
      return;
    }
    
    if (mode === "keyword" && !keywordQuery.trim()) {
      toast({ title: "Warning", description: "Please enter keywords", variant: "destructive" });
      return;
    }
    
    // NEW: Check if in current affairs mode and a keyword is selected
    if (mode === "currentAffairs" && !selectedKeyword) {
      toast({ title: "Warning", description: "No keywords available for this topic", variant: "destructive" });
      return;
    }
    
    setQuestions([]);
    setAnswers({});
    setLoading(true);

    try {
      let endpoint, payload;
      
      if (mode === "paper") {
        endpoint = "/api/generate_whole_paper";
        // Set use_ca to false to disable current affairs in paper mode
        payload = { subject: selectedSubject, use_ca: false, months: 6, model: selectedModel, news_source: newsSource };
      } else if (mode === "keyword") {
        endpoint = "/api/generate_questions_from_keywords";
        // Only use the first keyword instead of all keywords
        const firstKeyword = keywordQuery.split(',').map(k => k.trim()).filter(k => k.length > 0)[0] || keywordQuery;
        payload = { 
          keywords: [firstKeyword], // Only send the first keyword
          num: numQuestions, 
          use_ca: useCurrentAffairs, 
          months: 6, 
          model: selectedModel,
          subject: selectedSubject,
          news_source: newsSource
        };
      } else if (mode === "currentAffairs") {
        // Current Affairs mode - use topic-based endpoint with current affairs enabled and selected keyword
        endpoint = "/api/generate_questions";
        payload = { 
          topic: selectedTopic, 
          num: numQuestions, 
          use_ca: true, // Always enable current affairs for this mode
          months: 6, 
          model: selectedModel,
          subject: selectedSubject,
          news_source: newsSource,
          // Pass the selected keyword to enhance the current affairs context
          keyword_context: selectedKeyword
        };
      } else {
        endpoint = "/api/generate_questions";
        payload = { topic: selectedTopic, num: numQuestions, use_ca: useCurrentAffairs, months: 6, model: selectedModel, news_source: newsSource };
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
              description: `You've reached your daily limit of ${errorData.guest_daily_limit} question generations. Sign in with Google to get ${errorData.user_daily_limit} question generations per day!`,
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
              use_current_affairs: mode === "currentAffairs" ? true : useCurrentAffairs,
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
              use_current_affairs: mode === "currentAffairs" ? true : useCurrentAffairs,
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
    // Redirect to the dedicated signin page
    router.push("/auth/signin");
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
      toast({ title: "Warning", description: "Please enter a keyword", variant: "destructive" });
      return;
    }
    
    setQuestions([]);
    setAnswers({});
    setLoading(true);

    try {
      const endpoint = "/api/generate_questions_from_keywords";
      // Only use the first keyword instead of all keywords
      const firstKeyword = keywordQuery.split(',').map(k => k.trim()).filter(k => k.length > 0)[0] || keywordQuery;
      const payload = { 
        keywords: [firstKeyword], // Only send the first keyword
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

  // NEW: Handle text extracted from screenshots
  const handleTextExtracted = (text: string) => {
    // You can implement logic here to use the extracted text
    // For example, you might want to generate questions based on the extracted text
    console.log("Extracted text:", text);
  };

  // Return the main interface for both authenticated and guest users
  return (
    <>
      <Head>
        <title>IntrepidQ AI - India's first NLP and RAG based AI assistant for UPSC CSE preparation</title>
        <meta name="description" content="Generate context-aware UPSC CSE mains questions with AI assistance. Prepare for the Indian civil services exam with our AI-powered question generator." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      {/* Add the video popup component */}
      <VideoPopup open={showVideoPopup} onOpenChange={setShowVideoPopup} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        {/* Floating Header */}
        <FloatingHeader
          user={user}
          authLoading={authLoading}
          signOut={signOut}
          signInWithGoogle={signInWithGoogle}
        />

        {/* Main Content with padding adjusted for taller floating header */}
        <div className="pt-16 p-4 space-y-6">
          {/* New Info Section - Increased width */}
          <section className="max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                The Modern solution for UPSC Aspirants in AI age
              </h1>
              <p className="text-gray-700 text-lg max-w-3xl mx-auto leading-relaxed">
                IntrepidQ AI is a AI system for the aspirants who are fearless to change their preparation style to cut short their UPSC cycle. 
                It is not another complex AI product, it is a comprehensive , minimalistic , and free platform to develop answer writing with brainstorming and creative thinking abilities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Customization</h3>
                  <p className="text-gray-700">Search options for every type of aspirants</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Prediction</h3>
                  <p className="text-gray-700">Question prediction on the base of PYQ made easy</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">No FOMO</h3>
                  <p className="text-gray-700">Coverage of extensive context aware questions</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Time value of money</h3>
                  <p className="text-gray-700">Balance the time between revision and practice</p>
                </div>
              </div>
            </div>
          </section>

          {/* Mode selection card */}
          <Card className="max-w-4xl mx-auto shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl">
            <CardContent className="py-5">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="font-extrabold text-indigo-800 text-center text-xl sm:text-2xl tracking-wide">
                   Select Question Generation Mode
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                <button
                  className={cn(
                    "rounded-2xl font-bold transition-all shadow-md w-full sm:w-auto px-6 py-3 text-lg relative",
                    mode === "topic"
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white transform scale-105"
                      : "bg-white border-2 border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400"
                  )}
                  onClick={() => setMode("topic")}
                >
                  <div className="absolute inset-0 bg-black opacity-0 hover:opacity-10 transition-opacity duration-200 rounded-2xl"></div>
                  <div className="relative z-10">
                    📚 Topic-wise
                  </div>
                </button>
                
                <button
                  className={cn(
                    "rounded-2xl font-bold transition-all shadow-md w-full sm:w-auto px-6 py-3 text-lg relative",
                    mode === "keyword"
                      ? "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white transform scale-105"
                      : "bg-white border-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
                  )}
                  onClick={() => setMode("keyword")}
                >
                  <div className="absolute inset-0 bg-black opacity-0 hover:opacity-10 transition-opacity duration-200 rounded-2xl"></div>
                  <div className="relative z-10">
                    🔍 Keyword-based
                  </div>
                </button>
                
                <button
                  className={cn(
                    "rounded-2xl font-bold transition-all shadow-md w-full sm:w-auto px-6 py-3 text-lg relative",
                    mode === "currentAffairs"
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white transform scale-105"
                      : "bg-white border-2 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                  )}
                  onClick={() => setMode("currentAffairs")}
                >
                  <div className="absolute inset-0 bg-black opacity-0 hover:opacity-10 transition-opacity duration-200 rounded-2xl"></div>
                  <div className="relative z-10">
                    📰 Current Affairs
                  </div>
                </button>
                
                <button
                  className={cn(
                    "rounded-2xl font-bold transition-all shadow-md w-full sm:w-auto px-6 py-3 text-lg relative",
                    mode === "paper"
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white transform scale-105"
                      : "bg-white border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                  )}
                  onClick={() => setMode("paper")}
                >
                  <div className="absolute inset-0 bg-black opacity-0 hover:opacity-10 transition-opacity duration-200 rounded-2xl"></div>
                  <div className="relative z-10">
                    📄 Whole Paper
                  </div>
                </button>
              </div>
              
              {mode === "paper" && (
                <div className="text-blue-800 bg-blue-100 border-2 border-blue-300 rounded-lg text-center w-full text-sm md:text-base px-4 py-3 mt-4 font-medium">
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
                      ? ' Sign in with Google to get 5 question generations per day, save your history, and access premium features!' 
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
            {/* Tabs for Question Generation and Screenshot Processing */}
            <Tabs defaultValue="questions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger 
                  value="questions" 
                  disabled={dailyLimitReached}
                >
                  Question Generator
                </TabsTrigger>
                <TabsTrigger 
                  value="screenshot"
                  disabled={dailyLimitReached}
                >
                  Answer Evaluator
                </TabsTrigger>
              </TabsList>
              <TabsContent value="questions">
                {dailyLimitReached ? (
                  <div className="text-center py-8">
                    <Button 
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                      onClick={() => user ? router.push('/dashboard') : signInWithGoogle()}
                    >
                      {user ? "Go to Dashboard" : "Sign In with Google"}
                    </Button>
                  </div>
                ) : (
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
                    // Models prop
                    models={models}
                    // NEW: News source props
                    newsSource={newsSource}
                    setNewsSource={setNewsSource}
                    // NEW: Keywords for current affairs mode
                    fetchedKeywords={fetchedKeywords}
                    selectedKeyword={selectedKeyword}
                    setSelectedKeyword={setSelectedKeyword}
                  />
                )}

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
              </TabsContent>
              <TabsContent value="screenshot">
                {dailyLimitReached ? (
                  <div className="text-center py-8">
                    <Button 
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                      onClick={() => user ? router.push('/dashboard') : signInWithGoogle()}
                    >
                      {user ? "Go to Dashboard" : "Sign In with Google"}
                    </Button>
                  </div>
                ) : (
                  <ScreenshotUploader onTextExtracted={handleTextExtracted} />
                )}
              </TabsContent>
            </Tabs>

          </section>
        </div>
      </div>
    </>
  );
}
