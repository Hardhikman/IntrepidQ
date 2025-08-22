-- =========================================================
-- Full Supabase Schema + Safe RPC Functions
-- Null-safe COALESCE() for numeric aggregates
-- =========================================================

-- 0) Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- 1) Tables ------------------------------------------------

create table if not exists public.user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique,
    full_name text,
    preferred_subjects text[] default '{}',
    study_streak integer default 0,
    total_questions_generated integer default 0,
    total_papers_generated integer default 0,
    generation_count_today integer not null default 0,
    last_generation_date date,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Role column
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

update public.user_profiles set role = 'user' where role is null;
create index if not exists idx_user_profiles_role on public.user_profiles (role);

-- Generated questions
create table if not exists public.generated_questions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    subject text not null check (subject in ('GS1','GS2','GS3','GS4')),
    topic text,
    mode text not null check (mode in ('topic','paper')),
    questions text not null,
    use_current_affairs boolean default false,
    months integer,
    question_count integer default 1,
    created_at timestamp with time zone default now()
);

-- Usage analytics
create table if not exists public.usage_analytics (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    action text not null,
    subject text,
    topic text,
    success boolean default true,
    error_message text,
    created_at timestamp with time zone default now()
);

-- Question feedback
create table if not exists public.question_feedback (
    id uuid primary key default gen_random_uuid(),
    question_id uuid references public.generated_questions(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    rating integer check (rating between 1 and 5),
    comment text,
    created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_generated_questions_user_date on public.generated_questions (user_id, created_at desc);
create index if not exists idx_question_feedback_user on public.question_feedback (user_id);
create index if not exists idx_question_feedback_question on public.question_feedback (question_id);

-- 2) RLS ---------------------------------------------------
alter table public.user_profiles enable row level security;
alter table public.generated_questions enable row level security;
alter table public.usage_analytics enable row level security;
alter table public.question_feedback enable row level security;

-- user_profiles policies
drop policy if exists "Users can view own profile" on public.user_profiles;
create policy "Users can view own profile"
on public.user_profiles for select
to authenticated using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
on public.user_profiles for insert
to authenticated
with check (auth.uid() = id);

-- generated_questions policies
drop policy if exists "Users can view own questions" on public.generated_questions;
create policy "Users can view own questions"
on public.generated_questions for select
to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own questions" on public.generated_questions;
create policy "Users can insert own questions"
on public.generated_questions for insert
to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can delete own questions" on public.generated_questions;
create policy "Users can delete own questions"
on public.generated_questions for delete
to authenticated using (auth.uid() = user_id);

-- usage_analytics policies
drop policy if exists "Users can insert usage analytics" on public.usage_analytics;
create policy "Users can insert usage analytics"
on public.usage_analytics for insert
to authenticated
with check (auth.uid() = user_id or user_id is null);

-- question_feedback policies
drop policy if exists "Users can insert feedback" on public.question_feedback;
create policy "Users can insert feedback"
on public.question_feedback for insert
to authenticated
with check (auth.uid() = user_id);

-- Optional: allow viewing own feedback
drop policy if exists "Users can view own feedback" on public.question_feedback;
create policy "Users can view own feedback"
on public.question_feedback for select
to authenticated using (auth.uid() = user_id);

-- 3) Realtime publications -------------------------------
do $$
begin
    begin
        execute 'alter publication supabase_realtime add table public.user_profiles';
    exception when duplicate_object then null; end;
    begin
        execute 'alter publication supabase_realtime add table public.generated_questions';
    exception when duplicate_object then null; end;
end$$;

-- 4) Updated-at trigger ----------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin new.updated_at = timezone('utc', now()); return new; end
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

-- 5) SAFE profile creation function ----------------------
create or replace function public.create_profile_for_new_user(uid uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
    insert into public.user_profiles (id) values (uid)
    on conflict (id) do nothing;
end
$$;

-- 6) Daily generation limit enforcement ------------------
create or replace function public.check_daily_limit()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
declare
    limit_per_day int := 5;
begin
    -- Cast to DATE to ensure type safety
    if new.last_generation_date::date is distinct from current_date then
        new.generation_count_today := 0;
    end if;

    if new.generation_count_today >= limit_per_day then
        raise exception 'Daily generation limit of % reached', limit_per_day
            using hint = 'Try again tomorrow.';
    end if;

    new.generation_count_today := new.generation_count_today + 1;
    new.last_generation_date := current_date;

    return new;
