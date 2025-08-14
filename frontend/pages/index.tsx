"use client";
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

// --- MOCKED DEPENDENCIES ---
// The following components and hooks are placeholders to make this file self-contained.
// You should replace them with your actual project's components and logic.

const useAuth = () => ({
  user: { email: 'test@example.com', user_metadata: { full_name: 'Test User' } },
  profile: {},
  loading: false,
  signOut: async () => alert('Signed out!'),
  refreshProfile: () => console.log('Refreshing profile...'),
  applyLocalGenerationIncrement: () => console.log('Incrementing generation count...'),
});

const AuthForm = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
    <div className="p-8 border border-slate-700 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Sign In</h2>
      <p>Authentication form would appear here.</p>
    </div>
  </div>
);

const Dashboard = ({ onNavigateToGenerator }: { onNavigateToGenerator: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
    <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
    <p className="text-slate-400 mb-6">User statistics and history would be displayed here.</p>
    <Button onClick={onNavigateToGenerator} variant="outline" className="bg-slate-800 border-slate-700">Back to Generator</Button>
  </div>
);

const QuestionDisplay = ({ question, index }: { question: any, index: number }) => (
    <div className="p-4 mb-2 border-b border-slate-700/50">
        <p className="text-slate-300">{index + 1}. {question.questions}</p>
    </div>
);

const TopicCombobox = ({ items, value, onChange, placeholder, disabled }: any) => (
    <Select onValueChange={onChange} value={value} disabled={disabled}>
        <SelectTrigger className="w-full bg-transparent border-none text-white focus:ring-0 text-base">
            <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 text-white border-slate-700">
            {items.map((item: string) => (
                <SelectItem key={item} value={item}>{item.split(' - ').pop()}</SelectItem>
            ))}
        </SelectContent>
    </Select>
);

// SVG Icon for the generate button
const GenerateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
);

// --- MAIN COMPONENT ---

interface Subject {
  name: string
  topics: string[]
}

