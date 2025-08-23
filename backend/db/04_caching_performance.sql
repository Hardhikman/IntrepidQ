-- =========================================================
-- CACHING & PERFORMANCE SCHEMA
-- Tables and functions for question caching and performance tracking
-- =========================================================

-- ---------------------------------------------------------
-- QUESTIONS CACHE TABLE
-- ---------------------------------------------------------

-- Questions cache table - caches questions for LLM examples (7-day TTL)
CREATE TABLE IF NOT EXISTS public.questions_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key text NOT NULL,
    subject text NOT NULL CHECK (subject IN ('GS1','GS2','GS3','GS4')),
    topic text,
    questions jsonb NOT NULL,
    metadata jsonb DEFAULT '{}',
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ---------------------------------------------------------
-- TOPIC QUESTIONS INDEX TABLE
-- ---------------------------------------------------------

-- Topic-based questions index - indexes questions by topic for LLM examples
CREATE TABLE IF NOT EXISTS public.topic_questions_index (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject text NOT NULL CHECK (subject IN ('GS1','GS2','GS3','GS4')),
    topic text NOT NULL,
    question_text text NOT NULL,
    question_data jsonb DEFAULT '{}',
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
    created_at timestamp with time zone DEFAULT now()
);

-- ---------------------------------------------------------
-- MODEL PERFORMANCE TABLE
-- ---------------------------------------------------------

-- Model performance tracking - tracks AI model speed and performance
CREATE TABLE IF NOT EXISTS public.model_performance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name text NOT NULL,
    avg_speed real NOT NULL,
    num_runs integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ---------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------

-- Cache table indexes
CREATE INDEX IF NOT EXISTS idx_questions_cache_key ON public.questions_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_questions_cache_subject_topic ON public.questions_cache (subject, topic);
CREATE INDEX IF NOT EXISTS idx_questions_cache_expires_at ON public.questions_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_topic_questions_index_subject_topic ON public.topic_questions_index (subject, topic);
CREATE INDEX IF NOT EXISTS idx_topic_questions_index_expires_at ON public.topic_questions_index (expires_at);

-- Model performance indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_performance_name ON public.model_performance (model_name);
CREATE INDEX IF NOT EXISTS idx_model_performance_created_at ON public.model_performance (created_at);

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------

ALTER TABLE public.questions_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_questions_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_performance ENABLE ROW LEVEL SECURITY;

-- Service-only policies (Cache, Performance)
DROP POLICY IF EXISTS "Service key can manage questions cache" ON public.questions_cache;
CREATE POLICY "Service key can manage questions cache"
ON public.questions_cache FOR ALL
TO service_role;

DROP POLICY IF EXISTS "Service key can manage topic questions index" ON public.topic_questions_index;
CREATE POLICY "Service key can manage topic questions index"
ON public.topic_questions_index FOR ALL
TO service_role;

DROP POLICY IF EXISTS "Service key can manage model performance" ON public.model_performance;
CREATE POLICY "Service key can manage model performance"
ON public.model_performance FOR ALL
TO service_role;

-- ---------------------------------------------------------
-- CLEANUP FUNCTIONS
-- ---------------------------------------------------------

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_cache_count integer;
    deleted_topic_count integer;
BEGIN
    -- Delete expired cache entries
    DELETE FROM public.questions_cache 
    WHERE expires_at < now();
    GET DIAGNOSTICS deleted_cache_count = ROW_COUNT;
    
    DELETE FROM public.topic_questions_index 
    WHERE expires_at < now();
    GET DIAGNOSTICS deleted_topic_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO public.usage_analytics (
        user_id,
        action,
        success,
        error_message
    ) VALUES (
        null,
        'cache_cleanup',
        true,
        format('Cleaned up %s cache entries and %s topic index entries', deleted_cache_count, deleted_topic_count)
    );
    
    RETURN format('Successfully cleaned up %s cache entries and %s topic index entries', deleted_cache_count, deleted_topic_count);
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
            'cache_cleanup',
            false,
            format('Cache cleanup failed: %s', SQLERRM)
        );
        
        RETURN format('Cache cleanup failed: %s', SQLERRM);
END;
$$;