end;
$$;


drop trigger if exists enforce_daily_limit on public.user_profiles;
create trigger enforce_daily_limit
before update on public.user_profiles
for each row
when (pg_trigger_depth() = 0)
execute function public.check_daily_limit();

-- 7) RPC: get_user_stats_rpc ------------------------------
create or replace function public.get_user_stats_rpc(uid uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    result json;
begin
    select json_build_object(
        'total_generations', coalesce(count(distinct g.id), 0),
        'total_questions', coalesce(sum(g.question_count), 0),
        'subject_breakdown', coalesce(json_object_agg(sb.subject, sb.ct), '{}'::json),
        'mode_breakdown', json_build_object(
            'topic', coalesce(sum(case when g.mode='topic' then 1 else 0 end), 0),
            'paper', coalesce(sum(case when g.mode='paper' then 1 else 0 end), 0)
        ),
        'current_affairs_usage', coalesce(sum(case when g.use_current_affairs then 1 else 0 end), 0),
        'feedback_count', coalesce(count(f.id), 0),
        'individual_feedback_count', coalesce(sum(case when f.question_id is not null then 1 else 0 end), 0),
        'generation_feedback_count', coalesce(sum(case when f.question_id is null then 1 else 0 end), 0),
        'individual_average_rating', coalesce(avg(case when f.question_id is not null then f.rating end), 0),
        'generation_average_rating', coalesce(avg(case when f.question_id is null then f.rating end), 0),
        'overall_average_rating', coalesce(avg(f.rating), 0)
    )
    into result
    from generated_questions g
    left join (
        select subject, count(*) as ct
        from generated_questions
        where user_id = uid
        group by subject
    ) sb on g.subject = sb.subject
    left join question_feedback f on f.user_id = uid
    where g.user_id = uid;

    return result;
end;
$$;


-- 8) RPC: get_user_dashboard_data -------------------------
create or replace function public.get_user_dashboard_data(uid uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    result json;
begin
    select json_build_object(
        'profile', json_build_object(
            'id', p.id,
            'username', p.username,
            'full_name', p.full_name,
            'preferred_subjects', coalesce(p.preferred_subjects, '{}'),
            'study_streak', coalesce(p.study_streak, 0),
            'total_questions_generated', coalesce(p.total_questions_generated, 0),
            'total_papers_generated', coalesce(p.total_papers_generated, 0),
            'generation_count_today', coalesce(p.generation_count_today, 0),
            'last_generation_date', to_char(p.last_generation_date, 'YYYY-MM-DD'),
            'role', coalesce(p.role, 'user')
        ),
        'stats', json_build_object(
            'total_generations', coalesce(count(distinct g.id), 0),
            'total_questions', coalesce(sum(g.question_count), 0),
            'subject_breakdown', coalesce(json_object_agg(sb.subject, sb.ct), '{}'::json),
            'mode_breakdown', json_build_object(
                'topic', coalesce(sum(case when g.mode='topic' then 1 else 0 end), 0),
                'paper', coalesce(sum(case when g.mode='paper' then 1 else 0 end), 0)
            ),
            'current_affairs_usage', coalesce(sum(case when g.use_current_affairs then 1 else 0 end), 0),
            'feedback_count', coalesce(count(f.id), 0),
            'individual_feedback_count', coalesce(sum(case when f.question_id is not null then 1 else 0 end), 0),
            'generation_feedback_count', coalesce(sum(case when f.question_id is null then 1 else 0 end), 0),
            'individual_average_rating', coalesce(avg(case when f.question_id is not null then f.rating end), 0),
            'generation_average_rating', coalesce(avg(case when f.question_id is null then f.rating end), 0),
            'overall_average_rating', coalesce(avg(f.rating), 0)
        )
    )
    into result
    from user_profiles p
    left join generated_questions g on g.user_id = p.id
    left join (
        select subject, count(*) as ct
        from generated_questions
        where user_id = uid
        group by subject
    ) sb on g.subject = sb.subject
    left join question_feedback f on f.user_id = p.id
    where p.id = uid
    group by p.id, p.username, p.full_name, p.preferred_subjects, 
             p.study_streak, p.total_questions_generated, p.total_papers_generated,
             p.generation_count_today, p.last_generation_date, p.role;

    return result;
end;
$$;