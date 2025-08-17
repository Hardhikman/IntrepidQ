import { createClient, type Session } from '@supabase/supabase-js'

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface UserProfile {
  id: string
  username?: string
  full_name?: string
  preferred_subjects: string[]
  study_streak: number
  total_questions_generated: number
  total_papers_generated: number
  created_at: string
  updated_at: string
}

export interface GeneratedQuestion {
  id: string
  subject: string
  topic?: string
  mode: 'topic' | 'paper'
  question: string
  thinking?: string  
  use_current_affairs: boolean
  months?: number
  question_count: number
  created_at: string
}

export interface QuestionRequest {
  topic: string
  num: number
  use_ca: boolean
  months: number
}

export interface WholePaperRequest {
  subject: string
  use_ca: boolean
  months: number
}

// Optional helper to get session
export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}