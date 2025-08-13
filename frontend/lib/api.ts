import axios from "axios";
import { supabase } from "./supabase";

/* =====================
   Request / Response Types
===================== */

// From backend: /user_stats
export interface UserStats {
  total_generations: number;
  total_questions: number;
  feedback_count: number;
  individual_feedback_count: number;
  generation_feedback_count: number;
  overall_average_rating: number;
  individual_average_rating: number;
  generation_average_rating: number;
  subject_breakdown: Record<string, number>;
  mode_breakdown: {
    topic: number;
    paper: number;
  };
  current_affairs_usage: number;
}

// From backend: /question_history
export interface HistoryItem {
  id: string;
  subject: string;
  topic?: string | null;
  mode: "topic" | "paper";
  questions: string;
  use_current_affairs: boolean;
  question_count: number;
  created_at: string;
}

export interface QuestionHistoryResponse {
  history: HistoryItem[];
}

// From frontend usage
export interface QuestionRequest {
  subject: string;
  topic?: string;
  mode: "topic" | "paper";
  use_current_affairs?: boolean;
  question_count: number;
}

export interface WholePaperRequest {
  subject: string;
  topics: string[];
}

export interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  preferred_subjects?: string[];
  generation_count_today: number;
  last_generation_date: string | null;
}

/* =====================
   Axios Client
===================== */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds for long AI ops
});

// Add auth token
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Token refresh handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

/* =====================
   API Functions
===================== */

export const generateQuestions = async (data: QuestionRequest): Promise<any> => {
  const response = await apiClient.post("/api/generate_questions", data);
  return response.data;
};

export const generateWholePaper = async (data: WholePaperRequest): Promise<any> => {
  const response = await apiClient.post("/api/generate_whole_paper", data);
  return response.data;
};

export const getSubjects = async (): Promise<any> => {
  const response = await apiClient.get("/api/subjects");
  return response.data;
};

export const getQuestionHistory = async (limit = 20): Promise<QuestionHistoryResponse> => {
  const response = await apiClient.get(`/api/question_history?limit=${limit}`);
  return response.data;
};

export const deleteQuestion = async (questionId: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete(`/api/question_history/${questionId}`);
  return response.data;
};

export const getUserProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get("/api/user_profile");
  return response.data.profile;
};

export const updateUserProfile = async (profileData: Partial<UserProfile>): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.put("/api/user_profile", profileData);
  return response.data;
};

export const getUserStats = async (): Promise<UserStats> => {
  const response = await apiClient.get("/api/user_stats");
  return response.data;
};

export const submitFeedback = async (
  generationId: string,
  questionId: string,
  rating: number,
  comment?: string
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post("/api/question_feedback", {
    generation_id: generationId,
    question_id: questionId,
    rating,
    comment,
  });
  return response.data;
};

export const loadQuestion = async (questionId: string): Promise<any> => {
  const response = await apiClient.get(`/api/load_question/${questionId}`);
  return response.data;
};