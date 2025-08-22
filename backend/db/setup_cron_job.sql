-- =========================================================
-- Supabase Guest Cleanup Cron Job Setup
-- Run these commands MANUALLY in Supabase SQL Editor
-- =========================================================

-- STEP 1: Enable pg_cron extension (requires superuser privileges)
-- Run this first:
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- STEP 2: Schedule the automatic cleanup job
-- Run this after Step 1 succeeds:
SELECT cron.schedule(
    'guest-cleanup',                    -- job name
    '0 2 */2 * *',                     -- every 2 days at 2 AM UTC  
    'SELECT public.cleanup_old_guest_generations();'
);

-- STEP 3: Verify the job was created successfully
-- Check scheduled jobs:
SELECT * FROM cron.job;

-- STEP 4: Monitor job execution (run after a few days)
-- View recent job runs:
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- =========================================================
-- Additional Management Commands (Optional)
-- =========================================================

-- To view job status:
SELECT 
    jobname,
    schedule,
    active,
    jobid
FROM cron.job 
WHERE jobname = 'guest-cleanup';

-- To temporarily disable the job:
-- SELECT cron.alter_job('guest-cleanup', active := false);

-- To re-enable the job:
-- SELECT cron.alter_job('guest-cleanup', active := true);

-- To change the schedule (example: every 3 days at 3 AM):
-- SELECT cron.alter_job('guest-cleanup', schedule := '0 3 */3 * *');

-- To delete the job completely:
-- SELECT cron.unschedule('guest-cleanup');

-- =========================================================
-- Troubleshooting
-- =========================================================

-- If Step 1 fails with "permission denied":
-- You need superuser privileges. Contact your Supabase admin or
-- use the Supabase dashboard with owner permissions.

-- If Step 2 fails with "function does not exist":
-- Make sure you've applied the main schema (supabase.sql) first
-- which contains the cleanup_old_guest_generations() function.

-- To test the cleanup function manually:
-- SELECT public.cleanup_old_guest_generations();

-- To check if there are any guest records to clean up:
-- SELECT COUNT(*) FROM guest_generations 
-- WHERE last_generation_date < CURRENT_DATE - INTERVAL '7 days';