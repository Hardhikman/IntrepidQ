import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AuthForm from '@/components/AuthForm'
import { useToast } from "@/hooks/use-toast"

// Enhanced styles with proper button interactions
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  card: {
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '30px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    marginBottom: '20px'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '30px'
  },
  title: {
    fontSize: '2.5rem',
    color: '#333',
    marginBottom: '10px'
  },
  button: {
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    margin: '5px',
    transition: 'all 0.2s ease',
    outline: 'none',
    userSelect: 'none' as const,
    display: 'inline-block',
    textAlign: 'center' as const,
    textDecoration: 'none',
    lineHeight: '1.4',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'relative' as const
  },
  buttonActive: {
    backgroundColor: '#4c51bf',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    margin: '5px',
    transition: 'all 0.2s ease',
    outline: 'none',
    userSelect: 'none' as const,
    display: 'inline-block',
    textAlign: 'center' as const,
    textDecoration: 'none',
    lineHeight: '1.4',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    position: 'relative' as const
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    color: '#666',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'not-allowed',
    fontSize: '16px',
    margin: '5px',
    outline: 'none',
    userSelect: 'none' as const,
    display: 'inline-block',
    textAlign: 'center' as const,
    textDecoration: 'none',
    lineHeight: '1.4',
    opacity: 0.6
  },
  select: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '16px',
    marginBottom: '15px',
    outline: 'none',
    backgroundColor: 'white',
    transition: 'border-color 0.2s ease',
    cursor: 'pointer'
  },
  textarea: {
    width: '100%',
    minHeight: '400px',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    fontFamily: 'monospace',
    resize: 'vertical' as const,
    outline: 'none',
    lineHeight: '1.5'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '30px',
    marginTop: '20px'
  },
  loading: {
    textAlign: 'center' as const,
    padding: '50px',
    fontSize: '18px',
    color: '#666'
  },
  // Added responsive design
  '@media (max-width: 768px)': {
    grid: {
      display: 'block'
    },
    card: {
      padding: '20px'
    }
  }
}

interface Subject {
  name: string
  topics: string[]
}

