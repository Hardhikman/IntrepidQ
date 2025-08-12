"use client";
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AuthForm from '@/components/AuthForm'
import { useToast } from "@/hooks/use-toast"
import { supabase } from '@/lib/supabase'
// Removed unused feedback icons

// Shadcn components
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { TopicCombobox } from "@/components/combobox"
import { TypographyH2, TypographyLarge, TypographyList } from "@/components/ui/typography"
// import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { GeneratedQuestion } from '@/lib/supabase'
import { QuestionDisplay } from '@/components/QuestionDisplay'
import { Dashboard } from '@/components/Dashboard'


interface Subject {
  name: string
  topics: string[]
}

export default function UPSCQuestionGenerator() {
  const { user, profile, loading: authLoading, signOut, refreshProfile, applyLocalGenerationIncrement } = useAuth()
  const { toast } = useToast()
  
  const [showDashboard, setShowDashboard] = useState(false);
  const [subjects, setSubjects] = useState<Record<string, Subject>>({})
  const [selectedSubject, setSelectedSubject] = useState<string>('GS1')
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  // combobox popover is managed internally
  const [numQuestions, setNumQuestions] = useState<number>(5)
  const [useCurrentAffairs, setUseCurrentAffairs] = useState<boolean>(false)
  const [mode, setMode] = useState<'topic' | 'paper'>('topic')
  const [loading, setLoading] = useState<boolean>(false)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
    const [answers, setAnswers] = useState<Record<number, any>>({})
    const [generatingAllAnswers, setGeneratingAllAnswers] = useState<boolean>(false)
    const [subjectsLoading, setSubjectsLoading] = useState<boolean>(true)
    // Removed per site-wide floating feedback


  useEffect(() => {
    fetchSubjects()
  }, [])

  // Fallback polling: while generating questions or answers, refresh profile every ~2.5s
  useEffect(() => {
    const shouldPoll = loading || generatingAllAnswers
    if (!shouldPoll) return

    const id = window.setInterval(() => {
      refreshProfile?.()
    }, 2500)

    return () => window.clearInterval(id)
  }, [loading, generatingAllAnswers, refreshProfile])

  const fetchSubjects = async () => {
    setSubjectsLoading(true) // Start loading
    try {
      console.log('Fetching subjects...')
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";
      const response = await fetch(`${baseUrl}/api/subjects`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.subjects || Object.keys(data.subjects).length === 0) {
        throw new Error('No subjects data received from server')
      }
      
      setSubjects(data.subjects)
      console.log('Subjects loaded:', Object.keys(data.subjects).length)
      
      // Auto-select first topic when subjects load
      if (data.subjects?.GS1?.topics?.length > 0) {
        setSelectedTopic(data.subjects.GS1.topics[0])
        console.log('Auto-selected first topic:', data.subjects.GS1.topics[0])
      }
      
      toast({ title: "Success", description: `✅ Loaded ${Object.keys(data.subjects).length} subjects successfully` })
      
    } catch (error: any) {
      console.error('Error fetching subjects:', error)
      toast({ title: "Error", description: `❌ Failed to load subjects: ${error.message}`, variant: "destructive" })
    } finally {
      setSubjectsLoading(false) // End loading
    }
  }

  const handleSubjectChange = (newSubject: string) => {
    console.log('Subject changed to:', newSubject)
    setSelectedSubject(newSubject)
    // Auto-select first topic of new subject
    if (subjects[newSubject]?.topics?.length > 0) {
      const firstTopic = subjects[newSubject].topics[0]
      setSelectedTopic(firstTopic)
      console.log('Auto-selected topic for', newSubject, ':', firstTopic)
    } else {
      setSelectedTopic('')
      console.log('No topics available for', newSubject)
    }
  }

  const handleGenerateQuestions = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    console.log('Generate button clicked!', { 
      mode, 
      selectedTopic: selectedTopic.substring(0, 50) + '...', 
      selectedSubject,
      useCurrentAffairs,
      numQuestions 
    })
    
    if (mode === 'topic' && !selectedTopic) {
      toast({ title: "Warning", description: '⚠️ Please select a topic first', variant: "destructive" })
      return
    }

    // Reset previous results before a new generation
    setQuestions([])
    setAnswers({})
    setLoading(true)
    const startTime = Date.now()
    
    try {
      const endpoint = mode === 'paper' ? '/api/generate_whole_paper' : '/api/generate_questions'
      const payload = mode === 'paper' 
        ? {
            subject: selectedSubject,
            use_ca: useCurrentAffairs,
            months: 6
          }
        : {
            topic: selectedTopic,
            num: numQuestions,
            use_ca: useCurrentAffairs,
            months: 6
          }

      console.log('API Request:', { endpoint, payload })
      
      toast({ title: "Generating", description: '🤖 AI is generating questions...' })

      const sessionResponse = await supabase.auth.getSession()
      const token = sessionResponse.data.session?.access_token
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        if (response.status === 429) {
          toast({ title: "Error", description: "You have reached your daily generation limit.", variant: "destructive" });
          return;
        }
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.detail || errorMessage
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions generated - empty response')
      }
      
      setQuestions(data.questions)
      
      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(1)
      
      const successMessage = `✅ Generated ${mode === 'paper' ? 'whole paper (10 questions)' : `${numQuestions} questions`} in ${duration}s${useCurrentAffairs ? ' with current affairs' : ''}!`
      toast({ title: "Success", description: successMessage })
      
      console.log('Questions generated successfully:', {
        mode,
        questionCount: data.question_count || numQuestions,
        duration: `${duration}s`,
        hasCurrentAffairs: useCurrentAffairs
      })
      
    } catch (error: any) {
      console.error('Error generating questions:', error)
      const errorMessage = error.message || 'Unknown error occurred'
      toast({ title: "Error", description: `❌ Generation failed: ${errorMessage}`, variant: "destructive" })
    } finally {
      setLoading(false)
      // Optimistic update for the daily counter (count 1 per generation)
      applyLocalGenerationIncrement?.(1)
      // Refresh user profile to update daily generation counters
      refreshProfile?.()
    }
  }

  const handleSignOut = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    console.log('Sign out button clicked!')
    
    try {
      await signOut()
      
      // Use standard toast instead of custom DOM manipulation
      toast({
        title: "Success",
        description: "👋 Signed out successfully!"
      });
      
    } catch (error) {
      console.error('Sign out error:', error)
      
      // Use standard toast for errors
      toast({
        title: "Error",
        description: "❌ Failed to sign out",
        variant: "destructive"
      });
    }
  }


  const handleGenerateAllAnswers = async () => {
      if (questions.length === 0) return
      setGeneratingAllAnswers(true)
      toast({ title: 'Generating Answers', description: 'Generating answers for all questions...' })
      try {
        const questionList = questions.map(q => q.questions);
  
        const sessionResponse = await supabase.auth.getSession()
        const token = sessionResponse.data.session?.access_token
        const response = await fetch('/api/generate_answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ questions: questionList })
        })
        if (!response.ok) {
          throw new Error('Failed to generate answers')
        }
        const data = await response.json()
        const newAnswers: Record<number, any> = {}
        ;(data.answers || []).forEach((ans: any, idx: number) => {
          newAnswers[idx] = ans
        })
        setAnswers(newAnswers)
        toast({ title: 'Success', description: 'Generated answers for all questions!' })
      } catch (error) {
        console.error('Error generating answers:', error)
        toast({ title: 'Error', description: 'Failed to generate answers for all questions.', variant: 'destructive' })
      } finally {
        setGeneratingAllAnswers(false)
        // Optimistic update for the daily counter (count 1 per answers batch)
        applyLocalGenerationIncrement?.(1)
        // Refresh profile to update the daily counter after answers generation
        refreshProfile?.()
      }
    }
  
    // Generation-level feedback moved to global floating feedback button

  // Loading state for authentication
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
    )
  }

  // Show auth form if not logged in
  if (!user) {
    return <AuthForm />
  }

  const DAILY_LIMIT = 5
  const todayIso = new Date().toISOString().slice(0, 10)
  const lastDateIso = (profile?.last_generation_date || '').slice(0, 10)
  const generationCount = lastDateIso === todayIso ? (profile?.generation_count_today || 0) : 0
  const remainingGenerations = DAILY_LIMIT - generationCount
  const isGenerateDisabled = loading || (mode === 'topic' && !selectedTopic) || subjectsLoading || remainingGenerations <= 0;
  const totalTopics = Object.values(subjects).reduce((total, subject) => total + subject.topics.length, 0)

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
                            <DropdownMenuItem onClick={() => window.location.assign('/profile')}>
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

