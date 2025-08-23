-- =========================================================
-- DATABASE DEPLOYMENT VERIFICATION
-- Run these queries after applying all schema files
-- =========================================================

-- 1. Check all tables exist
SELECT 'Tables Check' as verification_type, 
       COUNT(*) as found_count,
       9 as expected_count,
       CASE WHEN COUNT(*) = 9 THEN '✅ PASS' ELSE '❌ MISSING TABLES' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_profiles', 'generated_questions', 'usage_analytics', 
    'question_feedback', 'questions_cache', 'topic_questions_index',
    'guest_generations', 'model_performance', 'documents'
);

-- 2. List all tables found
SELECT 'Found Tables' as info, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 3. Check RLS is enabled on all tables
SELECT 'RLS Check' as verification_type,
       COUNT(*) as enabled_count,
       9 as expected_count,
       CASE WHEN COUNT(*) = 9 THEN '✅ PASS' ELSE '❌ RLS NOT ENABLED' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
AND tablename IN (
    'user_profiles', 'generated_questions', 'usage_analytics', 
    'question_feedback', 'questions_cache', 'topic_questions_index',
    'guest_generations', 'model_performance', 'documents'
);

-- 4. Check key functions exist
SELECT 'Functions Check' as verification_type,
       COUNT(*) as found_count,
       CASE WHEN COUNT(*) >= 10 THEN '✅ PASS' ELSE '❌ MISSING FUNCTIONS' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND routine_name IN (
    'create_profile_for_new_user', 'check_daily_limit', 'set_updated_at',
    'get_user_stats_rpc', 'get_user_dashboard_data', 
    'cleanup_old_guest_generations', 'cleanup_expired_cache', 'manual_guest_cleanup',
    'match_documents', 'get_document_stats', 'count_documents',
    'pg_extension_exists', 'count_old_guest_records'
);

-- 5. List all functions found
SELECT 'Found Functions' as info, routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 6. Check indexes exist
SELECT 'Indexes Check' as verification_type,
       COUNT(*) as found_count,
       CASE WHEN COUNT(*) >= 15 THEN '✅ PASS' ELSE '❌ MISSING INDEXES' END as status
FROM pg_indexes 
WHERE schemaname = 'public';

-- 7. Check vector extension (pgvector)
SELECT 'Vector Extension' as verification_type,
       CASE WHEN EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') 
            THEN '✅ INSTALLED' 
            ELSE '❌ NOT INSTALLED - Install pgvector extension' 
       END as status;

-- 8. Test vector table
SELECT 'Vector Table Test' as verification_type,
       CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'documents' 
                       AND column_name = 'embedding' 
                       AND data_type = 'USER-DEFINED')
            THEN '✅ VECTOR COLUMN EXISTS'
            ELSE '❌ VECTOR COLUMN MISSING'
       END as status;

-- 9. Test key functions work
SELECT 'Function Test' as verification_type,
       'Testing count_documents()' as test_name,
       public.count_documents() as result;

-- 10. Summary
SELECT '=== DEPLOYMENT SUMMARY ===' as summary,
       CASE 
           WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') >= 9
           AND (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) >= 9
           AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') >= 10
           THEN '🎉 DEPLOYMENT SUCCESSFUL - All components ready!'
           ELSE '⚠️ DEPLOYMENT INCOMPLETE - Check above results'
       END as status;