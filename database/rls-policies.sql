/**
 * SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
 * ==========================================
 * Ensure users can only access their own data
 * Run these SQL commands in Supabase SQL Editor
 */

-- ============================================
-- DATABASE SCHEMA (CREATE TABLES FIRST)
-- ============================================

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  role text DEFAULT 'user', -- 'user', 'admin', 'moderator'
  status text DEFAULT 'active', -- 'active', 'inactive', 'banned'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  academic_level text, -- 'Class 10', 'Class 12', 'Graduation', etc.
  stream text, -- 'Engineering', 'Commerce', 'Science', etc.
  academic_course text, -- 'CSE', 'ECE', 'Mechanical', etc.
  specialization text, -- Student's specialization
  skills text[], -- Array of skills
  interests text[], -- Array of interest domains
  learning_style text DEFAULT 'Balanced', -- 'Visual', 'Practical', 'Theoretical'
  focus_area text DEFAULT 'General', -- 'NCVET/NSQF Aligned', 'Govt. Job Exams', etc.
  bio text,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create roadmaps table
CREATE TABLE IF NOT EXISTS public.roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  interest_domain text,
  level text NOT NULL, -- 'Beginner', 'Intermediate', 'Expert'
  weeks integer NOT NULL,
  content jsonb NOT NULL, -- Roadmap content/structure
  status text DEFAULT 'active', -- 'active', 'archived', 'completed'
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create quiz_results table
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  roadmap_id uuid REFERENCES public.roadmaps(id) ON DELETE SET NULL,
  skill_name text NOT NULL,
  week_theme text,
  score integer NOT NULL,
  total_questions integer NOT NULL,
  points_earned integer DEFAULT 0,
  assessment_type text DEFAULT 'standard', -- 'standard', 'assignment'
  created_at timestamp with time zone DEFAULT now()
);

-- Create learning_progress table
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  roadmap_id uuid NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  week_index integer NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  progress_percentage integer DEFAULT 0,
  last_accessed_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_roadmaps_user_id ON public.roadmaps(user_id);
CREATE INDEX idx_roadmaps_skill_name ON public.roadmaps(skill_name);
CREATE INDEX idx_quiz_results_user_id ON public.quiz_results(user_id);
CREATE INDEX idx_quiz_results_roadmap_id ON public.quiz_results(roadmap_id);
CREATE INDEX idx_learning_progress_user_id ON public.learning_progress(user_id);
CREATE INDEX idx_learning_progress_roadmap_id ON public.learning_progress(roadmap_id);

-- ============================================
-- TRIGGERS FOR TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_timestamp
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_profiles_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_roadmaps_timestamp
  BEFORE UPDATE ON public.roadmaps
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_learning_progress_timestamp
  BEFORE UPDATE ON public.learning_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ============================================
-- ENABLE RLS ON ALL TABLES (After tables created)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PUBLIC.USERS TABLE POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow initial user creation (for signup)
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Users can read their own profile data
CREATE POLICY "Users can read own profile data"
  ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile data
CREATE POLICY "Users can update own profile data"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own profile data
CREATE POLICY "Users can insert own profile data"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ROADMAPS TABLE POLICIES
-- ============================================

-- Users can read their own roadmaps
CREATE POLICY "Users can read own roadmaps"
  ON roadmaps
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create roadmaps
CREATE POLICY "Users can create roadmaps"
  ON roadmaps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own roadmaps
CREATE POLICY "Users can update own roadmaps"
  ON roadmaps
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own roadmaps
CREATE POLICY "Users can delete own roadmaps"
  ON roadmaps
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- QUIZ_RESULTS TABLE POLICIES
-- ============================================

-- Users can read their own quiz results
CREATE POLICY "Users can read own quiz results"
  ON quiz_results
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create quiz results
CREATE POLICY "Users can create quiz results"
  ON quiz_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own quiz results
CREATE POLICY "Users can update own quiz results"
  ON quiz_results
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- LEARNING_PROGRESS TABLE POLICIES
-- ============================================

-- Users can read their own progress
CREATE POLICY "Users can read own progress"
  ON learning_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create progress records
CREATE POLICY "Users can create progress records"
  ON learning_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
  ON learning_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- ADMIN POLICIES (OPTIONAL)
-- ============================================

-- Admins can read all users data
CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Admins can delete users
CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- PUBLIC DATA ACCESS (No Auth Required)
-- ============================================

-- Allow public read-only access to course data
CREATE TABLE IF NOT EXISTS public_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public_courses DISABLE ROW LEVEL SECURITY;