{/* Intro Section - Centered Layout */}
<Card className="max-w-4xl mx-auto mb-6 bg-orange-50/60 border-orange-100">
  <CardContent className="p-4 sm:p-6 md:p-10 text-center">
    
    {/* Heading */}
    <TypographyH2 />

    {/* Subheading */}
    <div className="mt-6">
      <TypographyLarge />
    </div>

    {/* List Box */}
    <div className="mt-4 rounded-lg border border-orange-200 bg-white/80 p-4 lg:p-6 lg:border-l-4 lg:border-l-orange-300 inline-block text-left">
      <TypographyList />
    </div>

  </CardContent>
</Card>


    {/* Mode Selection */}
<Card className="max-w-4xl mx-auto mb-6 border-2 border-orange-200 shadow-sm">
  <CardContent className="text-center py-8 bg-gradient-to-b from-orange-50 to-orange-100 rounded-lg">
    <h3 className="text-2xl font-bold mb-6 text-orange-800 tracking-wide">
      🎯 Select Question Generation Mode
    </h3>
    <div className="flex flex-wrap justify-center gap-6">
      <Button
        variant={mode === 'topic' ? "default" : "outline"}
        className={cn(
          "px-6 py-4 rounded-xl font-semibold transition-all shadow-md",
          mode === 'topic'
            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg"
            : "border-orange-400 text-orange-700 hover:bg-orange-50"
        )}
        onClick={(e) => {
          e.preventDefault();
          setMode('topic');
          toast({ title: "Mode Switched", description: '📚 Topic-wise mode enabled' });
        }}
      >
        📚 Topic-wise
      </Button>

      <Button
        variant={mode === 'paper' ? "default" : "outline"}
        className={cn(
          "px-6 py-4 rounded-xl font-semibold transition-all shadow-md",
          mode === 'paper'
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg"
            : "border-blue-400 text-blue-700 hover:bg-blue-50"
        )}
        onClick={(e) => {
          e.preventDefault();
          setMode('paper');
          toast({ title: "Mode Switched", description: '📄 Whole Paper mode enabled' });
        }}
      >
        📄 Whole Paper
      </Button>
    </div>

    {mode === 'paper' && (
      <div className="mt-6 p-4 bg-blue-100 rounded-lg border border-blue-300 shadow-inner">
        <p className="m-0 text-blue-800 font-semibold">
          📋 Whole Paper Mode: 10 questions | 10 marks each | 1 Hour | Total: 100 Marks
        </p>
      </div>
    )}
  </CardContent>
