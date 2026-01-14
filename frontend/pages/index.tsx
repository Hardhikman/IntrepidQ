"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Types
import { GeneratedQuestion } from "@/lib/supabase";
import { AIntrepidQLogo } from "@/components/aintrepidq-logo";

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
  const [numQuestions, setNumQuestions] = useState(3);
  const [useCurrentAffairs, setUseCurrentAffairs] = useState(false);
  const [mode, setMode] = useState<"topic" | "keyword" | "paper" | "currentAffairs">("topic");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [generatingAllAnswers, setGeneratingAllAnswers] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState("moonshot-k2");
  const [answerLoadingIndex, setAnswerLoadingIndex] = useState<number | null>(null);
  // Add models state
  const [models, setModels] = useState<{ id: string; name: string }[]>([
    { id: "moonshot-k2", name: "Moonshot (K2)" },
    { id: "qwen3-32b", name: "Qwen3 (32B)" },
  ]);

  // Add state for PDF generation
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Add state for showing sign-in notification instead of automatic redirect
  const [showSignInNotification, setShowSignInNotification] = useState(false);

  // NEW: Keyword query state for keyword mode
  const [keywordQuery, setKeywordQuery] = useState("");

  // NEW: Keywords fetched from Upstash for current affairs mode
  const [fetchedKeywords, setFetchedKeywords] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState("");

  // NEW: News source state
  const [newsSource, setNewsSource] = useState("all");

  // Daily limit tracking
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

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
    } else {
      // For non-authenticated users, always set limit reached to true
      // since we're removing the guest feature
      setDailyLimitReached(true);
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
          // Since we've removed the guest feature, all users are authenticated
          // Show the standard limit reached message for all users
          setDailyLimitReached(true);
          toast({
            title: "Daily Limit Reached",
            description: errorData.error || "Daily generation limit reached",
            variant: "destructive",
          });
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
            topic: mode === "keyword" ? keywordQuery : selectedTopic,
            mode: mode === "keyword" ? "keyword" : mode === "currentAffairs" ? "currentAffairs" : mode === "paper" ? "paper" : "topic",
            question: q,
            thinking: "",
            use_current_affairs: mode === "currentAffairs" ? true : useCurrentAffairs,
            question_count: 1,
            created_at: new Date().toISOString(),
            context: data.meta?.sampled_documents || [],
            meta: data.meta || {}
          }
          : {
            id: Math.random().toString(),
            subject: selectedSubject,
            topic: mode === "keyword" ? keywordQuery : selectedTopic,
            mode: mode === "keyword" ? "keyword" : mode === "currentAffairs" ? "currentAffairs" : mode === "paper" ? "paper" : "topic",
            question: q.question || q.questions,
            thinking: q.thinking || "",
            use_current_affairs: mode === "currentAffairs" ? true : useCurrentAffairs,
            question_count: 1,
            created_at: new Date().toISOString(),
            context: data.meta?.sampled_documents || [],
            meta: data.meta || {}
          }
      );
      setQuestions(qs);

      // For non-authenticated users, always set limit reached to true
      // since we're removing the guest feature
      if (!user) {
        setDailyLimitReached(true);
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
          // Since we've removed the guest feature, all users are authenticated
          // Show the standard limit reached message for all users
          setDailyLimitReached(true);
          toast({
            title: "Daily Limit Reached",
            description: errorData.error || "Daily generation limit reached",
            variant: "destructive",
          });
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
            context: data.meta?.sampled_documents || [],
            meta: data.meta || {}
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
            context: data.meta?.sampled_documents || [],
            meta: data.meta || {}
          }
      );
      setQuestions(qs);

      // Update guest state after successful generation
      if (!user) {
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      applyLocalGenerationIncrement?.(1);
      refreshProfile?.();
    }
  };

  // Fallback method to download questions as text file
  const downloadQuestionsAsText = () => {
    try {
      let content = `UPSC ${selectedSubject} Practice Questions\n`;
      content += `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}\n`;
      content += `Date: ${new Date().toLocaleDateString()}\n\n`;

      questions.forEach((q, index) => {
        content += `Question ${index + 1}:\n`;
        content += `${q.question}\n`;
        if (q.thinking) {
          content += `Thinking Process: ${q.thinking}\n`;
        }
        content += `\n`;
      });

      content += `\nGenerated by IntrepidQ AI - UPSC Preparation Assistant`;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upsc-${selectedSubject.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Success", description: "Questions downloaded as text file.", variant: "default" });
    } catch (err: any) {
      console.error("Error downloading text file:", err);
      toast({ title: "Error", description: "Failed to download text file: " + (err.message || "Please try again."), variant: "destructive" });
    }
  };

  // PDF Download Function
  const handleDownloadPDF = async () => {
    if (questions.length === 0) {
      toast({ title: "Warning", description: "No questions to download", variant: "destructive" });
      return;
    }

    // Check if we're on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // For mobile devices, show a warning but still attempt to generate
    if (isMobile) {
      toast({
        title: "Note",
        description: "On mobile devices, you may need to manually save the print dialog as PDF. If that fails, try the text download option.",
        variant: "default"
      });
    }

    setIsGeneratingPDF(true);
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        // Fallback for popup blockers
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site and try again. As an alternative, you can download questions as a text file.",
          variant: "destructive"
        });

        // Offer text file download as fallback
        setTimeout(() => {
          const confirmDownload = confirm("Would you like to download the questions as a text file instead?");
          if (confirmDownload) {
            downloadQuestionsAsText();
          }
        }, 1000);

        setIsGeneratingPDF(false);
        return;
      }

      // Build the HTML content as a string first
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>UPSC ${selectedSubject} Practice Questions</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 100%;
              width: 100%;
              margin: 0 auto;
              padding: 2vw;
              background-color: white;
              color: #333;
            }
            h1 {
              color: #4f46e5;
              text-align: center;
              margin-bottom: 2vh;
              font-size: 1.8rem;
            }
            .info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2vh;
              font-size: 0.9rem;
              color: #666;
            }
            .question {
              margin-bottom: 3vh;
              padding: 2vh;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background-color: #f9fafb;
            }
            .question-title {
              color: #4f46e5;
              margin-bottom: 1.5vh;
              font-size: 1.2rem;
              font-weight: bold;
            }
            .question-text {
              font-size: 1rem;
              line-height: 1.6;
              color: #374151;
              white-space: pre-wrap;
            }
            .thinking {
              margin-top: 1.5vh;
              padding: 1.2vh;
              background-color: #eff6ff;
              border-radius: 4px;
              border-left: 3px solid #3b82f6;
              color: #374151;
              white-space: pre-wrap;
            }
            .thinking-title {
              color: #3b82f6;
              font-weight: bold;
            }
            .footer {
              margin-top: 4vh;
              padding-top: 2vh;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 0.8rem;
              color: #9ca3af;
            }
            @media print {
              body {
                padding: 1vw;
              }
              .question {
                page-break-inside: avoid;
              }
            }
            @media (max-width: 768px) {
              h1 {
                font-size: 1.5rem;
              }
              .info {
                flex-direction: column;
                gap: 1vh;
              }
              .question {
                padding: 1.5vh;
              }
            }
          </style>
        </head>
        <body>
          <h1>UPSC ${selectedSubject} Practice Questions</h1>
          <div class="info">
            <span>Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
            <span>Date: ${new Date().toLocaleDateString()}</span>
          </div>
      `;

      // Add questions to the HTML content
      questions.forEach((q, index) => {
        // Properly escape content for HTML
        const escapeHtml = (text: string) => {
          if (!text) return '';
          return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        };

        const escapedQuestion = escapeHtml(q.question);
        const escapedThinking = escapeHtml(q.thinking || "");

        htmlContent += `
          <div class="question">
            <div class="question-title">Question ${index + 1}</div>
            <div class="question-text">${escapedQuestion}</div>
            ${q.thinking ? `<div class="thinking"><span class="thinking-title">Thinking Process: </span>${escapedThinking}</div>` : ''}
          </div>
        `;
      });

      // Add footer
      htmlContent += `
          <div class="footer">
            Generated by IntrepidQ AI - UPSC Preparation Assistant
          </div>
        </body>
        </html>
      `;

      // Write the complete HTML content to the print window
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait a bit for content to load, then trigger print
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
          toast({
            title: "Success",
            description: isMobile
              ? "Print dialog opened. On mobile, use 'Save as PDF' option."
              : "Print dialog opened. Save as PDF to download.",
            variant: "default"
          });
        } catch (printErr: any) {
          console.error("Error during print operation:", printErr);
          // Provide alternative instructions
          toast({
            title: "Manual Save Required",
            description: isMobile
              ? "Please use your browser's share option to save as PDF. Alternatively, you can download as text file."
              : "Please use 'Save as PDF' in your print dialog. Alternatively, you can download as text file.",
            variant: "default"
          });

          // Offer text file download as fallback
          setTimeout(() => {
            const confirmDownload = confirm("Would you like to download the questions as a text file instead?");
            if (confirmDownload) {
              downloadQuestionsAsText();
            }
          }, 1000);

          // Don't close the window so user can manually save
        }
      }, 1500); // Increased timeout to 1500ms for better reliability

    } catch (err: any) {
      console.error("Error generating PDF:", err);
      toast({
        title: "Error",
        description: "Failed to generate PDF: " + (err.message || "Unknown error occurred. As an alternative, you can download questions as a text file."),
        variant: "destructive"
      });

      // Offer text file download as fallback
      setTimeout(() => {
        const confirmDownload = confirm("Would you like to download the questions as a text file instead?");
        if (confirmDownload) {
          downloadQuestionsAsText();
        }
      }, 1000);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Return the main interface for both authenticated and guest users
  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-hidden">
      {/* Floating Ambient Orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-ambient-orbs dark:bg-ambient-orbs hidden dark:block" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-ambient-orbs bg-ambient-orbs-light block dark:hidden" />

      {/* Diagonal Grid with Green Glow - Dark mode */}
      <div className="absolute inset-0 z-0 pointer-events-none hidden dark:block bg-grid-dark animate-grid-pulse" />

      {/* Elegant Mesh Grid - Light mode */}
      <div className="absolute inset-0 z-0 pointer-events-none block dark:hidden bg-grid-light" />

      {/* Main Content with relative positioning to appear above the background */}
      <div className="relative z-10">
        <Head>
          <title>IntrepidQ AI - India's first NLP and RAG based AI assistant for UPSC CSE preparation</title>
          <meta name="description" content="Generate context-aware UPSC CSE mains questions with AI assistance. Prepare for the Indian civil services exam with our AI-powered question generator." />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <script type="application/ld+json">
            {`
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "IntrepidQ AI",
  "url": "https://intrepidq.xyz",
  "description": "Generate context-aware UPSC CSE mains questions with AI assistance",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "INR"
  }
}
`}
          </script>
        </Head>

        {/* Floating Header */}
        <FloatingHeader
          user={user}
          authLoading={authLoading}
          signOut={signOut}
          signInWithGoogle={signInWithGoogle}
        />

        {/* Embedded YouTube Video Section - Moved below header and reduced size */}
        <section className="max-w-3xl mx-auto bg-card rounded-xl shadow-lg border border-border p-4 mt-20">
          <div className="text-center mb-3">
            <h2 className="text-xl font-bold text-foreground mb-1">
              Welcome to IntrepidQ AI
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Learn how to use IntrepidQ to ace the UPSC CSE mains exam
            </p>
          </div>

          <div className="aspect-video w-full rounded-lg overflow-hidden max-w-2xl mx-auto">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/L_sTf2JZlJc?autoplay=0"
              title="IntrepidQ AI Introduction"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </section>

        {/* Main Content with padding adjusted for taller floating header */}
        <div className="pt-4 p-4 space-y-6">
          {/* New Info Section - Increased width */}
          <section className="max-w-4xl mx-auto bg-card rounded-2xl shadow-lg border border-border p-6 md:p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold text-foreground mb-4 tracking-wide">
                The Modern Solution for UPSC Aspirants in the AI Age
              </h1>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed font-medium">
                IntrepidQ AI empowers fearless aspirants to transform their preparation and cut short their UPSC cycle. Unlike complex AI tools,
                we offer a comprehensive, minimalistic platform that sharpens your answer writing, brainstorming, and creative thinking—the skills that actually determine your rank.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">Customization</h3>
                  <p className="text-muted-foreground">Search options for every type of aspirants</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">Prediction</h3>
                  <p className="text-muted-foreground">Question prediction on the base of PYQ made easy</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">No FOMO</h3>
                  <p className="text-muted-foreground">Coverage of extensive context aware questions</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">Time Value of Money</h3>
                  <p className="text-muted-foreground">Balance the time between revision and practice</p>
                </div>
              </div>
            </div>
          </section>

          {/* Mode selection card */}
          <Card className="max-w-4xl mx-auto shadow-lg bg-card border border-border rounded-2xl">
            <CardContent className="py-5">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="font-extrabold text-foreground text-center text-xl sm:text-2xl tracking-wide">
                  Select Question Generation Mode
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                <button
                  className={cn(
                    "rounded-2xl font-bold transition-all shadow-md w-full sm:w-auto px-6 py-3 text-lg relative",
                    mode === "topic"
                      ? "bg-gradient-to-r from-orange-600 to-orange-700 text-white transform scale-105"
                      : "bg-muted border border-border text-foreground hover:bg-accent"
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
                      ? "bg-gradient-to-r from-orange-600 to-orange-700 text-white transform scale-105"
                      : "bg-muted border border-border text-foreground hover:bg-accent"
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
                      ? "bg-gradient-to-r from-orange-600 to-orange-700 text-white transform scale-105"
                      : "bg-muted border border-border text-foreground hover:bg-accent"
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
                      ? "bg-gradient-to-r from-orange-600 to-orange-700 text-white transform scale-105"
                      : "bg-muted border border-border text-foreground hover:bg-accent"
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
                <div className="text-foreground bg-muted border border-border rounded-lg text-center w-full text-sm md:text-base px-4 py-3 mt-4 font-medium">
                  10 questions · 10 marks each · 1 hour · 100 marks
                  {questions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPDF}
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md ${isGeneratingPDF
                          ? 'bg-muted cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                          } text-white shadow-sm`}
                      >
                        {isGeneratingPDF ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            PDF...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            PDF
                          </>
                        )}
                      </button>

                      <button
                        onClick={downloadQuestionsAsText}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Text
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Authenticated user daily limit notification - Made responsive */}
          {user && dailyLimitReached && (
            <Card className="max-w-5xl mx-auto shadow-sm border border-border bg-muted">
              <CardContent className="py-4">
                <div className="text-center">
                  <div className="text-foreground font-medium mb-2 text-sm sm:text-base">
                    🚫 Daily Limit Reached! You've used all 5 question generations today.
                  </div>
                  <div className="text-muted-foreground text-xs sm:text-sm">
                    Your daily limit will reset tomorrow. Keep brainstorming and keep learning !
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CONFIG + RESULTS - Made responsive */}
          <section className="max-w-5xl mx-auto space-y-6">
            {/* Removed tabbed interface - only Question Generator remains */}
            <div className="w-full">
              {!user ? (
                <div className="text-center py-8">
                  <div className="text-lg font-semibold text-foreground mb-4">
                    Welcome to <AIntrepidQLogo size="large" />
                    <div className="mt-4">
                      Join 500+ UPSC aspirants who are already trusting transparent AI system <span className="inline-block">😊</span>
                    </div>
                  </div>
                  <Button
                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white"
                    onClick={handleGoogleSignIn}
                  >
                    Sign In with Google
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
                <ChatWindow
                  questions={questions}
                  answers={answers}
                  loading={loading}
                  onGenerateAnswer={handleGenerateSingleAnswer}
                  answerLoadingIndex={answerLoadingIndex}
                />
              </div>

              {/* FAQ Section */}
              <section className="max-w-5xl mx-auto mt-12">
                <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="w-full space-y-4">
                  <AccordionItem value="item-1" className="bg-card border border-border rounded-lg px-4">
                    <AccordionTrigger className="text-foreground hover:text-accent-foreground text-left">
                      What is IntrepidQ AI and how does it help UPSC aspirants?
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      IntrepidQ AI is India's first NLP and RAG-based AI assistant specifically designed for UPSC CSE mains preparation.
                      It generates context-aware mains questions across all GS papers, helping aspirants practice answer writing with
                      relevant current affairs and PYQ-based insights.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2" className="bg-card border border-border rounded-lg px-4">
                    <AccordionTrigger className="text-foreground hover:text-accent-foreground text-left">
                      How is IntrepidQ different from other AI tools for UPSC preparation?
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      Unlike generic AI tools, IntrepidQ is purpose-built for UPSC with features like:
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Topic-wise question generation aligned with UPSC syllabus</li>
                        <li>Current affairs integration with keyword-based search</li>
                        <li>PYQ pattern analysis for accurate question prediction</li>
                        <li>Comprehensive coverage across all GS papers</li>
                        <li>Brainstorming ideas to enhance creative thinking</li>
                        <li>Transparency in making by displaying contextual information(PYQ and News items)</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3" className="bg-card border border-border rounded-lg px-4">
                    <AccordionTrigger className="text-foreground hover:text-accent-foreground text-left">
                      How many questions can I generate per day?
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      Authenticated(signed up) users can generate up to 5 sets of questions per day. Each set can contain 1-3 questions
                      depending on your selection. This limit ensures optimal resource usage while providing ample practice
                      opportunities. The daily limit resets every 24 hours.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4" className="bg-card border border-border rounded-lg px-4">
                    <AccordionTrigger className="text-foreground hover:text-accent-foreground text-left">
                      Can I practice answer writing along with IntrepidQ?
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      Yes! After generating questions, you can use our brainstorming feature to develop ideas and structure
                      your thoughts.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5" className="bg-card border border-border rounded-lg px-4">
                    <AccordionTrigger className="text-foreground hover:text-accent-foreground text-left">
                      How current affairs mode differs from keyword mode ?
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      The two modes uses different NLP techniques(TF-IDF and Cosine similarity)to perform their operations.In current affairs mode, Users could choose between
                      the hindu and the indian express to get relevant news articles according to keyword for effective question generation.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}