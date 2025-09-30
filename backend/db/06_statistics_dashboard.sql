-- =========================================================
-- STATISTICS & DASHBOARD FUNCTIONS
-- RPC functions for user statistics and dashboard data
-- =========================================================

-- ---------------------------------------------------------
-- USER STATISTICS FUNCTIONS
-- ---------------------------------------------------------

-- Get comprehensive user statistics
CREATE OR REPLACE FUNCTION public.get_user_stats_rpc(uid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_generations', COALESCE(COUNT(DISTINCT g.id), 0),
        'total_questions', COALESCE(SUM(g.question_count), 0),
        'subject_breakdown', COALESCE(json_object_agg(sb.subject, sb.ct), '{}'::json),
        'mode_breakdown', json_build_object(
            'topic', COALESCE(SUM(CASE WHEN g.mode='topic' THEN 1 ELSE 0 END), 0),
            'paper', COALESCE(SUM(CASE WHEN g.mode='paper' THEN 1 ELSE 0 END), 0)
        ),
        'current_affairs_usage', COALESCE(SUM(CASE WHEN g.use_current_affairs THEN 1 ELSE 0 END), 0),
        'feedback_count', COALESCE(COUNT(f.id), 0),
        'individual_feedback_count', COALESCE(SUM(CASE WHEN f.question_id IS NOT NULL THEN 1 ELSE 0 END), 0),
        'generation_feedback_count', COALESCE(SUM(CASE WHEN f.question_id IS NULL THEN 1 ELSE 0 END), 0),
        'individual_average_rating', COALESCE(AVG(CASE WHEN f.question_id IS NOT NULL THEN f.rating END), 0),
        'generation_average_rating', COALESCE(AVG(CASE WHEN f.question_id IS NULL THEN f.rating END), 0),
        'overall_average_rating', COALESCE(AVG(f.rating), 0)
    )
    INTO result
    FROM generated_questions g
    LEFT JOIN (
        SELECT subject, COUNT(*) as ct
        FROM generated_questions
        WHERE user_id = uid
        GROUP BY subject
    ) sb ON g.subject = sb.subject
    LEFT JOIN question_feedback f ON f.user_id = uid
    WHERE g.user_id = uid;

    RETURN result;
END;
$$;

-- Get combined user dashboard data (profile + stats)
CREATE OR REPLACE FUNCTION public.get_user_dashboard_data(uid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'profile', json_build_object(
            'id', p.id,
            'username', p.username,
            'full_name', p.full_name,
            'preferred_subjects', COALESCE(p.preferred_subjects, '{}'),
            'total_questions_generated', COALESCE(p.total_questions_generated, 0),
            'total_papers_generated', COALESCE(p.total_papers_generated, 0),
            'generation_count_today', COALESCE(p.generation_count_today, 0),
            'last_generation_date', p.last_generation_date,
            'role', COALESCE(p.role, 'user')
        ),
        'stats', json_build_object(
            'total_generations', COALESCE(COUNT(DISTINCT g.id), 0),
            'total_questions', COALESCE(SUM(g.question_count), 0),
            'subject_breakdown', COALESCE(json_object_agg(sb.subject, sb.ct), '{}'::json),
            'mode_breakdown', json_build_object(
                'topic', COALESCE(SUM(CASE WHEN g.mode='topic' THEN 1 ELSE 0 END), 0),
                'paper', COALESCE(SUM(CASE WHEN g.mode='paper' THEN 1 ELSE 0 END), 0)
            ),
            'current_affairs_usage', COALESCE(SUM(CASE WHEN g.use_current_affairs THEN 1 ELSE 0 END), 0),
            'feedback_count', COALESCE(COUNT(f.id), 0),
            'individual_feedback_count', COALESCE(SUM(CASE WHEN f.question_id IS NOT NULL THEN 1 ELSE 0 END), 0),
            'generation_feedback_count', COALESCE(SUM(CASE WHEN f.question_id IS NULL THEN 1 ELSE 0 END), 0),
            'individual_average_rating', COALESCE(AVG(CASE WHEN f.question_id IS NOT NULL THEN f.rating END), 0),
            'generation_average_rating', COALESCE(AVG(CASE WHEN f.question_id IS NULL THEN f.rating END), 0),
            'overall_average_rating', COALESCE(AVG(f.rating), 0)
        )
    )
    INTO result
    FROM user_profiles p
    LEFT JOIN generated_questions g ON g.user_id = p.id
    LEFT JOIN (
        SELECT subject, COUNT(*) as ct
        FROM generated_questions
        WHERE user_id = uid
        GROUP BY subject
    ) sb ON g.subject = sb.subject
    LEFT JOIN question_feedback f ON f.user_id = p.id
    WHERE p.id = uid
    GROUP BY p.id, p.username, p.full_name, p.preferred_subjects,
            p.preferred_subjects, p.last_generation_date,
            p.total_questions_generated, p.total_papers_generated,
            p.generation_count_today, p.created_at, p.updated_at;

    RETURN result;
END;
$$;