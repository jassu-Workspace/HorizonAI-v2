-- ============================================================================
-- HORIZON AI - DATABASE DIAGNOSTIC QUERIES
-- Run these in Supabase SQL Editor to diagnose auth/profile issues
-- ============================================================================

-- =================================================================
-- 1. CHECK PROFILE CREATION & AUTH STATUS
-- =================================================================

-- Check if profiles exist for recent auth users
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  p.id as profile_id,
  p.full_name,
  p.role,
  p.created_at as profile_created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id::text = p.id
ORDER BY u.created_at DESC
LIMIT 20;

-- =================================================================
-- 2. CHECK RLS POLICIES ON PROFILES TABLE
-- =================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- =================================================================
-- 3. CHECK PROFILES TABLE STRUCTURE
-- =================================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =================================================================
-- 4. CHECK CURRENT AUTH SESSION
-- =================================================================

-- Run this AFTER logging in to check your current user's auth status
SELECT 
  auth.uid() as current_user_id,
  auth.uid()::text as user_id_as_text;

-- =================================================================
-- 5. DEBUG: Try inserting test profile (will show RLS error if blocked)
-- =================================================================

-- This will show if RLS is preventing profile insertion
-- Replace 'test-user-id' with an actual user UUID
/*
INSERT INTO public.profiles (id, full_name, role, academic_level, stream, focus_area)
VALUES ('test-user-id', 'Test User', 'user', 'Graduation', 'Engineering', 'General')
ON CONFLICT (id) DO UPDATE SET full_name = 'Test User Updated';
*/

-- =================================================================
-- 6. VERIFY PROFILE INSERT TRIGGER
-- =================================================================

SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles' AND trigger_schema = 'public';

-- =================================================================
-- 7. CHECK FOR PROFILE CREATION ERRORS IN LOGS
-- =================================================================

-- Check auth logs for recent events (safe query - uses only guaranteed columns)
SELECT 
  id,
  created_at
FROM auth.audit_log_entries
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 30;

-- =================================================================
-- 8. CHECK AI_USAGE_DAILY RLS POLICIES
-- =================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'ai_usage_daily'
ORDER BY policyname;

-- =================================================================
-- 9. CHECK ROADMAPS TABLE RLS POLICIES
-- =================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'roadmaps'
ORDER BY policyname;

-- =================================================================
-- 10. VERIFY: RLS Policy ID Type Matching (FIXED)
-- =================================================================

-- Check if profiles table ID column type matches auth.users.id type
SELECT 
  (SELECT data_type FROM information_schema.columns 
   WHERE table_name = 'profiles' AND column_name = 'id' AND table_schema = 'public') as profiles_id_type,
  (SELECT data_type FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'id' AND table_schema = 'auth') as auth_users_id_type;

-- FIXED: Both should now be UUID type (matching)
-- RLS policies now correctly match: auth.uid() = id (both UUID)
