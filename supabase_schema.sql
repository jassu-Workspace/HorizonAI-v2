-- Horizon AI - Supabase schema mapped to current codebase
-- Run in Supabase SQL Editor as role postgres.

create extension if not exists pgcrypto;

-- =========================
-- PROFILES
-- =========================
create table if not exists public.profiles (
  id text primary key,
  full_name text,
  role text default 'learner',
  academic_level text,
  stream text,
  academic_course text,
  interested_subjects text,
  skill_division integer,
  previous_performance text,
  learning_style text,
  focus_area text,
  class_10_performance text,
  class_12_stream text,
  class_12_performance text,
  diploma_performance text,
  resume_path text,
  total_points integer default 0,
  last_edited_at timestamptz,
  updated_at timestamptz default now()
);

-- Ensure missing columns are added for existing projects.
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text default 'learner';
alter table public.profiles add column if not exists academic_level text;
alter table public.profiles add column if not exists stream text;
alter table public.profiles add column if not exists academic_course text;
alter table public.profiles add column if not exists interested_subjects text;
alter table public.profiles add column if not exists skill_division integer;
alter table public.profiles add column if not exists previous_performance text;
alter table public.profiles add column if not exists learning_style text;
alter table public.profiles add column if not exists focus_area text;
alter table public.profiles add column if not exists class_10_performance text;
alter table public.profiles add column if not exists class_12_stream text;
alter table public.profiles add column if not exists class_12_performance text;
alter table public.profiles add column if not exists diploma_performance text;
alter table public.profiles add column if not exists resume_path text;
alter table public.profiles add column if not exists total_points integer default 0;
alter table public.profiles add column if not exists last_edited_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz default now();

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid()::text = id);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth.uid()::text = id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid()::text = id)
with check (auth.uid()::text = id);

-- =========================
-- ROADMAPS
-- =========================
create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  skill_name text not null,
  status text not null default 'saved',
  progress integer not null default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.roadmaps add column if not exists user_id text;
alter table public.roadmaps add column if not exists skill_name text;
alter table public.roadmaps add column if not exists status text default 'saved';
alter table public.roadmaps add column if not exists progress integer default 0;
alter table public.roadmaps add column if not exists is_public boolean default false;
alter table public.roadmaps add column if not exists created_at timestamptz default now();

alter table public.roadmaps enable row level security;

drop policy if exists roadmaps_select_own_or_public on public.roadmaps;
drop policy if exists roadmaps_insert_own on public.roadmaps;
drop policy if exists roadmaps_update_own on public.roadmaps;

create policy roadmaps_select_own_or_public
on public.roadmaps
for select
to authenticated
using (user_id = auth.uid()::text or is_public = true);

create policy roadmaps_insert_own
on public.roadmaps
for insert
to authenticated
with check (user_id = auth.uid()::text);

create policy roadmaps_update_own
on public.roadmaps
for update
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

-- =========================
-- ROADMAP WEEKS
-- =========================
create table if not exists public.roadmap_weeks (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  week_number integer not null,
  theme text,
  goals text[] default '{}',
  completed boolean default false,
  started_at timestamptz,
  completed_at timestamptz,
  earned_points integer default 0,
  score integer default 0,
  unique (roadmap_id, week_number)
);

alter table public.roadmap_weeks add column if not exists roadmap_id uuid;
alter table public.roadmap_weeks add column if not exists week_number integer;
alter table public.roadmap_weeks add column if not exists theme text;
alter table public.roadmap_weeks add column if not exists goals text[] default '{}';
alter table public.roadmap_weeks add column if not exists completed boolean default false;
alter table public.roadmap_weeks add column if not exists started_at timestamptz;
alter table public.roadmap_weeks add column if not exists completed_at timestamptz;
alter table public.roadmap_weeks add column if not exists earned_points integer default 0;
alter table public.roadmap_weeks add column if not exists score integer default 0;

alter table public.roadmap_weeks enable row level security;

drop policy if exists roadmap_weeks_select_related on public.roadmap_weeks;
drop policy if exists roadmap_weeks_insert_related on public.roadmap_weeks;
drop policy if exists roadmap_weeks_update_related on public.roadmap_weeks;

create policy roadmap_weeks_select_related
on public.roadmap_weeks
for select
to authenticated
using (
  exists (
    select 1 from public.roadmaps r
    where r.id = roadmap_weeks.roadmap_id
      and (r.user_id = auth.uid()::text or r.is_public = true)
  )
);

create policy roadmap_weeks_insert_related
on public.roadmap_weeks
for insert
to authenticated
with check (
  exists (
    select 1 from public.roadmaps r
    where r.id = roadmap_weeks.roadmap_id
      and r.user_id = auth.uid()::text
  )
);

