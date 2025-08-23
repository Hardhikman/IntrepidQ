-- =========================================================
-- QUESTION GENERATION SCHEMA
-- Tables and functions for question generation system
-- =========================================================

-- ---------------------------------------------------------
-- GENERATED QUESTIONS TABLE
-- ---------------------------------------------------------

-- Generated questions table - stores all question generation history
CREATE TABLE IF NOT EXISTS public.generated_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject text NOT NULL CHECK (subject IN ('GS1','GS2','GS3','GS4')),
    topic text,
    mode text NOT NULL CHECK (mode IN ('topic','paper')),
    questions text NOT NULL,
    use_current_affairs boolean DEFAULT false,
    months integer,
    question_count integer DEFAULT 1,
    model text, -- Model used for generation (e.g., 'llama3-70b', 'gemini-1.5-flash')
    created_at timestamp with time zone DEFAULT now()
);

-- ---------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_generated_questions_user_date ON public.generated_questions (user_id, created_at DESC);

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------

ALTER TABLE public.generated_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own questions" ON public.generated_questions;
CREATE POLICY "Users can view own questions"
ON public.generated_questions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own questions" ON public.generated_questions;
CREATE POLICY "Users can insert own questions"
ON public.generated_questions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own questions" ON public.generated_questions;
CREATE POLICY "Users can delete own questions"
ON public.generated_questions FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------
-- REALTIME SUBSCRIPTIONS
-- ---------------------------------------------------------

DO $$
BEGIN
    BEGIN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.generated_questions';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;