</Card>

{/* Main Content */}
<Card className="max-w-4xl mx-auto mb-6 shadow-lg border border-gray-200">
  <CardContent>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Left Config Section */}
      <div className="bg-orange-50 rounded-xl p-6 border border-orange-100 shadow-inner">
        <h3 className="mb-6 text-xl font-bold text-orange-900 border-b pb-2 border-orange-200">
          ⚙️ Configuration
        </h3>

        {/* Subject Selection */}
        <div className="mb-6">
          <Label className="block mb-2 font-bold text-orange-800">
            📚 Subject:
          </Label>
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
          className={`mb-6 flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
            useCurrentAffairs ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'
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

        {/* Generate Button */}
        <Button
          className="w-full text-lg py-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
          disabled={isGenerateDisabled}
          onClick={handleGenerateQuestions}
        >
          {loading ? '🔄 Generating...' : subjectsLoading ? '⏳ Loading...' : `🚀 Generate`}
        </Button>
      </div>

      {/* Right Results Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-inner">
        <h3 className="mb-6 text-xl font-bold text-gray-900 border-b pb-2 border-gray-300">
          📄 Generated Questions
        </h3>

        {questions.length > 0 ? (
          <div>
            <Button
              className="w-full mb-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
              onClick={handleGenerateAllAnswers}
              disabled={generatingAllAnswers}
            >
              {generatingAllAnswers ? 'Generating Answers...' : 'Generate Answers for All'}
            </Button>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              {questions.map((question, index) => (
                <QuestionDisplay
                  key={question.id || index}
                  question={question}
                  answer={answers[index]}
                  index={index}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
            {loading
              ? "Generating..."
              : subjectsLoading
              ? "Loading subjects..."
              : "Configure settings and generate questions"}
          </div>
        )}
      </div>
    </div>
  </CardContent>
</Card>


      {/* Footer */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="text-center py-6 text-gray-600">
          <p>© 2025 IntrepidQ. Built with ♥ .</p>
        </CardContent>
      </Card>
    </div>
  )
}
