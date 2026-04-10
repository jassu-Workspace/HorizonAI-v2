-- Horizon AI profile schema hotfix
-- Run this in the Supabase SQL Editor for the production project.
-- It is safe to run multiple times.

-- Diagnostics: shows which expected columns are still missing from public.profiles.
with expected_columns(table_name, column_name) as (
    values
        ('profiles', 'id'),
        ('profiles', 'full_name'),
        ('profiles', 'role'),
        ('profiles', 'academic_level'),
        ('profiles', 'stream'),
        ('profiles', 'academic_course'),
        ('profiles', 'interested_subjects'),
        ('profiles', 'skill_division'),
        ('profiles', 'previous_performance'),
        ('profiles', 'learning_style'),
        ('profiles', 'focus_area'),
        ('profiles', 'class_10_performance'),
        ('profiles', 'class_12_stream'),
        ('profiles', 'class_12_performance'),
        ('profiles', 'diploma_performance'),
        ('profiles', 'resume_path'),
        ('profiles', 'total_points'),
        ('profiles', 'last_edited_at'),
        ('profiles', 'updated_at')
)
select
    e.table_name,
    e.column_name as missing_column
from expected_columns e
left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = e.table_name
   and c.column_name = e.column_name
where c.column_name is null
order by e.table_name, e.column_name;

-- Fix the profiles table so onboarding can save without schema-cache errors.
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

-- Normalize older role values to the current app roles.
update public.profiles
set role = 'admin'
where role = 'policymaker';

update public.profiles
set role = 'user'
where role = 'learner'
   or role is null
   or role not in ('user', 'trainer', 'admin');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('user', 'trainer', 'admin'));
  end if;
end $$;

alter table public.profiles enable row level security;

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

-- A security-definer upsert function bypasses RLS for profile saves while still
-- forcing the row id to the authenticated user's id.
create or replace function public.save_or_update_profile(profile_data jsonb)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id text := auth.uid()::text;
  saved_profile public.profiles;
  requested_role text := lower(coalesce(nullif(profile_data->>'role', ''), 'user'));
begin
  if current_user_id is null then
    raise exception 'User not authenticated';
  end if;

  insert into public.profiles (
    id,
    full_name,
    role,
    academic_level,
    stream,
    academic_course,
    interested_subjects,
    skill_division,
    previous_performance,
    learning_style,
    focus_area,
    class_10_performance,
    class_12_stream,
    class_12_performance,
    diploma_performance,
    resume_path,
    total_points,
    last_edited_at,
    updated_at
  ) values (
    current_user_id,
    nullif(profile_data->>'full_name', ''),
    case
      when requested_role in ('user', 'trainer', 'admin') then requested_role
      else 'user'
    end,
    nullif(profile_data->>'academic_level', ''),
    nullif(profile_data->>'stream', ''),
    nullif(profile_data->>'academic_course', ''),
    nullif(profile_data->>'interested_subjects', ''),
    nullif(profile_data->>'skill_division', '')::integer,
    nullif(profile_data->>'previous_performance', ''),
    nullif(profile_data->>'learning_style', ''),
    nullif(profile_data->>'focus_area', ''),
    nullif(profile_data->>'class_10_performance', ''),
    nullif(profile_data->>'class_12_stream', ''),
    nullif(profile_data->>'class_12_performance', ''),
    nullif(profile_data->>'diploma_performance', ''),
    nullif(profile_data->>'resume_path', ''),
    coalesce(nullif(profile_data->>'total_points', '')::integer, 0),
    nullif(profile_data->>'last_edited_at', '')::timestamptz,
    nullif(profile_data->>'updated_at', '')::timestamptz
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role,
    academic_level = excluded.academic_level,
    stream = excluded.stream,
    academic_course = excluded.academic_course,
    interested_subjects = excluded.interested_subjects,
    skill_division = excluded.skill_division,
    previous_performance = excluded.previous_performance,
    learning_style = excluded.learning_style,
    focus_area = excluded.focus_area,
    class_10_performance = excluded.class_10_performance,
    class_12_stream = excluded.class_12_stream,
    class_12_performance = excluded.class_12_performance,
    diploma_performance = excluded.diploma_performance,
    resume_path = excluded.resume_path,
    total_points = excluded.total_points,
    last_edited_at = excluded.last_edited_at,
    updated_at = excluded.updated_at
  returning * into saved_profile;

  return saved_profile;
end;
$$;

revoke all on function public.save_or_update_profile(jsonb) from public;
grant execute on function public.save_or_update_profile(jsonb) to authenticated;

-- Refresh PostgREST schema cache after applying the migration.
-- Using a DO block avoids returning a noisy pg_notify result row in the SQL editor.
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;