import React from 'react';

// Augment the global scope to add custom elements without overwriting standard ones
declare global {
    namespace JSX {
        interface IntrinsicElements {
            // Explicitly define ion-icon with a flexible type to avoid TS errors
            'ion-icon': any;
        }
    }
}

export type UserRole = 'learner' | 'trainer' | 'policymaker';

export interface Suggestion {
  name: string;
  description: string;
}

export interface Resource {
  title: string;
  searchQuery: string;
}

export interface RoadmapWeek {
  week: number;
  theme: string;
  goals: string[];
  resources: Resource[];
  completed?: boolean; 
  startedAt?: string; // ISO Timestamp
  completedAt?: string; // ISO Timestamp
  earnedPoints?: number; // Gamification
  score?: number; // Assessment score
}

export interface Platform {
    name: string;
    description: string;
    searchQuery: string;
}

export interface RoadmapData {
  id?: string; // From DB
  skill: string;
  roadmap: RoadmapWeek[];
  freePlatforms: Platform[];
  paidPlatforms: Platform[];
  books: Platform[];
  created_at?: string;
  status?: 'active' | 'saved' | 'completed'; 
  progress?: number; // Percentage 0-100
  isPublic?: boolean; // For Sharing
}

export interface ChatMessage {
    role: 'user' | 'model' | 'antagonist';
    content: string;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
}

export interface RapidQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
}

export interface Flashcard {
    term: string;
    definition: string;
}

// Deprecated AppState enum (keeping for reference if needed during migration but unused in Routes)
export enum AppState {
    INTRO,
    AUTH,
    ONBOARDING,
    DASHBOARD,
    INPUT,
    SUGGESTIONS,
    CONFIG_ROADMAP,
    ROADMAP,
    LOADING,
    ERROR
}

export type LearningStyle = "Balanced" | "Visual" | "Practical" | "Theoretical";
export type AcademicLevel = "Class 10" | "Class 12" | "Diploma / Polytechnic" | "Graduation" | "Post Graduation";
export type Stream = "General" | "Science" | "Commerce" | "Biology" | "Engineering" | "Arts" | "Medical" | "Diploma Engineering" | "Arts & Commerce" | "Science & Technology";
export type FocusArea = "General" | "NCVET/NSQF Aligned" | "Govt. Job Exams" | "Higher Education Abroad" | "Startup / Entrepreneurship" | "Freelancing & Gigs";

export interface UserProfile {
    id?: string; // Supabase UUID
    fullName?: string;
    role?: UserRole; // Added Role
    skills: string;
    interests: string;
    learningStyle: LearningStyle;
    academicLevel: AcademicLevel;
    stream: Stream;
    academicCourse?: string; // Specific course like "CSE", "B.Ed" (Acts as Branch)
    specialization?: string; // Added Specialization (Acts as Academics)
    skillDivision?: number; // 1 (Expert) to 5 (Novice) - Kept for legacy compatibility
    focusArea: FocusArea;
    previousPerformance?: string; 
    interestedSubjects?: string; 
    lastEdited?: string; // Timestamp for 24h edit lock
    totalPoints?: number; // Gamification points
    class10Performance?: string;
    class12Stream?: string;
    class12Performance?: string;
    diplomaPerformance?: string;
    resumePath?: string; // Path to the resume in Supabase storage
}

export interface QuizResult {
    skill: string;
    weekTheme?: string;
    score: number;
    totalQuestions: number;
    timestamp: string;
    roadmapId?: string;
    pointsEarned?: number;
    assessmentType?: 'standard' | 'assignment';
}

export interface AssessmentResult {
    passed: boolean;
    score: number;
    pointsAwarded: number;
}

export interface Project {
    title: string;
    description: string;
}

export interface ProjectDetails {
    project_overview: string;
    core_features: string[];
    tech_stack_suggestions: string[];
}

export interface Toughness {
    toughness: number;
    justification: string;
}

export interface JobTrendData {
    trend: "high growth" | "moderate growth" | "stable" | "declining";
    base_jobs: number;
}

export interface AcademicSuggestion {
    name: string;
    description: string;
    searchQuery: string;
}

export interface TimelineEvent {
    eventName: string;
    eventType: string;
    estimatedDate: string;
    description: string;
}

export interface OfflineCenter {
    name: string;
    description: string;
    searchQuery: string;
}

export interface Career {
    title: string;
    description: string;
}

export interface Salary {
    fresher: string;
    intermediate: string; // 3+ years
    expert: string; // 5+ years
}

export interface CareerDetails {
    key_responsibilities: string[];
    key_roles: string[];
    salary_expectations: Salary;
    top_recruiting_companies: string[];
}

export interface MockInterview {
    theory_questions: string[];
    mcq_questions: QuizQuestion[];
}

export interface StudyPlanItem {
    activity: string;
    duration_minutes: number;
}

export interface SetupStep {
    title: string;
    description: string;
    searchQuery: string;
    resourceLink?: string; 
}

export interface RealWorldScenario {
    scenario_title: string;
    problem_statement: string;
    key_tasks: string[];
}

export interface ConceptConnection {
    field: string;
    explanation: string;
}

export interface Debate {
    topic: string;
    opening_statement: string;
}

export interface CareerRecommendation {
    career_title: string;
    reason: string;
    next_steps: string[];
}

export interface ResumeAnalysis {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
}

export interface NewsArticle {
    article_id: string;
    title: string;
    link: string;
    description?: string;
    pubDate: string;
    image_url?: string;
    source_id: string;
}