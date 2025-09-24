---
title: Backend Architecture
description: Details about the backend services and architecture of IntrepidQ AI
---

# Backend Architecture

## API Endpoints

### Questions API
The questions API handles all question generation functionality:
- `/api/generate_questions` - Generate questions for a specific topic
- `/api/generate_whole_paper` - Generate a complete UPSC paper
- `/api/generate_questions_from_keywords` - Generate questions based on keywords
- Rate limiting for both authenticated and guest users
- Guest user support with IP-based rate limiting

### Answer API
The answer API handles answer evaluation and processing:
- Answer submission and validation
- AI-powered answer evaluation
- Feedback integration

### Subjects API
The subjects API provides subject and topic information:
- List available subjects (GS1-GS4)
- Get topics for a specific subject
- Topic search and filtering

### Model Performance API
The model performance API tracks AI model metrics:
- Response time monitoring
- Success rate tracking
- Automatic model selection based on performance

## Core Business Logic

### Question Generation Engine
The core question generation engine (`question_generator.py`) provides:
- Multi-model support (Groq, Google Gemini, OpenRouter)
- Vector similarity search for context retrieval using pgvector
- Caching mechanisms for improved performance using Upstash Redis
- Adaptive model selection based on performance metrics
- Current affairs integration
- Stratified sampling for example selection
- Keyword-based question generation using Upstash Search

### PDF Parsing & Processing
The PDF parsing system (`pdf_parser.py`) handles:
- Text extraction from UPSC preparation materials
- Content cleaning and structuring
- Section identification and chunking
- Metadata extraction

### Vector Indexing & Similarity Search
The vector indexing system (`vector_indexer.py`) manages:
- Document vectorization using sentence transformers
- FAISS vector store for efficient similarity search
- pgvector integration for persistent vector storage
- Index regeneration and maintenance
- Stratified sampling for diverse example selection

### Supabase Integration Layer
The Supabase integration (`supabase_client.py`) provides:
- Database operations for all application data
- User management and authentication
- Question caching and retrieval
- Usage tracking and statistics
- Guest user support with IP-based rate limiting

## Data Models and Validation
The backend uses Pydantic models for data validation:
- Request and response validation
- Type safety and documentation
- Automatic API documentation generation

## Authentication and Security
The authentication system provides:
- Google OAuth integration via Supabase
- JWT token management
- Row-Level Security (RLS) in the database
- Guest user support with IP-based rate limiting
- Daily generation limits for both user types

## Request Lifecycle and Flow

### Question Generation Flow
1. User requests question generation via API
2. Rate limiting check (user or guest)
3. Context retrieval via vector similarity search (pgvector) or Upstash Search (for keywords)
4. AI model selection based on performance metrics
5. Question generation using selected model
6. Caching of generated questions in Upstash Redis
7. Database storage of generation history
8. Response with generated questions and metadata

### Model Performance Tracking
1. Each model call is timed and tracked
2. Success/failure status is recorded
3. Performance metrics are stored in the database
4. Automatic model selection uses these metrics
5. Model performance is exposed via API for monitoring

## Recent Backend Enhancements

### Guest User Support
Added support for unauthenticated users with IP-based rate limiting:
- Separate daily limit for guest users (2 questions/day)
- Guest generation tracking in dedicated database table
- Real-time guest limit checking endpoint

### Keyword-Based Question Generation
Implemented a new generation mode for creating questions based on specific keywords:
- New `/api/generate_questions_from_keywords` endpoint
- Enhanced vector search using Upstash Search for keyword context retrieval
- Integration with existing topic and paper modes

### Current Affairs Mode
Added a new generation mode that incorporates current affairs:
- New current affairs mode in the UI
- Integration with news APIs for up-to-date content
- Configurable time windows for current affairs inclusion

### Hybrid Technology Stack Migration
Migrated to a hybrid technology stack for improved performance and scalability:
- **pgvector**: For local vector similarity search in PostgreSQL
- **Upstash Redis**: For managed caching and rate limiting
- **Upstash Search**: For managed keyword search functionality

### Database Schema Updates
Several database improvements:
- Added `model` column to track AI model usage
- Added `feedback_type` column for better feedback categorization
- Extended `mode` field to support keyword-based and current affairs generation
- Added user profile fields (username, full_name, preferred_subjects)

### Model Provider Expansion
Expanded AI model support:
- Added Google Gemini as alternative provider
- Added OpenRouter for additional model access
- Improved model selection logic
- Better error handling and fallback mechanisms