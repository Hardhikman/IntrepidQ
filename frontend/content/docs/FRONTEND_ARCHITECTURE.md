---
title: Frontend Architecture
description: Details about the frontend components and architecture of IntrepidQ AI
---

# Frontend Architecture

## Component Architecture

### UI Primitives Architecture
The UI primitives are built using shadcn/ui components which provide accessible, customizable UI elements. These components are located in the `frontend/components/ui` directory and include:
- Buttons, cards, inputs, selects, and other form elements
- Toast notifications and alert dialogs
- Data visualization components

### Business Components Architecture

1. #### QuestionGenerator Component
   The main component responsible for generating questions. It provides:
   - Topic selection interface
   - Question count configuration
   - Current affairs integration toggle
   - Model selection options
   - Generation controls and status indicators
   - Mode selection for topic, paper, keyword, and current affairs

2. #### Dashboard Component
   The main dashboard that displays:
   - User statistics and analytics
   - Study streak information
   - Recent question history
   - Quick access to generation features

3. #### AnalyticsCard Component
   Displays analytics data in a card format:
   - Generation statistics
   - Model performance metrics
   - Usage patterns and trends

4. #### Chatwindow Component
   Provides a chat-like interface for:
   - Question display and navigation
   - Answer submission and evaluation
   - Interactive learning experience

5. #### AuthForm Component
   Handles user authentication:
   - Google OAuth integration
   - Sign in and sign up flows
   - Guest access options

6. ### QuestionDisplay Component
   Responsible for displaying generated questions:
   - Proper formatting and styling
   - Question navigation controls
   - Answer submission interface

7. #### QuestionHistory Component
   Shows the user's question generation history:
   - Filter by date and subject
   - Search and sort capabilities
   - Quick regeneration options

8. #### FloatingFeedbackButton Component
   Provides easy access to feedback submission:
   - Floating action button design
   - Quick feedback form
   - Bug reporting and feature requests

### Component Composition and Layout
The frontend follows a modular component architecture where:
- Pages compose multiple business components
- Business components compose UI primitives
- Shared components are reused across different pages
- Layout components provide consistent structure

### Theming and Styling System
The application uses:
- Tailwind CSS for utility-first styling
- CSS variables for theme management
- Dark mode support with automatic system detection
- Responsive design for all device sizes

## State Management
The frontend uses a combination of:
- React state hooks for local component state
- Context API for global application state
- Supabase real-time subscriptions for data synchronization
- Custom hooks for complex state logic

## Routing and Page Structure
The application follows a page-based routing structure:
- `/` - Home page with question generation interface
- `/dashboard` - User dashboard with analytics
- `/auth/signin` - Authentication page
- `/profile` - User profile and settings
- `/about` - About page with project information
- `/blog` - Blog listing and individual posts

## API Integration Layer
The frontend integrates with the backend through:
- REST API calls using fetch
- Supabase client for authentication and database operations
- Custom API utility functions for consistent error handling
- Type-safe API interfaces using TypeScript

## Recent Frontend Enhancements

### Current Affairs Mode Support
The question generation interface now supports current affairs-based generation:
- New mode option in the generation form for current affairs
- Updated UI to handle current affairs topic selection
- Integration with news APIs for up-to-date content
- Configurable time windows for current affairs inclusion

### Keyword Mode Support
The question generation interface now supports keyword-based generation:
- New mode option in the generation form
- Updated UI to handle keyword context input
- Integration with backend keyword processing

### Model Selection Improvements
Enhanced model selection capabilities:
- Support for multiple AI providers
- Real-time model performance indicators
- User preference saving