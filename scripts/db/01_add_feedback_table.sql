-- ============================================
-- Complete, idempotent setup for daily limit (5)
-- with safe search_path on trigger function
-- ============================================

-- 0) Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- 1) Tables

-- 1a. User profiles (extends auth.users)
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

-- 1b. Generated questions
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

-- 1c. Usage analytics (optional)
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

-- 1d. Question feedback (optional)
create table if not exists public.question_feedback (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.generated_questions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  rating integer check (rating between 1 and 5),
  comment text,
  created_at timestamp with time zone default now()
);

-- 2) Row Level Security
alter table public.user_profiles enable row level security;
alter table public.generated_questions enable row level security;
alter table public.usage_analytics enable row level security;
alter table public.question_feedback enable row level security;

-- 2a. Policies: user_profiles
drop policy if exists "Users can view own profile" on public.user_profiles;
create policy "Users can view own profile"
on public.user_profiles for select
to authenticated
using (auth.uid() = id);

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

-- 2b. Policies: generated_questions
drop policy if exists "Users can view own questions" on public.generated_questions;
create policy "Users can view own questions"
on public.generated_questions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own questions" on public.generated_questions;
create policy "Users can insert own questions"
on public.generated_questions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own questions" on public.generated_questions;
create policy "Users can delete own questions"
on public.generated_questions for delete
to authenticated
using (auth.uid() = user_id);

-- 2c. Policies: usage_analytics (optional)
drop policy if exists "Users can insert usage analytics" on public.usage_analytics;
create policy "Users can insert usage analytics"
on public.usage_analytics for insert
to authenticated
with check (auth.uid() = user_id);

-- 2d. Policies: question_feedback (optional)
drop policy if exists "Users can insert feedback" on public.question_feedback;
create policy "Users can insert feedback"
on public.question_feedback for insert
to authenticated
with check (auth.uid() = user_id);

-- 3) Realtime publications (safe if already present)
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.user_profiles';
  exception when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.generated_questions';
  exception when duplicate_object then null;
  end;
end$$;

-- 4) Updated-at trigger with fixed search_path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

-- 5) Seed current user row (replace UUID; run once per user)
-- insert into public.user_profiles (id)
-- values ('YOUR_USER_UUID')
-- on conflict (id) do nothing;
