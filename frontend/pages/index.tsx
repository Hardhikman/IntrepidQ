"use client";
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AuthForm from '@/components/AuthForm'
import { useToast } from "@/hooks/use-toast"
import { supabase } from '@/lib/supabase'

// Shadcn components
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
  const [numQuestions, setNumQuestions] = useState<number>(5)
  const [useCurrentAffairs, setUseCurrentAffairs] = useState<boolean>(false)
  const [mode, setMode] = useState<'topic' | 'paper'>('topic')
  const [loading, setLoading] = useState<boolean>(false)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [generatingAllAnswers, setGeneratingAllAnswers] = useState<boolean>(false)
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(true)


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

  const handleFeedbackSubmit = async (questionId: string, rating: number, comment: string) => {
    try {
      const sessionResponse = await supabase.auth.getSession();
      const token = sessionResponse.data.session?.access_token;

      if (!token) {
        toast({ title: "Error", description: "You must be logged in to submit feedback.", variant: "destructive" });
        return;
      }

      const response = await fetch('/api/question_feedback', {
              method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_id: questionId,
          rating,
          comment,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback.');
      }

      toast({ title: "Success", description: "Thank you for your feedback!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unknown error occurred.", variant: "destructive" });
    }
  };

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
  const generationCount = profile?.generation_count_today || 0;
  const remainingGenerations = DAILY_LIMIT - generationCount;
  const isGenerateDisabled = loading || (mode === 'topic' && !selectedTopic) || subjectsLoading || remainingGenerations <= 0;
  const totalTopics = Object.values(subjects).reduce((total, subject) => total + subject.topics.length, 0)

  if (showDashboard) {
    return <Dashboard onNavigateToGenerator={() => setShowDashboard(false)} />;
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <Card className="max-w-4xl mx-auto mb-6">
        <CardHeader className="text-center">
                  <div className="inline-block border-3 border-orange-700 rounded-xl p-4 bg-gradient-to-r from-orange-100 to-orange-200 shadow-lg">
                    <div className="flex items-center justify-center gap-4">
                      <CardTitle className="bg-gradient-to-r from-orange-700 via-orange-500 to-orange-700 bg-200% animate-gradient bg-clip-text text-transparent text-center relative text-4xl font-bold tracking-wide">
                        Introducing IntrepidQ....
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setShowDashboard(true)}
                          className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white h-10 px-4"
                        >
                          📊 Dashboard
                        </Button>
                        <Button
                          onClick={handleSignOut}
                          className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white h-10 px-4"
                        >
                          🚪 Sign Out
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xl text-gray-600 text-center font-medium bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent italic">
                    AI-RAG Powered Agent for Civil Services Mains Examination
                  </p>
                  <p className="text-lg">
                    Welcome back, <strong>{user.user_metadata?.full_name || user.email}</strong>!
                  </p>
                  <div className="my-5">
                    {subjectsLoading ? (
                      <span className="text-sm text-gray-500">📊 Loading subjects...</span>
                    ) : (
                      <div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-violet-500 transition-all duration-300"
                            style={{
                              width: `${Math.min(DAILY_LIMIT - remainingGenerations, DAILY_LIMIT) / DAILY_LIMIT * 100}%`,
                            }}
                          />
                        </div>
                        <div className="text-sm text-gray-500">
                          Daily task limit ({DAILY_LIMIT - remainingGenerations}/{DAILY_LIMIT})
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
      </Card>

      {/* Mode Selection */}
      <Card className="max-w-4xl mx-auto mb-6">
        <CardContent className="text-center py-6">
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <Button
              variant={mode === 'topic' ? "default" : "outline"}
              onClick={(e) => {
                e.preventDefault()
                console.log('Topic mode selected')
                setMode('topic')
                toast({ title: "Mode Switched", description: '📚 Switched to Topic-wise mode' })
              }}
            >
              📚 Topic-wise Questions
            </Button>
            <Button
              variant={mode === 'paper' ? "default" : "outline"}
              onClick={(e) => {
                e.preventDefault()
                console.log('Paper mode selected')
                setMode('paper')
                toast({ title: "Mode Switched", description: '📄 Switched to Whole Paper mode' })
              }}
            >
              📄 Whole GS Paper (10 Questions)
            </Button>
          </div>

          {mode === 'paper' && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-300 text-center">
              <p className="m-0 text-blue-800 font-bold">
                📋 Whole Paper Mode: Generates 10 questions (10 marks each) | 1 Hour | Total: 100 Marks
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="max-w-4xl mx-auto mb-6">
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Controls */}
            <div>
              <h3 className="mb-6 text-xl font-semibold">⚙️ Configuration</h3>
              
              {/* Subject Selection */}
              <div className="mb-6">
                <Label className="block mb-2 font-bold">
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
                    <SelectItem value="GS1">📚 General Studies Paper 1 ({subjects.GS1?.topics?.length || 0} topics)</SelectItem>
                    <SelectItem value="GS2">🏛️ General Studies Paper 2 ({subjects.GS2?.topics?.length || 0} topics)</SelectItem>
                    <SelectItem value="GS3">🔬 General Studies Paper 3 ({subjects.GS3?.topics?.length || 0} topics)</SelectItem>
                    <SelectItem value="GS4">⚖️ General Studies Paper 4 ({subjects.GS4?.topics?.length || 0} topics)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Topic Selection (only for topic mode) */}
              {mode === 'topic' && (
                <div className="mb-6">
                  <Label className="block mb-2 font-bold">
                    📖 Topic:
                  </Label>
                  <Select 
                    value={selectedTopic}
                    onValueChange={(value) => {
                      console.log('Topic changed to:', value)
                      setSelectedTopic(value)
                    }}
                    disabled={subjectsLoading || !subjects[selectedSubject]?.topics?.length}
                  >
                    <SelectTrigger className={selectedTopic ? "border-green-500" : ""}>
                      <SelectValue placeholder={subjectsLoading ? 'Loading topics...' : `Select a topic from ${selectedSubject}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects[selectedSubject]?.topics?.map((topic, index) => (
                        <SelectItem key={index} value={topic}>
                          {topic.length > 60 ? `${topic.substring(0, 60)}...` : topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTopic && (
                    <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded border border-green-500">
                      ✅ Selected: {selectedTopic}
                    </p>
                  )}
                </div>
              )}

              {/* Number of Questions (only for topic mode) */}
              {mode === 'topic' && (
                <div className="mb-6">
                  <Label className="block mb-2 font-bold">
                    🔢 Number of Questions: <span className="text-blue-500">{numQuestions}</span>
                  </Label>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[numQuestions]}
                    onValueChange={(value) => {
                      console.log('Question count changed to:', value[0])
                      setNumQuestions(value[0])
                    }}
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
              <div className="mb-6">
                <div className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                  useCurrentAffairs ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'
                }`}>
                  <Checkbox
                    checked={useCurrentAffairs}
                    onCheckedChange={(checked) => {
                      console.log('Current affairs toggled:', checked)
                      setUseCurrentAffairs(checked as boolean)
                      toast({ title: "Setting Changed", description: checked ? '📰 Current Affairs enabled' : '📚 Regular mode enabled' })
                    }}
                    className="mr-3 h-5 w-5"
                  />
                  <div>
                    <div className="font-bold">📰 Include Current Affairs (Last 6 months)</div>
                    {useCurrentAffairs && (
                      <div className="text-xs text-orange-700 mt-1 italic">
                        ⚡ Questions will be enhanced with recent developments and news
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                className="w-full text-lg py-6"
                disabled={isGenerateDisabled}
                onClick={handleGenerateQuestions}
              >
                {loading ? (
                  '🔄 Generating...'
                ) : subjectsLoading ? (
                  '⏳ Loading subjects...'
                ) : (
                  `🚀 Generate ${mode === 'topic' ? `${numQuestions} Questions` : 'Whole Paper (10 Q)'}`
                )}
              </Button>
            </div>

            {/* Results */}
            <div>
              <h3 className="mb-6 text-xl font-semibold">
                📄 Generated Questions
                {questions.length > 0 && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ({questions.length} questions)
                  </span>
                )}
              </h3>
              
              {questions.length > 0 ? (
                <div>
                  {/* Single button to generate answers for all questions */}
                  <div className="text-center mb-4">
                    <Button
                      className="w-full"
                      onClick={handleGenerateAllAnswers}
                      disabled={generatingAllAnswers}
                    >
                      {generatingAllAnswers ? 'Generating Answers...' : 'Generate Answers for All'}
                    </Button>
                  </div>

                  {/* Scrollable Q-A list */}
                  <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {questions.map((question, index) => (
                      <QuestionDisplay
                        key={question.id || index}
                        question={question}
                        answer={answers[index]}
                        index={index}
                        onFeedbackSubmit={handleFeedbackSubmit}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  {loading ? (
                    <div>
                      <div className="text-4xl mb-4">🤖</div>
                      <p className="text-lg">Generating questions using your UPSC AI system...</p>
                      <p className="text-sm text-gray-500 mt-2">This may take 10-30 seconds</p>
                    </div>
                  ) : subjectsLoading ? (
                    <div>
                      <div className="text-4xl mb-4">📚</div>
                      <p className="text-lg">Loading UPSC subjects and topics...</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-4">📝</div>
                      <p className="text-lg">Configure your settings and generate questions to see results here</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {totalTopics} topics available across {Object.keys(subjects).length} subjects
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="text-center py-6 text-gray-600">
          <p>© 2024 IntrepidQ. Built with ♥ .</p>
          <p className="mt-2 text-sm">
            🤖 AI-RAG powered tool for UPSC aspirants with current affairs integration.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
