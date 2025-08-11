"""
Pydantic models for API requests and responses
"""
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

# Health check models
class HealthResponse(BaseModel):
    """Health check response model"""
    status: str = Field(..., description="Service status")
    services: Dict[str, bool] = Field(..., description="Status of individual services")
    timestamp: datetime = Field(..., description="Current timestamp")

# Subject models
class SubjectInfo(BaseModel):
    """Information about a subject"""
    name: str = Field(..., description="Full name of the subject")
    topics: List[str] = Field(..., description="List of topics in this subject")

class SubjectsResponse(BaseModel):
    """Response model for subjects endpoint"""
    subjects: Dict[str, SubjectInfo] = Field(..., description="Available subjects and their topics")

# Question generation models
class GenerateQuestionsRequest(BaseModel):
    """Request model for generating questions"""
    topic: str = Field(..., description="Topic for question generation")
    num: int = Field(default=5, ge=1, le=10, description="Number of questions to generate")
    use_ca: bool = Field(default=False, description="Include current affairs")
    months: int = Field(default=6, ge=1, le=12, description="Current affairs time period in months")

class GenerateWholePaperRequest(BaseModel):
    """Request model for generating whole paper"""
    subject: str = Field(..., description="Subject for paper generation (GS1, GS2, GS3, GS4)")
    use_ca: bool = Field(default=False, description="Include current affairs")
    months: int = Field(default=6, ge=1, le=12, description="Current affairs time period in months")

class QuestionsResponse(BaseModel):
    """Response model for generated questions"""
    result: str = Field(..., description="Generated questions text")
    topic: Optional[str] = Field(None, description="Topic used for generation")
    subject: Optional[str] = Field(None, description="Subject used for generation")
    question_count: int = Field(..., description="Number of questions generated")

# User profile models
class UserProfile(BaseModel):
    """User profile information"""
    id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    full_name: Optional[str] = Field(None, description="User's full name")
    username: Optional[str] = Field(None, description="Username")
    preferred_subjects: Optional[List[str]] = Field(None, description="User's preferred subjects")
    total_questions_generated: int = Field(default=0, description="Total questions generated")
    total_papers_generated: int = Field(default=0, description="Total papers generated")
    created_at: Optional[datetime] = Field(None, description="Account creation date")

class UserProfileResponse(BaseModel):
    """Response model for user profile"""
    profile: UserProfile = Field(..., description="User profile data")
    user: Dict[str, Any] = Field(..., description="Raw user data from auth")

class UpdateUserProfileRequest(BaseModel):
    """Request model for updating user profile"""
    username: Optional[str] = Field(None, description="Username")
    full_name: Optional[str] = Field(None, description="Full name")
    preferred_subjects: Optional[List[str]] = Field(None, description="Preferred subjects")

# Question history models
class QuestionHistoryItem(BaseModel):
    """Individual question history item"""
    id: str = Field(..., description="Question ID")
    subject: str = Field(..., description="Subject")
    topic: Optional[str] = Field(None, description="Topic (if topic-wise generation)")
    mode: str = Field(..., description="Generation mode (topic/paper)")
    questions: str = Field(..., description="Generated questions text")
    use_current_affairs: bool = Field(..., description="Whether current affairs was used")
    question_count: int = Field(..., description="Number of questions")
    created_at: datetime = Field(..., description="Creation timestamp")

class QuestionHistoryResponse(BaseModel):
    """Response model for question history"""
    history: List[QuestionHistoryItem] = Field(..., description="List of question history items")

class DeleteQuestionRequest(BaseModel):
    """Request model for deleting a question"""
    question_id: str = Field(..., description="ID of question to delete")

class FeedbackCreate(BaseModel):
    """Request model for submitting feedback"""
    question_id: str = Field(..., description="ID of the question being reviewed")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = Field(None, description="Optional free-text comment")

# Error response models
class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str = Field(..., description="Error message")
    status_code: int = Field(..., description="HTTP status code")
    detail: Optional[str] = Field(None, description="Detailed error information")

# Authentication models
class SignUpRequest(BaseModel):
    """Request model for user signup"""
    email: str = Field(..., description="User email")
    password: str = Field(..., min_length=6, description="User password")
    full_name: Optional[str] = Field(None, description="User's full name")

class SignInRequest(BaseModel):
    """Request model for user signin"""
    email: str = Field(..., description="User email")
    password: str = Field(..., description="User password")

class AuthResponse(BaseModel):
    """Response model for authentication"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: Dict[str, Any] = Field(..., description="User information")

# Statistics models
class UserStatsResponse(BaseModel):
    """Response model for user statistics"""
    total_generations: int = Field(..., description="Total generations")
    total_questions: int = Field(..., description="Total questions generated")
    subject_breakdown: Dict[str, int] = Field(..., description="Questions by subject")
    mode_breakdown: Dict[str, int] = Field(..., description="Questions by mode")
    current_affairs_usage: int = Field(..., description="Number of generations using current affairs")
    feedback_count: int = Field(..., description="Total feedback submitted")
    average_rating: float = Field(..., description="Average rating of questions")

# Generic response models
class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool = Field(default=True, description="Operation success status")
    message: str = Field(..., description="Success message")
    data: Optional[Dict[str, Any]] = Field(None, description="Optional response data")