export default function UPSCQuestionGenerator() {
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const { toast } = useToast()
  
  const [subjects, setSubjects] = useState<Record<string, Subject>>({})
  const [selectedSubject, setSelectedSubject] = useState<string>('GS1')
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [numQuestions, setNumQuestions] = useState<number>(5)
  const [useCurrentAffairs, setUseCurrentAffairs] = useState<boolean>(false)
  const [mode, setMode] = useState<'topic' | 'paper'>('topic')
  const [loading, setLoading] = useState<boolean>(false)
  const [questions, setQuestions] = useState<string>('')
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [generatingAnswers, setGeneratingAnswers] = useState<Record<number, boolean>>({})
  const [buttonHover, setButtonHover] = useState<string | null>(null)
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(true) // Added state

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    setSubjectsLoading(true) // Start loading
    try {
      console.log('Fetching subjects...')
      const response = await fetch('/api/subjects')
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

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      
      if (!data.result) {
        throw new Error('No questions generated - empty response')
      }
      
      setQuestions(data.result)
      
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
    }
  }

  const handleSignOut = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    console.log('Sign out button clicked!')
    
    try {
      toast({ title: "Signing out", description: "Please wait..." })
      await signOut()
      toast({ title: "Success", description: '👋 Signed out successfully!' })
    } catch (error) {
      console.error('Sign out error:', error)
      toast({ title: "Error", description: '❌ Failed to sign out', variant: "destructive" })
    }
  }

  const handleGenerateAnswer = async (question: string, index: number) => {
    setGeneratingAnswers((prev) => ({ ...prev, [index]: true }));
    toast({ title: "Generating Answer", description: "Please wait..." });
    try {
      const response = await fetch('/api/generate_answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate answer');
      }
      const data = await response.json();
      setAnswers((prev) => ({ ...prev, [index]: data }));
      toast({ title: "Success", description: `Answer generated for question ${index + 1}!` });
    } catch (error) {
      console.error('Error generating answer:', error);
      toast({ title: "Error", description: `Failed to generate answer for question ${index + 1}.`, variant: "destructive" });
    } finally {
      setGeneratingAnswers((prev) => ({ ...prev, [index]: false }));
    }
  };

  // Loading state for authentication
  if (authLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={{ fontSize: '2rem', marginBottom: '20px' }}>🔄</div>
          <p>Loading authentication...</p>
        </div>
      </div>
    )
  }

  // Show auth form if not logged in
  if (!user) {
    return <AuthForm />
  }

  const generationCount = profile?.generation_count_today || 0;
  const remainingGenerations = 3 - generationCount;
  const isGenerateDisabled = loading || (mode === 'topic' && !selectedTopic) || subjectsLoading || remainingGenerations <= 0;
  const totalTopics = Object.values(subjects).reduce((total, subject) => total + subject.topics.length, 0)

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎓 UPSC Question Generator</h1>
          <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '10px' }}>
            Welcome back, <strong>{user.user_metadata?.full_name || user.email}</strong>!
          </p>
          <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '20px' }}>
            {subjectsLoading ? (
              <span>📊 Loading subjects...</span>
            ) : (
              <span>📊 {Object.keys(subjects).length} subjects loaded with {totalTopics} topics. Generations left today: {remainingGenerations}</span>
            )}
          </p>
          <button 
            type="button"
            style={{
              ...styles.button,
              backgroundColor: buttonHover === 'signout' ? '#5a67d8' : '#667eea',
              transform: buttonHover === 'signout' ? 'translateY(-1px)' : 'none',
              boxShadow: buttonHover === 'signout' ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={() => setButtonHover('signout')}
            onMouseLeave={() => setButtonHover(null)}
            onClick={handleSignOut}
          >
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Mode Selection */}
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button
            type="button"
            style={mode === 'topic' ? styles.buttonActive : {
              ...styles.button,
              backgroundColor: buttonHover === 'topic' ? '#5a67d8' : '#667eea',
              transform: buttonHover === 'topic' ? 'translateY(-1px)' : 'none'
            }}
            onMouseEnter={() => setButtonHover('topic')}
            onMouseLeave={() => setButtonHover(null)}
            onClick={(e) => {
              e.preventDefault()
              console.log('Topic mode selected')
              setMode('topic')
              toast({ title: "Mode Switched", description: '📚 Switched to Topic-wise mode' })
            }}
          >
            📚 Topic-wise Questions
          </button>
          <button
            type="button"
            style={mode === 'paper' ? styles.buttonActive : {
              ...styles.button,
              backgroundColor: buttonHover === 'paper' ? '#5a67d8' : '#667eea',
              transform: buttonHover === 'paper' ? 'translateY(-1px)' : 'none'
            }}
            onMouseEnter={() => setButtonHover('paper')}
            onMouseLeave={() => setButtonHover(null)}
            onClick={(e) => {
              e.preventDefault()
              console.log('Paper mode selected')
              setMode('paper')
              toast({ title: "Mode Switched", description: '📄 Switched to Whole Paper mode' })
            }}
          >
            📄 Whole Paper (10 Questions)
          </button>
        </div>

        {mode === 'paper' && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '8px', 
            border: '1px solid #2196f3',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#1976d2', fontWeight: 'bold' }}>
              📋 Whole Paper Mode: Generates 10 questions (25 marks each) | 3 Hours | Total: 250 Marks
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={styles.card}>
        <div style={window.innerWidth <= 768 ? { display: 'block' } : styles.grid}>
          {/* Controls */}
          <div>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>⚙️ Configuration</h3>
            
            {/* Subject Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                📚 Subject:
              </label>
              <select 
                style={{
                  ...styles.select,
                  borderColor: selectedSubject ? '#4CAF50' : '#ddd'
                }}
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                disabled={subjectsLoading}
              >
                <option value="GS1">📚 General Studies Paper 1 ({subjects.GS1?.topics?.length || 0} topics)</option>
                <option value="GS2">🏛️ General Studies Paper 2 ({subjects.GS2?.topics?.length || 0} topics)</option>
                <option value="GS3">🔬 General Studies Paper 3 ({subjects.GS3?.topics?.length || 0} topics)</option>
                <option value="GS4">⚖️ General Studies Paper 4 ({subjects.GS4?.topics?.length || 0} topics)</option>
              </select>
            </div>

            {/* Topic Selection (only for topic mode) */}
            {mode === 'topic' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  📖 Topic:
                </label>
                <select 
                  style={{
                    ...styles.select,
                    borderColor: selectedTopic ? '#4CAF50' : '#ddd'
                  }}
                  value={selectedTopic}
                  onChange={(e) => {
                    console.log('Topic changed to:', e.target.value)
                    setSelectedTopic(e.target.value)
                  }}
                  disabled={subjectsLoading || !subjects[selectedSubject]?.topics?.length}
                >
                  <option value="">
                    {subjectsLoading ? 'Loading topics...' : `Select a topic from ${selectedSubject}`}
                  </option>
                  {subjects[selectedSubject]?.topics?.map((topic, index) => (
                    <option key={index} value={topic}>
                      {topic.length > 60 ? `${topic.substring(0, 60)}...` : topic}
                    </option>
                  ))}
                </select>
                {selectedTopic && (
                  <p style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    margin: '5px 0',
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    border: '1px solid #4CAF50'
                  }}>
                    ✅ Selected: {selectedTopic}
                  </p>
                )}
              </div>
            )}

            {/* Number of Questions (only for topic mode) */}
            {mode === 'topic' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  🔢 Number of Questions: <span style={{ color: '#667eea' }}>{numQuestions}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={numQuestions}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    console.log('Question count changed to:', value)
                    setNumQuestions(value)
                  }}
                  style={{ 
                    width: '100%',
                    accentColor: '#667eea'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                  <span>1</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>
            )}

            {/* Current Affairs */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                padding: '10px',
                backgroundColor: useCurrentAffairs ? '#e8f5e8' : '#f9f9f9',
                borderRadius: '6px',
                border: `1px solid ${useCurrentAffairs ? '#4CAF50' : '#ddd'}`,
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={useCurrentAffairs}
                  onChange={(e) => {
                    console.log('Current affairs toggled:', e.target.checked)
                    setUseCurrentAffairs(e.target.checked)
                    toast({ title: "Setting Changed", description: e.target.checked ? '📰 Current Affairs enabled' : '📚 Regular mode enabled' })
                  }}
                  style={{ 
                    marginRight: '12px',
                    transform: 'scale(1.2)',
                    accentColor: '#667eea'
                  }}
                />
                <div>
                  <div style={{ fontWeight: 'bold' }}>📰 Include Current Affairs (Last 6 months)</div>
                  {useCurrentAffairs && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#e65100', 
                      marginTop: '4px',
                      fontStyle: 'italic'
                    }}>
                      ⚡ Questions will be enhanced with recent developments and news
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              style={{
                ...(isGenerateDisabled ? styles.buttonDisabled : styles.button),
                width: '100%',
                fontSize: '18px',
                padding: '15px',
                backgroundColor: isGenerateDisabled ? '#ccc' : 
                                buttonHover === 'generate' ? '#5a67d8' : '#667eea',
                transform: buttonHover === 'generate' && !isGenerateDisabled ? 'translateY(-2px)' : 'none',
                boxShadow: buttonHover === 'generate' && !isGenerateDisabled ? 
                          '0 8px 20px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={() => !isGenerateDisabled && setButtonHover('generate')}
              onMouseLeave={() => setButtonHover(null)}
              onClick={handleGenerateQuestions}
              disabled={isGenerateDisabled}
            >
              {loading ? (
                '🔄 Generating...'
              ) : subjectsLoading ? (
                '⏳ Loading subjects...'
              ) : (
                `🚀 Generate ${mode === 'topic' ? `${numQuestions} Questions` : 'Whole Paper (10 Q)'}`
              )}
            </button>

          </div>

          {/* Results */}
          <div style={{ marginTop: window.innerWidth <= 768 ? '30px' : '0' }}>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>
              📄 Generated Questions
              {questions && (
                <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
                  {' '}({questions.split('\n\n').filter(q => q.trim()).length} questions)
                </span>
              )}
            </h3>
            
            {questions ? (
              <div>
                {questions.split('\n\n').map((question, index) => (
                  <div key={index} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <p style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{question}</p>
                    <button
                      type="button"
                      style={{ ...styles.button, marginTop: '10px' }}
                      onClick={() => handleGenerateAnswer(question, index)}
                      disabled={generatingAnswers[index]}
                    >
                      {generatingAnswers[index] ? 'Generating Answer...' : 'Generate Answer'}
                    </button>
                    {answers[index] && (
                      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                        <h4>Answer:</h4>
                        <p><strong>Introduction:</strong> {answers[index].introduction}</p>
                        <div><strong>Body:</strong>
                          <ul>
                            {answers[index].body.map((keyword: string, i: number) => (
                              <li key={i}>{keyword}</li>
                            ))}
                          </ul>
                        </div>
                        <p><strong>Conclusion:</strong> {answers[index].conclusion}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.loading}>
                {loading ? (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🤖</div>
                    <p>Generating questions using your UPSC AI system...</p>
                    <p style={{ fontSize: '14px', color: '#888' }}>This may take 10-30 seconds</p>
                  </div>
                ) : subjectsLoading ? (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '15px' }}>📚</div>
                    <p>Loading UPSC subjects and topics...</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '15px' }}>📝</div>
                    <p>Configure your settings and generate questions to see results here</p>
                    <p style={{ fontSize: '14px', color: '#888' }}>
                      {totalTopics} topics available across {Object.keys(subjects).length} subjects
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.card}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <p>© 2024 UPSC Question Generator. Built with Next.js, FastAPI, Groq AI, and Supabase.</p>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>
            🤖 AI-powered tool for UPSC aspirants with current affairs integration.
          </p>
        </div>
      </div>
    </div>
  )
}