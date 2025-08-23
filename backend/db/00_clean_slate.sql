-- =========================================================
-- CLEAN SLATE - DROP ALL EXISTING SCHEMA
-- Run this FIRST to start with a clean database
-- =========================================================

-- Drop all tables (in dependency order)
DROP TABLE IF EXISTS public.topic_questions_index CASCADE;
DROP TABLE IF EXISTS public.questions_cache CASCADE;
DROP TABLE IF EXISTS public.question_feedback CASCADE;
DROP TABLE IF EXISTS public.usage_analytics CASCADE;
DROP TABLE IF EXISTS public.generated_questions CASCADE;
DROP TABLE IF EXISTS public.guest_generations CASCADE;
DROP TABLE IF EXISTS public.model_performance CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.create_profile_for_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.check_daily_limit(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_guest_generations() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_cache() CASCADE;
DROP FUNCTION IF EXISTS public.manual_guest_cleanup() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_stats_rpc(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_dashboard_data(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.match_documents(vector, int, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.count_documents() CASCADE;
DROP FUNCTION IF EXISTS public.get_document_stats() CASCADE;
DROP FUNCTION IF EXISTS public.pg_extension_exists(text) CASCADE;
DROP FUNCTION IF EXISTS public.count_old_guest_records(integer) CASCADE;

-- Drop any existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Success message
SELECT 'Clean slate completed - ready for fresh deployment' as status;