create policy roadmap_weeks_update_related
on public.roadmap_weeks
for update
to authenticated
using (
  exists (
    select 1 from public.roadmaps r
    where r.id = roadmap_weeks.roadmap_id
      and r.user_id = auth.uid()::text
  )
)
with check (
  exists (
    select 1 from public.roadmaps r
    where r.id = roadmap_weeks.roadmap_id
      and r.user_id = auth.uid()::text
  )
);

-- =========================
-- WEEK RESOURCES
-- =========================
create table if not exists public.week_resources (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.roadmap_weeks(id) on delete cascade,
  title text,
  search_query text
);

alter table public.week_resources add column if not exists week_id uuid;
alter table public.week_resources add column if not exists title text;
alter table public.week_resources add column if not exists search_query text;

alter table public.week_resources enable row level security;

drop policy if exists week_resources_select_related on public.week_resources;
drop policy if exists week_resources_insert_related on public.week_resources;

create policy week_resources_select_related
on public.week_resources
for select
to authenticated
using (
  exists (
    select 1
    from public.roadmap_weeks w
    join public.roadmaps r on r.id = w.roadmap_id
    where w.id = week_resources.week_id
      and (r.user_id = auth.uid()::text or r.is_public = true)
  )
);

create policy week_resources_insert_related
on public.week_resources
for insert
to authenticated
with check (
  exists (
    select 1
    from public.roadmap_weeks w
    join public.roadmaps r on r.id = w.roadmap_id
    where w.id = week_resources.week_id
      and r.user_id = auth.uid()::text
  )
);

-- =========================
-- ROADMAP GLOBAL RESOURCES
-- =========================
create table if not exists public.roadmap_global_resources (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  category text,
  name text,
  description text,
  search_query text
);

alter table public.roadmap_global_resources add column if not exists roadmap_id uuid;
alter table public.roadmap_global_resources add column if not exists category text;
alter table public.roadmap_global_resources add column if not exists name text;
alter table public.roadmap_global_resources add column if not exists description text;
alter table public.roadmap_global_resources add column if not exists search_query text;

alter table public.roadmap_global_resources enable row level security;

drop policy if exists roadmap_global_resources_select_related on public.roadmap_global_resources;
drop policy if exists roadmap_global_resources_insert_related on public.roadmap_global_resources;

create policy roadmap_global_resources_select_related
on public.roadmap_global_resources
for select
to authenticated
using (
  exists (
    select 1 from public.roadmaps r
    where r.id = roadmap_global_resources.roadmap_id
      and (r.user_id = auth.uid()::text or r.is_public = true)
  )
);

create policy roadmap_global_resources_insert_related
on public.roadmap_global_resources
for insert
to authenticated
with check (
  exists (
    select 1 from public.roadmaps r
    where r.id = roadmap_global_resources.roadmap_id
      and r.user_id = auth.uid()::text
  )
);

-- =========================
-- QUIZ RESULTS
-- =========================
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  roadmap_id uuid,
  skill_name text,
  week_theme text,
  score integer,
  total_questions integer,
  points_earned integer,
  assessment_type text default 'standard',
  created_at timestamptz default now()
);

alter table public.quiz_results add column if not exists user_id text;
alter table public.quiz_results add column if not exists roadmap_id uuid;
alter table public.quiz_results add column if not exists skill_name text;
alter table public.quiz_results add column if not exists week_theme text;
alter table public.quiz_results add column if not exists score integer;
alter table public.quiz_results add column if not exists total_questions integer;
alter table public.quiz_results add column if not exists points_earned integer;
alter table public.quiz_results add column if not exists assessment_type text default 'standard';
alter table public.quiz_results add column if not exists created_at timestamptz default now();

alter table public.quiz_results enable row level security;

drop policy if exists quiz_results_select_own on public.quiz_results;
drop policy if exists quiz_results_insert_own on public.quiz_results;

create policy quiz_results_select_own
on public.quiz_results
for select
to authenticated
using (user_id = auth.uid()::text);

create policy quiz_results_insert_own
on public.quiz_results
for insert
to authenticated
with check (user_id = auth.uid()::text);

-- =========================
-- RESUME STORAGE BUCKET + POLICIES
-- =========================
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists resume_insert_own_folder on storage.objects;
drop policy if exists resume_select_own_folder on storage.objects;
drop policy if exists resume_update_own_folder on storage.objects;
drop policy if exists resume_delete_own_folder on storage.objects;

create policy resume_insert_own_folder
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy resume_select_own_folder
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy resume_update_own_folder
on storage.objects
for update
to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy resume_delete_own_folder
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================
-- VERIFY
-- =========================
select policyname, schemaname, tablename
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

notify pgrst, 'reload schema';
