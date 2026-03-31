-- Horizon AI - full idempotent Supabase schema
-- Run in Supabase SQL Editor as role postgres.

create extension if not exists pgcrypto;

-- =========================
-- PROFILES
-- =========================
create table if not exists public.profiles (
  id text primary key,
  full_name text,
  role text default 'user',
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

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text default 'user';
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

update public.profiles
set role = case
  when role is null then 'user'
  when lower(trim(role)) in ('policymaker', 'administrator', 'superadmin', 'owner') then 'admin'
  when lower(trim(role)) in ('learner', 'student', 'member', 'basic', 'normal') then 'user'
  when lower(trim(role)) in ('mentor', 'coach') then 'trainer'
  when lower(trim(role)) in ('user', 'trainer', 'admin') then lower(trim(role))
  else 'user'
end;

alter table public.profiles
  alter column role set default 'user';

update public.profiles
set role = 'user'
where role is null
   or role not in ('user', 'trainer', 'admin');

alter table public.profiles
  alter column role set not null;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'trainer', 'admin'));

create or replace function public.prevent_client_role_escalation()
returns trigger
language plpgsql
as $$
declare
  jwt_role text;
begin
  jwt_role := coalesce(current_setting('request.jwt.claim.role', true), '');

  if tg_op = 'INSERT' then
    if jwt_role <> 'service_role' then
      new.role := 'user';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if jwt_role <> 'service_role' and new.role is distinct from old.role then
      raise exception 'role changes are restricted to backend service role';
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_client_role_escalation on public.profiles;

create trigger trg_prevent_client_role_escalation
before insert or update on public.profiles
for each row
execute function public.prevent_client_role_escalation();

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid()::text = id::text);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth.uid()::text = id::text);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid()::text = id::text)
with check (auth.uid()::text = id::text);

create table if not exists public.ai_usage_daily (
  user_id uuid not null,
  usage_date date not null,
  tokens_used integer not null default 0,
  request_count integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_usage_daily add column if not exists user_id uuid;
alter table public.ai_usage_daily add column if not exists usage_date date;
alter table public.ai_usage_daily add column if not exists tokens_used integer default 0;
alter table public.ai_usage_daily add column if not exists request_count integer default 0;
alter table public.ai_usage_daily add column if not exists blocked_until timestamptz;
alter table public.ai_usage_daily add column if not exists updated_at timestamptz default now();
alter table public.ai_usage_daily add column if not exists created_at timestamptz default now();

alter table public.ai_usage_daily enable row level security;

drop policy if exists ai_usage_daily_select_own on public.ai_usage_daily;
drop policy if exists ai_usage_daily_insert_own on public.ai_usage_daily;
drop policy if exists ai_usage_daily_update_own on public.ai_usage_daily;

create policy ai_usage_daily_select_own
on public.ai_usage_daily
for select
to authenticated
using (auth.uid()::text = user_id::text);

create policy ai_usage_daily_insert_own
on public.ai_usage_daily
for insert
to authenticated
with check (auth.uid()::text = user_id::text);

create policy ai_usage_daily_update_own
on public.ai_usage_daily
for update
to authenticated
using (auth.uid()::text = user_id::text)
with check (auth.uid()::text = user_id::text);

-- =========================
-- RESUMABLE JOBS
-- =========================
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  status text not null default 'pending',
  progress integer not null default 0,
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_status_check check (status in ('pending', 'running', 'completed', 'failed')),
  constraint jobs_progress_check check (progress >= 0 and progress <= 100)
);

alter table public.jobs add column if not exists user_id uuid;
alter table public.jobs add column if not exists type text;
alter table public.jobs add column if not exists status text default 'pending';
alter table public.jobs add column if not exists progress integer default 0;
alter table public.jobs add column if not exists idempotency_key text;
alter table public.jobs add column if not exists payload jsonb default '{}'::jsonb;
alter table public.jobs add column if not exists result jsonb;
alter table public.jobs add column if not exists error text;
alter table public.jobs add column if not exists created_at timestamptz default now();
alter table public.jobs add column if not exists updated_at timestamptz default now();

do $$
begin
  begin
    create unique index if not exists jobs_user_type_idempotency_idx
      on public.jobs (user_id, type, idempotency_key);
  exception
    when unique_violation then
      raise notice 'Skipped jobs_user_type_idempotency_idx due to duplicate rows.';
  end;
end $$;

create index if not exists jobs_user_status_updated_idx
  on public.jobs (user_id, status, updated_at desc);

alter table public.jobs enable row level security;

drop policy if exists jobs_select_own on public.jobs;
drop policy if exists jobs_insert_own on public.jobs;
drop policy if exists jobs_update_own on public.jobs;

create policy jobs_select_own
on public.jobs
for select
to authenticated
using (auth.uid()::text = user_id::text);

create policy jobs_insert_own
on public.jobs
for insert
to authenticated
with check (auth.uid()::text = user_id::text);

create policy jobs_update_own
on public.jobs
for update
to authenticated
using (auth.uid()::text = user_id::text)
with check (auth.uid()::text = user_id::text);

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
using (user_id::text = auth.uid()::text or is_public = true);

create policy roadmaps_insert_own
on public.roadmaps
for insert
to authenticated
with check (user_id::text = auth.uid()::text);

create policy roadmaps_update_own
on public.roadmaps
for update
to authenticated
using (user_id::text = auth.uid()::text)
with check (user_id::text = auth.uid()::text);

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
    select 1
    from public.roadmaps r
    where r.id::text = roadmap_weeks.roadmap_id::text
      and (r.user_id::text = auth.uid()::text or r.is_public = true)
  )
);

create policy roadmap_weeks_insert_related
on public.roadmap_weeks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.roadmaps r
    where r.id::text = roadmap_weeks.roadmap_id::text
      and r.user_id::text = auth.uid()::text
  )
);

create policy roadmap_weeks_update_related
on public.roadmap_weeks
for update
to authenticated
using (
  exists (
    select 1
    from public.roadmaps r
    where r.id::text = roadmap_weeks.roadmap_id::text
      and r.user_id::text = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public.roadmaps r
    where r.id::text = roadmap_weeks.roadmap_id::text
      and r.user_id::text = auth.uid()::text
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
    join public.roadmaps r on r.id::text = w.roadmap_id::text
    where w.id::text = week_resources.week_id::text
      and (r.user_id::text = auth.uid()::text or r.is_public = true)
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
    join public.roadmaps r on r.id::text = w.roadmap_id::text
    where w.id::text = week_resources.week_id::text
      and r.user_id::text = auth.uid()::text
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
    select 1
    from public.roadmaps r
    where r.id::text = roadmap_global_resources.roadmap_id::text
      and (r.user_id::text = auth.uid()::text or r.is_public = true)
  )
);

create policy roadmap_global_resources_insert_related
on public.roadmap_global_resources
for insert
to authenticated
with check (
  exists (
    select 1
    from public.roadmaps r
    where r.id::text = roadmap_global_resources.roadmap_id::text
      and r.user_id::text = auth.uid()::text
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
using (user_id::text = auth.uid()::text);

create policy quiz_results_insert_own
on public.quiz_results
for insert
to authenticated
with check (user_id::text = auth.uid()::text);

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