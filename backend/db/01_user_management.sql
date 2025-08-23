-- =========================================================
-- USER MANAGEMENT SCHEMA
-- Tables and functions for user account management
-- =========================================================

-- Extensions (if not already loaded)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------
-- USER PROFILES TABLE
-- ---------------------------------------------------------

-- User profiles table - stores user account information and preferences
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE,
    full_name text,
    preferred_subjects text[] DEFAULT '{}',
    study_streak integer DEFAULT 0,
    total_questions_generated integer DEFAULT 0,
    total_papers_generated integer DEFAULT 0,
    generation_count_today integer NOT NULL DEFAULT 0,
    last_generation_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add role column with constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='user_profiles'
          AND column_name='role'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD COLUMN role text NOT NULL DEFAULT 'user'
        CHECK (role IN ('user','admin'));
    END IF;
END
$$;

UPDATE public.user_profiles SET role = 'user' WHERE role IS NULL;

-- ---------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role);

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------

-- Updated-at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN 
    NEW.updated_at = timezone('utc', now()); 
    RETURN NEW; 
END
$$;

-- Apply updated_at trigger to user_profiles
DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Daily generation limit enforcement function
CREATE OR REPLACE FUNCTION public.check_daily_limit()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE 
    limit_per_day int := 5;
BEGIN
    -- Reset counter if it's a new day
    IF NEW.last_generation_date IS DISTINCT FROM current_date THEN
        NEW.generation_count_today := 0;
    END IF;
    
    -- Check if limit exceeded
    IF NEW.generation_count_today >= limit_per_day THEN
        RAISE EXCEPTION 'Daily generation limit of % reached', limit_per_day
            USING hint = 'Try again tomorrow.';
    END IF;
    
    -- Increment counter and update date
    NEW.generation_count_today := NEW.generation_count_today + 1;
    NEW.last_generation_date := current_date;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_daily_limit ON public.user_profiles;
CREATE TRIGGER enforce_daily_limit
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION public.check_daily_limit();

-- ---------------------------------------------------------
-- FUNCTIONS
-- ---------------------------------------------------------

-- Safe profile creation function for new users
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user(uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    INSERT INTO public.user_profiles (id) VALUES (uid)
    ON CONFLICT (id) DO NOTHING;
END
$$;

-- ---------------------------------------------------------
-- REALTIME SUBSCRIPTIONS
-- ---------------------------------------------------------

DO $$
BEGIN
    BEGIN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;