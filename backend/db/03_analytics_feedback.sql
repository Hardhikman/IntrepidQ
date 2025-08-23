-- =========================================================
-- ANALYTICS & FEEDBACK SCHEMA
-- Tables and functions for usage tracking and user feedback
-- =========================================================

-- ---------------------------------------------------------
-- USAGE ANALYTICS TABLE
-- ---------------------------------------------------------

-- Usage analytics table - tracks user actions and system events
CREATE TABLE IF NOT EXISTS public.usage_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    subject text,
    topic text,
    success boolean DEFAULT true,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);

-- ---------------------------------------------------------
-- QUESTION FEEDBACK TABLE
-- ---------------------------------------------------------

-- Question feedback table - stores user ratings and comments
CREATE TABLE IF NOT EXISTS public.question_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid REFERENCES public.generated_questions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    rating integer CHECK (rating BETWEEN 1 AND 5),
    comment text,
    created_at timestamp with time zone DEFAULT now()
);

-- ---------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_question_feedback_user ON public.question_feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_question_feedback_question ON public.question_feedback (question_id);

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------

ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_feedback ENABLE ROW LEVEL SECURITY;

-- Usage analytics policies
DROP POLICY IF EXISTS "Users can insert usage analytics" ON public.usage_analytics;
CREATE POLICY "Users can insert usage analytics"
ON public.usage_analytics FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Question feedback policies
DROP POLICY IF EXISTS "Users can insert feedback" ON public.question_feedback;
CREATE POLICY "Users can insert feedback"
ON public.question_feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own feedback" ON public.question_feedback;
CREATE POLICY "Users can view own feedback"
ON public.question_feedback FOR SELECT
TO authenticated USING (auth.uid() = user_id);