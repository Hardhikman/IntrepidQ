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

-- Add index for efficient cleanup operations
CREATE INDEX IF NOT EXISTS idx_generated_questions_created_at ON public.generated_questions (created_at);

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
-- CLEANUP FUNCTIONS
-- ---------------------------------------------------------

-- Function to clean up old generated questions (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_generated_questions()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
    cleanup_date timestamp with time zone;
BEGIN
    -- Calculate cleanup date (30 days ago)
    cleanup_date := NOW() - INTERVAL '30 days';
    
    -- Delete old generated questions for all users
    DELETE FROM public.generated_questions 
    WHERE created_at < cleanup_date;
    
    -- Get count of deleted records
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO public.usage_analytics (
        user_id,
        action,
        success,
        error_message
    ) VALUES (
        null,
        'questions_cleanup',
        true,
        format('Cleaned up %s old generated questions older than %s', deleted_count, cleanup_date)
    );
    
    RETURN format('Successfully cleaned up %s generated questions older than %s', deleted_count, cleanup_date);
EXCEPTION
    WHEN others THEN
        -- Log cleanup errors
        INSERT INTO public.usage_analytics (
            user_id,
            action,
            success,
            error_message
        ) VALUES (
            null,
            'questions_cleanup',
            false,
            format('Questions cleanup failed: %s', SQLERRM)
        );
        
        RETURN format('Questions cleanup failed: %s', SQLERRM);
END;
$$;

-- Manual cleanup function that can be called via API
CREATE OR REPLACE FUNCTION public.manual_questions_cleanup()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result text;
BEGIN
    SELECT public.cleanup_old_generated_questions() INTO result;
    RETURN json_build_object(
        'success', true,
        'message', result,
        'timestamp', now()
    );
EXCEPTION
    WHEN others THEN
        RETURN json_build_object(
            'success', false,
            'message', format('Manual cleanup failed: %s', SQLERRM),
            'timestamp', now()
        );
END;
$$;

-- ---------------------------------------------------------
-- REALTIME SUBSCRIPTIONS
-- ---------------------------------------------------------

DO $$
BEGIN
    BEGIN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.generated_questions';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;