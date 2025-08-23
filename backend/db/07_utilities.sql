-- =========================================================
-- UTILITY FUNCTIONS
-- Helper functions and utilities for database operations
-- =========================================================

-- ---------------------------------------------------------
-- EXTENSION HELPERS
-- ---------------------------------------------------------

-- Helper function to check if an extension exists
CREATE OR REPLACE FUNCTION public.pg_extension_exists(ext_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM pg_extension 
        WHERE extname = ext_name
    );
END;
$$;

-- ---------------------------------------------------------
-- GUEST RECORD HELPERS
-- ---------------------------------------------------------

-- Helper function to count old guest records
CREATE OR REPLACE FUNCTION public.count_old_guest_records(days_old integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    record_count integer;
BEGIN
    SELECT COUNT(*) INTO record_count
    FROM public.guest_generations 
    WHERE last_generation_date < current_date - (days_old || ' days')::interval;
    
    RETURN record_count;
END;
$$;