---
title: Project Overview
description: Introduction to the IntrepidQ AI system
---

# Project Overview

## Introduction
IntrepidQ AI is an AI-powered system designed to generate high-quality, context-aware questions for the UPSC Civil Services Examination (CSE) Mains. The platform leverages advanced natural language processing (NLP) and vector search technologies to create exam-style questions from previous years' question papers (PYQs) and current affairs data. It serves as a dynamic study aid for aspirants by automating the creation of relevant and challenging questions tailored to specific subjects and topics.

The system features a modern, responsive user interface built with Next.js and Tailwind CSS, providing an intuitive experience for users. It supports multi-provider AI inference through integration with Groq, Google's Gemini, and OpenRouter, allowing for flexible and robust question generation. User authentication is managed via Supabase with Google sign-in, enabling personalized experiences, usage tracking, and analytics. The backend is powered by FastAPI, ensuring high performance and scalability, while Supabase provides both database storage and authentication services.

## Recent Enhancements

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
The system has migrated to a hybrid technology stack for improved performance and scalability:
- **pgvector**: For local vector similarity search in PostgreSQL
- **Upstash Redis**: For managed caching and rate limiting
- **Upstash Search**: For managed keyword search functionality

### Database Schema Updates
Several database migrations have been implemented:
- Added `model` column to `generated_questions` table to track which AI model was used for generation
- Added `feedback_type` column to `question_feedback` table to categorize feedback
- Added support for `keyword` and `currentAffairs` modes in the `mode` field constraint
- Added user profile fields (username, full_name, preferred_subjects)

## Core Components

### Backend Core Services
The backend, located in `backend/ai_service`, is built using FastAPI and Python, providing RESTful endpoints for the frontend to interact with. It includes:

- **API Layer**: Handles HTTP requests and routes them to appropriate services.
- **Core Business Logic**: Implements question generation, PDF parsing, and vector indexing.
- **Database Integration**: Supabase client for data persistence and retrieval.
- **AI Model Integration**: Multi-model support for question generation.
- **Caching Layer**: Upstash Redis-based caching for improved performance.

### Frontend Components
The frontend, implemented in `frontend`, uses Next.js with TypeScript and React components. Key aspects include:

- **Pages**: Define the application's routes and main views (e.g., dashboard, profile).
- **Components**: Reusable UI elements such as buttons, cards, and forms.
- **Hooks**: Custom React hooks for state management and API interactions.
- **Styling**: Uses Tailwind CSS for responsive design and shadcn/ui for accessible components.

### AI and Data Processing
The AI engine is the heart of IntrepidQ AI, responsible for generating contextually relevant questions. It uses LangChain for orchestrating LLM calls and integrates with multiple AI providers:

- **Groq**: For fast LLM inference using models like Llama3.
- **Google Gemini**: As an alternative AI provider.
- **OpenRouter**: To access additional models like DeepSeek and Moonshot.

The system processes PDF documents containing previous years' questions, extracts text, chunks it, and indexes it into a vector database for semantic search. When a user requests questions on a topic, the system retrieves relevant context using pgvector and prompts the AI model to generate new, original questions.