-- =========================================================
-- GUEST MANAGEMENT SCHEMA
-- Tables and functions for guest user rate limiting
-- =========================================================

-- ---------------------------------------------------------
-- GUEST GENERATIONS TABLE
-- ---------------------------------------------------------

-- Guest generations tracking - IP-based rate limiting for unauthenticated users
CREATE TABLE IF NOT EXISTS public.guest_generations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address inet NOT NULL,
    generation_count integer NOT NULL DEFAULT 0,
    last_generation_date date NOT NULL DEFAULT current_date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ---------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_guest_generations_ip ON public.guest_generations (ip_address);
CREATE INDEX IF NOT EXISTS idx_guest_generations_date ON public.guest_generations (last_generation_date);

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------

ALTER TABLE public.guest_generations ENABLE ROW LEVEL SECURITY;

-- Guest generations policies (service key only)
DROP POLICY IF EXISTS "Service key can manage guest generations" ON public.guest_generations;
CREATE POLICY "Service key can manage guest generations"
ON public.guest_generations FOR ALL
TO service_role;

-- ---------------------------------------------------------
-- CLEANUP FUNCTIONS
-- ---------------------------------------------------------

-- Function to clean up old guest generation records (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_guest_generations()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
    cleanup_date date;
BEGIN
    -- Calculate cleanup date (7 days ago to keep some history)
    cleanup_date := current_date - interval '7 days';
    
    -- Delete old guest generation records
    DELETE FROM public.guest_generations 
    WHERE last_generation_date < cleanup_date;
    
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
        'guest_cleanup',
        true,
        format('Cleaned up %s old guest generation records older than %s', deleted_count, cleanup_date)
    );
    
    RETURN format('Successfully cleaned up %s guest generation records older than %s', deleted_count, cleanup_date);
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
            'guest_cleanup',
            false,
            format('Guest cleanup failed: %s', SQLERRM)
        );
        
        RETURN format('Guest cleanup failed: %s', SQLERRM);
END;
$$;

-- Manual cleanup function that can be called via API
CREATE OR REPLACE FUNCTION public.manual_guest_cleanup()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result text;
BEGIN
    SELECT public.cleanup_old_guest_generations() INTO result;
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