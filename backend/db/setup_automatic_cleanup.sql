-- =========================================================
-- Automatic Database Cleanup Setup for Supabase
-- This file sets up automatic cleanup using pg_cron
-- =========================================================

-- STEP 1: Enable pg_cron extension
-- This requires superuser privileges in Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- STEP 2: Schedule Guest Generations Cleanup
-- Runs every 2 days at 2:00 AM UTC
-- Removes guest generation records older than 7 days
SELECT cron.schedule(
    'guest-cleanup',
    '0 2 */2 * *',
    'SELECT public.cleanup_old_guest_generations();'
);

-- STEP 3: Schedule Cache Cleanup  
-- Runs daily at 3:00 AM UTC
-- Removes expired cache entries from questions_cache and topic_questions_index
SELECT cron.schedule(
    'cache-cleanup', 
    '0 3 * * *',
    'SELECT public.cleanup_expired_cache();'
);

-- STEP 4: Schedule Model Performance Cleanup (optional)
-- Runs weekly on Sundays at 4:00 AM UTC
-- Clean up old model performance data to keep only recent stats
-- First create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.model_performance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name text NOT NULL,
    avg_speed real NOT NULL,
    num_runs integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_model_performance_name 
ON public.model_performance (model_name);

-- Add RLS policy for model_performance
ALTER TABLE public.model_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service key can manage model performance" ON public.model_performance;
CREATE POLICY "Service key can manage model_performance"
ON public.model_performance FOR ALL
TO service_role;

-- Schedule the cleanup job
SELECT cron.schedule(
    'model-performance-cleanup',
    '0 4 * * 0',
    $$
    DELETE FROM public.model_performance 
    WHERE created_at < NOW() - INTERVAL '30 days'
    $$
);

-- STEP 5: Schedule User Generated Questions Cleanup
-- Runs weekly on Mondays at 5:00 AM UTC
-- Removes user generated questions older than 30 days
SELECT cron.schedule(
    'questions-cleanup',
    '0 5 * * 1',
    'SELECT public.cleanup_old_generated_questions();'
);

-- STEP 6: Verify all jobs were created successfully
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job 
ORDER BY jobid DESC;

-- Expected output should show 4 jobs:
-- 1. guest-cleanup (every 2 days at 2 AM)
-- 2. cache-cleanup (daily at 3 AM) 
-- 3. model-performance-cleanup (weekly on Sunday at 4 AM)
-- 4. questions-cleanup (weekly on Monday at 5 AM)

-- =========================================================
-- Monitoring and Management Commands
-- =========================================================

-- To check job execution history:
-- SELECT 
--     job.jobname,
--     job_run_details.start_time,
--     job_run_details.end_time,
--     job_run_details.return_message,
--     job_run_details.status
-- FROM cron.job_run_details
-- JOIN cron.job ON job.jobid = job_run_details.jobid
-- ORDER BY start_time DESC 
-- LIMIT 20;

-- To temporarily disable a job:
-- UPDATE cron.job SET active = false WHERE jobname = 'guest-cleanup';

-- To re-enable a job:
-- UPDATE cron.job SET active = true WHERE jobname = 'guest-cleanup';

-- To remove a job completely:
-- SELECT cron.unschedule('guest-cleanup');
-- SELECT cron.unschedule('cache-cleanup');
-- SELECT cron.unschedule('model-performance-cleanup');
-- SELECT cron.unschedule('questions-cleanup');

-- To modify a job schedule:
-- SELECT cron.unschedule('cache-cleanup');
-- SELECT cron.schedule('cache-cleanup', '0 4 * * *', 'SELECT public.cleanup_expired_cache();');

-- =========================================================
-- Manual Testing Commands
-- =========================================================

-- Test cleanup functions manually:
-- SELECT public.cleanup_old_guest_generations();
-- SELECT public.cleanup_expired_cache();
-- SELECT public.cleanup_old_generated_questions();

-- Check what would be cleaned up (without actually deleting):
-- SELECT COUNT(*) as old_guest_records 
-- FROM public.guest_generations 
-- WHERE last_generation_date < CURRENT_DATE - INTERVAL '7 days';

-- SELECT COUNT(*) as expired_cache_entries
-- FROM public.questions_cache 
-- WHERE expires_at < NOW();

-- SELECT COUNT(*) as expired_topic_index_entries  
-- FROM public.topic_questions_index
-- WHERE expires_at < NOW();

-- SELECT COUNT(*) as old_generated_questions
-- FROM public.generated_questions 
-- WHERE created_at < NOW() - INTERVAL '30 days';