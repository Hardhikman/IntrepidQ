"use client";

// React and Next.js Imports
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Custom Hooks and Libraries
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { cn } from "@/lib/utils";

// Custom Components
import AuthForm from '@/components/AuthForm';
import { TopicCombobox } from "@/components/combobox";
import { QuestionDisplay } from '@/components/QuestionDisplay';
import { Dashboard } from '@/components/Dashboard';

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TypographyH2, TypographyLarge, TypographyList } from "@/components/ui/typography";

// Type Definitions
import { GeneratedQuestion } from '@/lib/supabase';

interface Subject {
  name: string;
  topics: string[];
}

interface ChatMessage {
  sender: 'user' | 'ai';
  content: string | GeneratedQuestion[];
}

export default function UPSCQuestionGenerator() {
  const { user, profile, loading: authLoading, signOut, refreshProfile, applyLocalGenerationIncrement } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Component State
  const [showDashboard, setShowDashboard] = useState(false);
  const [subjects, setSubjects] = useState<Record<string, Subject>>({});
  const [selectedSubject, setSelectedSubject] = useState<string>('GS1');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [useCurrentAffairs, setUseCurrentAffairs] = useState<boolean>(false);
  const [mode, setMode] = useState<'topic' | 'paper'>('topic');
  const [loading, setLoading] = useState<boolean>(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [generatingAllAnswers, setGeneratingAllAnswers] = useState<boolean>(false);
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(true);
  const [selectedModel, setSelectedModel] = useState("llama3-70b");
  const [availableModels, setAvailableModels] = useState<Record<string, { provider: string; model_id: string }>>({});
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    fetchSubjects();
    fetchAvailableModels();
  }, []);

  useEffect(() => {
    const shouldPoll = loading || generatingAllAnswers;
    if (!shouldPoll) return;

    const id = window.setInterval(() => {
      refreshProfile?.();
    }, 2500);

    return () => window.clearInterval(id);
  }, [loading, generatingAllAnswers, refreshProfile]);

  const fetchAvailableModels = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";
      const response = await fetch(`${baseUrl}/api/models`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.models || Object.keys(data.models).length === 0) {
        throw new Error('No models data received from server');
      }
      setAvailableModels(data.models);
    } catch (error: any) {
      console.error('Error fetching available models:', error);
      toast({ title: "Error", description: `❌ Failed to load models: ${error.message}`, variant: "destructive" });
    }
  };

  const fetchSubjects = async () => {
    setSubjectsLoading(true);
    try {
      console.log('Fetching subjects...');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";
      const response = await fetch(`${baseUrl}/api/subjects`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.subjects || Object.keys(data.subjects).length === 0) {
        throw new Error('No subjects data received from server');
      }

      setSubjects(data.subjects);
      console.log('Subjects loaded:', Object.keys(data.subjects).length);

      if (data.subjects?.GS1?.topics?.length > 0) {
        const firstTopic = data.subjects.GS1.topics[0];
        setSelectedTopic(firstTopic);
        console.log('Auto-selected first topic:', firstTopic);
      }

      toast({ title: "Success", description: `✅ Loaded ${Object.keys(data.subjects).length} subjects successfully` });

    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      toast({ title: "Error", description: `❌ Failed to load subjects: ${error.message}`, variant: "destructive" });
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleSubjectChange = (newSubject: string) => {
    console.log('Subject changed to:', newSubject);
    setSelectedSubject(newSubject);
    if (subjects[newSubject]?.topics?.length > 0) {
      const firstTopic = subjects[newSubject].topics[0];
      setSelectedTopic(firstTopic);
      console.log('Auto-selected topic for', newSubject, ':', firstTopic);
    } else {
      setSelectedTopic('');
      console.log('No topics available for', newSubject);
    }
  };

  const handleGenerateQuestions = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    console.log('Generate button clicked!', {
      mode,
      selectedTopic: selectedTopic.substring(0, 50) + '...',
      selectedSubject,
      useCurrentAffairs,
      numQuestions,
      model: selectedModel,
    });

    if (mode === 'topic' && !selectedTopic) {
      toast({ title: "Warning", description: '⚠️ Please select a topic first', variant: "destructive" });
      return;
    }

    const userMessageContent = mode === 'paper'
      ? `Generate a whole paper for ${selectedSubject}.`
      : `Generate ${numQuestions} questions for ${selectedTopic}.`;

    setChatHistory([{ sender: 'user', content: userMessageContent }]);
    setQuestions([]);
    setAnswers({});
    setLoading(true);
    const startTime = Date.now();

    try {
      const endpoint = mode === 'paper' ? '/api/generate_whole_paper' : '/api/generate_questions';
      const payload = mode === 'paper'
        ? {
          subject: selectedSubject,
          use_ca: useCurrentAffairs,
          months: 6,
          model: selectedModel
        }
        : {
          topic: selectedTopic,
          num: numQuestions,
          use_ca: useCurrentAffairs,
          months: 6,
          model: selectedModel
        };

      console.log('API Request:', { endpoint, payload });
      toast({ title: "Generating", description: '🤖 AI is generating questions...' });

      const sessionResponse = await supabase.auth.getSession();
      const token = sessionResponse.data.session?.access_token;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast({ title: "Error", description: "You have reached your daily generation limit.", variant: "destructive" });
          return;
        }
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions generated - empty response');
      }

      setQuestions(data.questions);
      setChatHistory(prev => [...prev, { sender: 'ai', content: data.questions }]);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);
      const successMessage = `✅ Generated ${mode === 'paper' ? 'whole paper (10 questions)' : `${numQuestions} questions`} in ${duration}s${useCurrentAffairs ? ' with current affairs' : ''}!`;
      toast({ title: "Success", description: successMessage });

      console.log('Questions generated successfully:', {
        mode,
        questionCount: data.question_count || numQuestions,
        duration: `${duration}s`,
        hasCurrentAffairs: useCurrentAffairs
      });

    } catch (error: any) {
      console.error('Error generating questions:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      toast({ title: "Error", description: `❌ Generation failed: ${errorMessage}`, variant: "destructive" });
    } finally {
      setLoading(false);
      applyLocalGenerationIncrement?.(1);
      refreshProfile?.();
    }
  };

  const handleGenerateAllAnswers = async () => {
    if (questions.length === 0) return;

    setGeneratingAllAnswers(true);
    toast({ title: 'Generating Answers', description: 'Generating answers for all questions...' });

    try {
      // FIX: Reverted to q.questions as indicated by the TypeScript compiler error.
      const questionList = questions.map(q => q.questions);

      const sessionResponse = await supabase.auth.getSession();
      const token = sessionResponse.data.session?.access_token;

      const response = await fetch('/api/generate_answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ questions: questionList })
      });

      if (!response.ok) {
        throw new Error('Failed to generate answers');
      }

      const data = await response.json();
      const newAnswers: Record<number, any> = {};
      (data.answers || []).forEach((ans: any, idx: number) => {
        newAnswers[idx] = ans;
      });

      setAnswers(newAnswers);
      toast({ title: 'Success', description: 'Generated answers for all questions!' });

    } catch (error) {
      console.error('Error generating answers:', error);
      toast({ title: 'Error', description: 'Failed to generate answers for all questions.', variant: 'destructive' });
    } finally {
      setGeneratingAllAnswers(false);
      applyLocalGenerationIncrement?.(1);
      refreshProfile?.();
    }
  };

  const handleSignOut = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    console.log('Sign out button clicked!');
    try {
      await signOut();
      toast({ title: "Success", description: "👋 Signed out successfully!" });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({ title: "Error", description: "❌ Failed to sign out", variant: "destructive" });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-4xl mb-4">🔄</div>
            <p className="text-lg">Loading authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const DAILY_LIMIT = 5;
  const todayIso = new Date().toISOString().slice(0, 10);
  const lastDateIso = (profile?.last_generation_date || '').slice(0, 10);
  const generationCount = lastDateIso === todayIso ? (profile?.generation_count_today || 0) : 0;
  const remainingGenerations = DAILY_LIMIT - generationCount;
  const isGenerateDisabled = loading || (mode === 'topic' && !selectedTopic) || subjectsLoading || remainingGenerations <= 0;

  if (showDashboard) {
    return <Dashboard onNavigateToGenerator={() => setShowDashboard(false)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      {/* Header */}
      <Card className="max-w-4xl mx-auto mb-6">
        <CardHeader className="text-center">
          <div className="w-full rounded-xl p-4 bg-card border shadow-sm">
            <div className="relative flex items-center justify-center gap-4">
              <CardTitle className="bg-gradient-to-r from-orange-700 via-orange-500 to-orange-700 bg-200% animate-gradient bg-clip-text text-transparent text-center relative text-5xl sm:text-6xl font-extrabold tracking-wide">
                IntrepidQ
              </CardTitle>
              <div className="absolute right-0 flex gap-2 items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-gradient-to-r from-orange-200 to-orange-300 hover:from-orange-300 hover:to-orange-400 text-orange-900 h-10 px-4 border border-orange-300">
                      📋 MENU
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowDashboard(true)}>
                      📊 Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      👤 Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      🚪 Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <p className="text-lg md:text-xl text-muted-foreground text-center font-serif italic">
            AI-RAG Powered Agent for Civil Services Mains Examination
          </p>
          <p className="text-lg">
            Welcome back, <strong>{user.user_metadata?.full_name || user.email}</strong>!
          </p>
        </CardHeader>
      </Card>


      {/* Main Content */}
      <Card className="max-w-4xl mx-auto mb-6 shadow-lg border border-gray-200">
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left Config Section */}
            <div className="lg:col-span-1 bg-orange-50 rounded-xl p-6 border border-orange-100 shadow-inner">
              <h3 className="mb-6 text-xl font-bold text-orange-900 border-b pb-2 border-orange-200">
                ⚙️ Configuration
              </h3>

              {/* Mode Selection */}
              <div className="mb-6">
                <Label className="block mb-2 font-bold text-orange-800">🎯 Mode:</Label>
                <Select value={mode} onValueChange={(value) => setMode(value as 'topic' | 'paper')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="topic">📚 Topic-wise</SelectItem>
                    <SelectItem value="paper">📄 Whole Paper</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Selection */}
              <div className="mb-6">
                <Label className="block mb-2 font-bold text-orange-800">📚 Subject:</Label>
                <Select
                  value={selectedSubject}
                  onValueChange={(value) => handleSubjectChange(value)}
                  disabled={subjectsLoading}
                >
                  <SelectTrigger className={selectedSubject ? "border-green-500" : ""}>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GS1">📚 GS Paper 1 ({subjects.GS1?.topics?.length || 0} topics)</SelectItem>
                    <SelectItem value="GS2">🏛️ GS Paper 2 ({subjects.GS2?.topics?.length || 0} topics)</SelectItem>
                    <SelectItem value="GS3">🔬 GS Paper 3 ({subjects.GS3?.topics?.length || 0} topics)</SelectItem>
                    <SelectItem value="GS4">⚖️ GS Paper 4 ({subjects.GS4?.topics?.length || 0} topics)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Topic Selection */}
              {mode === 'topic' && (
                <div className="mb-6">
                  <Label className="block mb-2 font-bold text-orange-800">📖 Topic:</Label>
                  <TopicCombobox
                    items={subjects[selectedSubject]?.topics || []}
                    value={selectedTopic}
                    onChange={setSelectedTopic}
                    placeholder={subjectsLoading ? 'Loading topics...' : `Select a topic from ${selectedSubject}`}
                    disabled={subjectsLoading || !subjects[selectedSubject]?.topics?.length}
                  />
                  {selectedTopic && (
                    <p className="text-xs text-green-700 mt-2 p-2 bg-green-50 rounded border border-green-500">
                      ✅ Selected: {selectedTopic}
                    </p>
                  )}
                </div>
              )}

              {/* Number of Questions */}
              {mode === 'topic' && (
                <div className="mb-6">
                  <Label className="block mb-2 font-bold text-orange-800">
                    🔢 Number of Questions: <span className="text-blue-600">{numQuestions}</span>
                  </Label>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[numQuestions]}
                    onValueChange={(value) => setNumQuestions(value[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>
              )}

              {/* Current Affairs */}
              <div
                className={`mb-6 flex items-center p-3 rounded-lg border cursor-pointer transition-all ${useCurrentAffairs ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'
                  }`}
              >
                <Checkbox
                  checked={useCurrentAffairs}
                  onCheckedChange={(checked) => setUseCurrentAffairs(checked as boolean)}
                  className="mr-3 h-5 w-5"
                />
                <div>
                  <div className="font-bold text-gray-800">📰 Include Current Affairs (Last 6 months)</div>
                  {useCurrentAffairs && (
                    <div className="text-xs text-orange-700 mt-1 italic">
                      ⚡ Enhanced with recent developments
                    </div>
                  )}
                </div>
              </div>

              {/* Model Selection */}
              <div className="mb-6">
                <Label className="block mb-2 font-bold text-orange-800">🧠 Model:</Label>
                <Select
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  disabled={Object.keys(availableModels).length === 0}
                >
                  <SelectTrigger className={selectedModel ? "border-green-500" : ""}>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(availableModels).map(([key, model]) => (
                      <SelectItem key={key} value={key}>
                        {key} ({model.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                className="w-full text-lg py-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
                disabled={isGenerateDisabled}
                onClick={handleGenerateQuestions}
              >
                {loading ? '🔄 Generating...' : subjectsLoading ? '⏳ Loading...' : `🚀 Generate`}
              </Button>
            </div>

            {/* Right Chat Section */}
            <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200 shadow-inner flex flex-col">
              <h3 className="mb-6 text-xl font-bold text-gray-900 border-b pb-2 border-gray-300">
                💬 Chat
              </h3>
              <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {chatHistory.length > 0 ? (
                  chatHistory.map((message, index) => (
                    <div key={index} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`rounded-lg px-4 py-2 ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                        {typeof message.content === 'string' ? (
                          <p>{message.content}</p>
                        ) : (
                          <div>
                            {message.content.map((q, qIndex) => (
                              <QuestionDisplay
                                key={q.id || qIndex}
                                question={q}
                                answer={answers[qIndex]}
                                index={qIndex}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <p>Welcome to the new chat interface!</p>
                    <p>Configure your settings and generate questions to start the conversation.</p>
                  </div>
                )}
              </div>
              <div className="mt-4">
                {/* Input for chat will go here */}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="text-center py-6 text-gray-600">
          <p>© 2025 IntrepidQ. Built with ♥.</p>
        </CardContent>
      </Card>
    </div>
  );
}
