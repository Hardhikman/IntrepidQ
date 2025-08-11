import axios from 'axios'
import { supabase } from './supabase'
import { QuestionRequest, WholePaperRequest } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds for long-running AI operations
})

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  
  return config
})

// Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token might be expired, try to refresh
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Redirect to login
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

// API functions
export const generateQuestions = async (data: QuestionRequest) => {
  const response = await apiClient.post('/api/generate_questions', data)
  return response.data
}

export const generateWholePaper = async (data: WholePaperRequest) => {
  const response = await apiClient.post('/api/generate_whole_paper', data)
  return response.data
}

export const getSubjects = async () => {
  const response = await apiClient.get('/api/subjects')
  return response.data
}

export const getQuestionHistory = async (limit = 20) => {
  const response = await apiClient.get(`/api/question_history?limit=${limit}`)
  return response.data
}

export const deleteQuestion = async (questionId: string) => {
  const response = await apiClient.delete(`/api/question_history/${questionId}`)
  return response.data
}

export const getUserProfile = async () => {
  const response = await apiClient.get('/api/user_profile')
  return response.data
}

export const updateUserProfile = async (profileData: any) => {
  const response = await apiClient.put('/api/user_profile', profileData)
  return response.data
}

export const getUserStats = async () => {
  const response = await apiClient.get('/api/user_stats')
  return response.data
}

export const submitFeedback = async (generationId: string, questionIndex: number, rating: number, comment?: string) => {
  const response = await apiClient.post('/api/question_feedback', {
    generation_id: generationId,
    question_index: questionIndex,
    rating,
    comment
  })
  return response.data
}

export const loadQuestion = async (questionId: string) => {
  const response = await apiClient.get(`/api/load_question/${questionId}`)
  return response.data
}