export default function UPSCQuestionGenerator() {
  const { user, loading: authLoading, signOut, refreshProfile, applyLocalGenerationIncrement } = useAuth()
  const { toast } = useToast()

  const [showDashboard, setShowDashboard] = useState(false);
  const [subjects, setSubjects] = useState<Record<string, Subject>>({})
  const [selectedSubject, setSelectedSubject] = useState<string>('GS2')
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [numQuestions, setNumQuestions] = useState<number>(5)
  const [useCurrentAffairs, setUseCurrentAffairs] = useState<boolean>(false)
  const [mode, setMode] = useState<'topic' | 'paper'>('topic')
  const [loading, setLoading] = useState<boolean>(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(true)
  const [selectedModel, setSelectedModel] = useState("llama3-70b");

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    setSubjectsLoading(true)
    try {
      // In a real app, this URL would come from an env variable
      const response = await fetch(`/api/subjects`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

      const data = await response.json()
      if (!data.subjects || Object.keys(data.subjects).length === 0) throw new Error('No subjects data received')

      setSubjects(data.subjects)

      if (data.subjects?.GS2?.topics?.length > 0) {
        setSelectedTopic(data.subjects.GS2.topics[0])
      }
    } catch (error: any) {
      console.error('Error fetching subjects:', error)
      toast({ title: "Error", description: `Could not load subjects. Using mock data.`, variant: "destructive" })
      // Fallback to mock data if API fails
      setSubjects({
          "GS1": { name: "GS1", topics: ["GS1 - Topic A", "GS1 - Topic B"] },
          "GS2": { name: "GS2", topics: ["GS2 - Indian Polity", "GS2 - Governance"] },
          "GS3": { name: "GS3", topics: ["GS3 - Economy", "GS3 - Environment"] },
          "GS4": { name: "GS4", topics: ["GS4 - Ethics", "GS4 - Integrity"] },
      });
      setSelectedTopic("GS2 - Indian Polity");
    } finally {
      setSubjectsLoading(false)
    }
  }

  const handleSubjectChange = (newSubject: string) => {
    setSelectedSubject(newSubject)
    if (subjects[newSubject]?.topics?.length > 0) {
      setSelectedTopic(subjects[newSubject].topics[0])
    } else {
      setSelectedTopic('')
    }
  }

  const handleGenerateQuestions = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (mode === 'topic' && !selectedTopic) {
      toast({ title: "Warning", description: 'Please select a topic first', variant: "destructive" })
      return
    }

    setQuestions([])
    setLoading(true)

    try {
      const endpoint = mode === 'paper' ? '/api/generate_whole_paper' : '/api/generate_questions'
      const payload = mode === 'paper'
        ? { subject: selectedSubject, use_ca: useCurrentAffairs, months: 6, model: selectedModel }
        : { topic: selectedTopic, num: numQuestions, use_ca: useCurrentAffairs, months: 6, model: selectedModel }

      toast({ title: "Generating", description: `Using ${selectedModel} model...` })

      // MOCK API CALL FOR DEMONSTRATION - This part is functionally correct for the backend.
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
      const mockQuestions = Array.from({ length: mode === 'paper' ? 10 : numQuestions }, (_, i) => ({
          id: `q${i}`,
          questions: `This is a mock question #${i + 1} for the topic "${selectedTopic.split(' - ').pop()}" using the ${selectedModel} model.`
      }));
      setQuestions(mockQuestions);
      toast({ title: "Success", description: `Generated ${mockQuestions.length} questions!` })

    } catch (error: any) {
      console.error('Error generating questions:', error)
      toast({ title: "Error", description: `Generation failed: ${error.message}`, variant: "destructive" })
    } finally {
      setLoading(false)
      applyLocalGenerationIncrement()
      refreshProfile()
    }
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-white">Loading authentication...</p></div>
  }

  if (!user) {
    return <AuthForm />
  }

  if (showDashboard) {
    return <Dashboard onNavigateToGenerator={() => setShowDashboard(false)} />;
  }

  const isGenerateDisabled = loading || (mode === 'topic' && !selectedTopic) || subjectsLoading;

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-200 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 text-white border-slate-700">
                <DropdownMenuLabel>{user.user_metadata?.full_name || user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700"/>
                <DropdownMenuItem onClick={() => setShowDashboard(true)}>📊 Dashboard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.assign('/profile')}>👤 Profile</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700"/>
                <DropdownMenuItem onClick={signOut}>🚪 Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full max-w-4xl">
        {questions.length === 0 && !loading && (
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
              What do you want to explore?
            </h1>
            <p className="text-lg text-slate-400 mt-2">AI-Powered Agent for Civil Services Mains Examination</p>
          </div>
        )}

        {/* --- Generator Bar --- */}
        <div className="relative flex items-center w-full bg-slate-800/80 border border-slate-700 rounded-full p-2.5 shadow-lg space-x-2 mb-4">
          <Select onValueChange={handleSubjectChange} value={selectedSubject}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white rounded-full focus:ring-2 focus:ring-orange-500 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 text-white border-slate-700">
              <SelectItem value="GS1">GS1</SelectItem>
              <SelectItem value="GS2">GS2</SelectItem>
              <SelectItem value="GS3">GS3</SelectItem>
              <SelectItem value="GS4">GS4</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-grow">
             <TopicCombobox
                items={subjects[selectedSubject]?.topics || []}
                value={selectedTopic}
                onChange={setSelectedTopic}
                placeholder={subjectsLoading ? 'Loading...' : `Select a topic...`}
                disabled={subjectsLoading || mode === 'paper'}
             />
          </div>

          <Select onValueChange={setSelectedModel} value={selectedModel}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white rounded-full focus:ring-2 focus:ring-orange-500 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 text-white border-slate-700">
              <SelectItem value="llama3-70b">Llama 3 (70B)</SelectItem>
              <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
              <SelectItem value="llama3-8b">Llama 3 (8B)</SelectItem>
              <SelectItem value="mixtral-8x7b">Mixtral (8x7B)</SelectItem>
              <SelectItem value="gemma2-9b">Gemma 2 (9B)</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleGenerateQuestions} disabled={isGenerateDisabled} className="bg-orange-500 hover:bg-orange-600 rounded-full p-3 h-auto text-white">
            <GenerateIcon />
          </Button>
        </div>

        {/* --- Additional Options --- */}
        <div className="flex justify-center items-center gap-6 mb-8 text-sm">
            <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setMode('topic')} variant={mode === 'topic' ? 'secondary' : 'ghost'} className="rounded-full data-[state=active]:bg-slate-700">Topic-wise</Button>
                <Button size="sm" onClick={() => setMode('paper')} variant={mode === 'paper' ? 'secondary' : 'ghost'} className="rounded-full data-[state=active]:bg-slate-700">Whole Paper</Button>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="current-affairs" checked={useCurrentAffairs} onCheckedChange={(c) => setUseCurrentAffairs(c as boolean)} className="data-[state=checked]:bg-orange-500 border-slate-600" />
                <Label htmlFor="current-affairs">Include Current Affairs</Label>
            </div>
             {mode === 'topic' && (
                <div className="flex items-center gap-2 w-40">
                    <Label>Count: {numQuestions}</Label>
                    <Slider value={[numQuestions]} onValueChange={(v) => setNumQuestions(v[0])} min={1} max={10} step={1} />
                </div>
             )}
        </div>

        {/* --- Results Display --- */}
        <div className="mt-12">
          {loading && (
            <div className="text-center text-slate-400">
              <p>Generating questions based on your selection...</p>
            </div>
          )}
          {questions.length > 0 && (
            <div className="space-y-4 bg-slate-800/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white">Generated Questions:</h3>
              <div className="max-h-[60vh] overflow-y-auto pr-2">
                {questions.map((question, index) => (
                  <QuestionDisplay
                    key={question.id || index}
                    question={question}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
