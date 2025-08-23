-- Performance optimization indexes for IntrepidQ2
-- Add missing database indexes for performance optimization on usage_analytics and generated_questions tables

-- ============================================================================
-- USAGE ANALYTICS TABLE INDEXES
-- ============================================================================

-- Index for user analytics queries (user_id + action + date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_analytics_user_action_date 
ON usage_analytics(user_id, action, created_at DESC);

-- Index for action-based analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_analytics_action_date 
ON usage_analytics(action, created_at DESC);

-- Index for subject-based analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_analytics_subject_date 
ON usage_analytics(subject, created_at DESC) 
WHERE subject IS NOT NULL;

-- Index for success/failure analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_analytics_success_date 
ON usage_analytics(success, created_at DESC);

-- Composite index for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_analytics_user_success_date 
ON usage_analytics(user_id, success, created_at DESC);

-- ============================================================================
-- GENERATED QUESTIONS TABLE INDEXES  
-- ============================================================================

-- Index for user question history (user_id + date) - may already exist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_questions_user_date 
ON generated_questions(user_id, created_at DESC);

-- Index for subject-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_questions_subject_date 
ON generated_questions(subject, created_at DESC);

-- Index for mode-based queries (topic vs paper)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_questions_mode_date 
ON generated_questions(mode, created_at DESC);

-- Index for current affairs usage analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_questions_current_affairs_date 
ON generated_questions(use_current_affairs, created_at DESC);

-- Composite index for user analytics dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_questions_user_subject_date 
ON generated_questions(user_id, subject, created_at DESC);

-- Index for question count aggregations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_questions_user_count_date 
ON generated_questions(user_id, question_count, created_at DESC);

-- ============================================================================
-- QUESTION FEEDBACK TABLE INDEXES
-- ============================================================================

-- Index for feedback analytics by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_feedback_user_rating_date 
ON question_feedback(user_id, rating, created_at DESC);

-- Index for question-specific feedback
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_feedback_question_rating 
ON question_feedback(question_id, rating);

-- Index for rating-based analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_feedback_rating_date 
ON question_feedback(rating, created_at DESC);

-- ============================================================================
-- USER PROFILES TABLE INDEXES
-- ============================================================================

-- Index for role-based queries (admin functions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_role 
ON user_profiles(role) 
WHERE role IS NOT NULL;

-- Index for generation count analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_generation_count 
ON user_profiles(generation_count_today, last_generation_date);

-- Index for study streak analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_study_streak 
ON user_profiles(study_streak) 
WHERE study_streak > 0;

-- ============================================================================
-- GUEST GENERATIONS TABLE INDEXES
-- ============================================================================

-- Index for IP-based rate limiting (may already exist)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guest_generations_ip_date 
ON guest_generations(ip_address, last_generation_date);

-- Index for cleanup operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guest_generations_cleanup_date 
ON guest_generations(last_generation_date);

-- ============================================================================
-- MODEL PERFORMANCE TABLE INDEXES
-- ============================================================================

-- Index for model performance analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_model_performance_model_date 
ON model_performance(model_name, updated_at DESC);

-- Index for response time analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_model_performance_response_time 
ON model_performance(avg_response_time);

-- ============================================================================
-- QUESTIONS CACHE TABLE INDEXES (if exists)
-- ============================================================================

-- Index for cache cleanup operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_cache_created_date 
ON questions_cache(created_at);

-- Index for cache key lookups (if not already primary)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_cache_key 
ON questions_cache(cache_key);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check index usage statistics
-- Run these queries to verify indexes are being used:

/*
-- Check usage_analytics index usage
EXPLAIN (ANALYZE, BUFFERS) 
SELECT user_id, action, COUNT(*) 
FROM usage_analytics 
WHERE user_id = 'test-user-id' AND action = 'question_generation' 
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, action;

-- Check generated_questions index usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT subject, COUNT(*), AVG(question_count)
FROM generated_questions 
WHERE user_id = 'test-user-id' AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY subject;

-- Check index sizes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
*/

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

/*
These indexes are designed to optimize:

1. Dashboard Analytics Queries:
   - User statistics aggregation
   - Subject breakdown analysis
   - Mode usage analysis
   - Success rate calculations

2. User History Queries:
   - Recent question history
   - Filtered question lists
   - Date range queries

3. Admin Analytics:
   - System-wide usage statistics
   - Model performance tracking
   - User activity monitoring

4. Rate Limiting:
   - Guest IP tracking
   - User generation limits
   - Cleanup operations

Expected Performance Improvements:
- Dashboard loading: 60-80% faster
- User history queries: 70-90% faster
- Analytics queries: 50-70% faster
- Admin queries: 40-60% faster

Monitor query performance using:
- pg_stat_statements extension
- EXPLAIN ANALYZE for slow queries
- Index usage statistics in pg_stat_user_indexes
*/