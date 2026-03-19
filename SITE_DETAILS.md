# Horizon AI - Complete Site Details

## 1. Project Summary
Horizon AI is a personalized learning and career navigation web app.
It helps users choose skills, run a rapid assessment, generate a structured learning roadmap, complete weekly assessments, and track progress.

It also includes:
- Resume upload and analysis support
- AI coach chat support
- Role-specific dashboard experiences (Learner, Trainer, Policymaker)
- Share/import roadmap workflows

## 2. Current Tech Stack
- Frontend: React 18 + TypeScript + Vite
- Routing: React Router
- Styling: Tailwind utility classes (via CDN in index.html)
- Charts: Recharts
- Backend API routes: Vercel serverless functions under api/
- Local dev backend proxy: api-server.ts (Express + OpenAI SDK)
- AI provider path: NVIDIA-compatible OpenAI API base
- Database/Auth/Storage: Supabase

## 3. Runtime Architecture
- Browser app calls internal API endpoint /api/chat for AI generation.
- Vercel serverless function handles model routing, key routing, retries, cooldown logic.
- Supabase handles auth, profile data, roadmap storage, progress storage, resume files.
- pdf.js is loaded in browser for PDF extraction workflows.

## 4. Project Root Files
- api-server.ts: Local development API proxy server.
- App.tsx: Main app shell, state orchestration, routes, modal wiring.
- index.tsx: Frontend bootstrap.
- index.html: Base HTML, script includes (Tailwind CDN, Ionicons, Vanta, PDF.js).
- types.ts: Shared TypeScript interfaces/types.
- supabase_schema.sql: Schema and policy bootstrap.
- package.json: Dependencies and scripts.
- vercel.json: Vercel rewrites and framework config.
- vite.config.ts: Vite bundler configuration.
- tsconfig.json: TypeScript compiler settings.

## 5. Folder-by-Folder Inventory

### api/
- chat.ts: Main AI endpoint for model calls and key routing.
- health.ts: Health check endpoint for runtime status and configured key count.

### components/
- AcademicTimelineModal.tsx
- AiCoachFab.tsx
- AiCoachModal.tsx
- Auth.tsx
- BackgroundAnimation.tsx
- BackgroundEmojis.tsx
- CareerDetailsModal.tsx
- ConfigureRoadmap.tsx
- Dashboard.tsx
- DebateModal.tsx
- DeepDiveModal.tsx
- FlashcardModal.tsx
- Header.tsx
- ImportModal.tsx
- InputForm.tsx
- IntroOverlay.tsx
- JobTrendChart.tsx
- Loader.tsx
- MockInterviewModal.tsx
- Modal.tsx
- Onboarding.tsx
- PolicymakerDashboard.tsx
- ProfileEditModal.tsx
- ProjectDetailsModal.tsx
- ProjectModal.tsx
- QuizModal.tsx
- Roadmap.tsx
- ShareModal.tsx
- SkillLevelQuizModal.tsx
- Suggestions.tsx
- TrainerDashboard.tsx
- WeekAssessmentModal.tsx

### services/
- geminiService.ts: Core client-side AI request functions and prompt assembly.
- geminiService.ts.backup: Backup copy.
- newsService.ts: Education/news fetch layer.
- openRouterService.ts: Alternate provider service path.
- perplexityService.ts: Alternate provider service path.
- supabaseService.ts: Supabase auth/data/storage helpers.

## 6. Core User Flow (Learner)
1. Auth or onboarding.
2. User provides target skill and interest domain.
3. App fetches AI skill suggestions.
4. User selects skill.
5. Rapid assessment determines level.
6. App generates personalized roadmap.
7. User tracks weekly completion and points.
8. User uses AI tools (quiz, flashcards, deep dive, scenarios, etc.).
9. User can save, share, import, and continue in dashboard.

## 7. App Routes (from App.tsx)
- /auth
- /onboarding
- /dashboard
- /create
- /suggestions
- /configure
- /roadmap
- /loading
- /error
- /
- * (redirects to /)

## 8. API Endpoints

### GET /api/health
Purpose:
- Health check for Vercel API route status.
- Reports how many NVIDIA keys are configured.

Response shape:
- status
- message
- keysConfigured

### POST /api/chat
Purpose:
- Receives model + messages request payload.
- Validates requested model.
- Selects key using slot mapping and availability.
- Handles retries and cooldown windows.
- Falls back from GLM model to Llama when not-found cases occur.

Accepted models:
- z-ai/glm4.7
- meta/llama-3.1-405b-instruct
- mistralai/mistral-7b-instruct-v0.2

## 9. AI Key Routing Logic
Key pool sources:
- NVIDIA_API_KEY_1
- NVIDIA_API_KEY_2
- NVIDIA_API_KEY_3
- NVIDIA_API_KEY (default/fallback)

Model-to-slot preference:
- GLM variants -> slot 1
- Llama -> slot 2
- Mistral -> slot 3

Resilience behavior:
- Round-robin selection among available keys.
- Rate-limit cooldown and generic error cooldown.
- Max attempts controlled via env.

## 10. Environment Variables

### Frontend
- VITE_API_PROXY_BASE
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

### Backend / Vercel API
- NVIDIA_API_BASE
- NVIDIA_API_KEY_1
- NVIDIA_API_KEY_2
- NVIDIA_API_KEY_3
- NVIDIA_API_KEY
- NVIDIA_KEY_RATE_LIMIT_COOLDOWN_MS
- NVIDIA_KEY_ERROR_COOLDOWN_MS
- NVIDIA_KEY_MAX_RETRIES
- BACKEND_PORT (local api-server only)

## 11. NPM Scripts
- npm run dev: Runs Vite + local backend proxy concurrently.
- npm run dev:frontend: Runs frontend only.
- npm run dev:backend: Runs backend proxy only.
- npm run build: Creates production bundle.
- npm run preview: Previews production build.

## 12. Deployment Details (Vercel)
vercel.json rewrite behavior:
- /api/(.*) -> /api/$1
- /(.*) -> /index.html

This allows:
- API calls through Vercel serverless routes
- SPA routing fallback to frontend app

## 13. Mobile Reliability and Responsiveness Status
Recent improvements in the codebase include:
- Header layout refactor for better small-screen alignment
- Better mobile spacing and button behavior on key screens
- Floating action button safe-area alignment
- API call hardening in frontend service:
  - candidate endpoint fallback order to reduce mobile-only fetch failures

## 14. Data Layer Overview (Supabase)
Main entities referenced in project docs and codebase include:
- profiles
- roadmaps
- roadmap_weeks
- week_resources
- roadmap_global_resources
- quiz_results
- storage.objects (resume storage policies)

## 15. Security and Operational Notes
- Keep .env secrets private and never commit real keys.
- Keep resume storage bucket private.
- Use RLS policies for profile and storage access.
- Monitor /api/health after deployment.
- Validate all required env vars in Vercel before production testing.

## 16. Recommended Verification Checklist
After each deployment:
1. Open /api/health and confirm status is ok.
2. Complete create -> suggestions -> configure -> roadmap flow.
3. Verify /api/chat calls return on both laptop and mobile.
4. Verify dashboard loading and resume features.
5. Test share/import roadmap links.
6. Run quick dark/light mode and language switch checks.

## 17. Quick Start Commands
Use project folder:
- cd "D:\Projects\nvidia\Final Horizon AI"

Install and run:
- npm install
- npm run dev

Build:
- npm run build

## 18. Ownership Context
This project is described in existing docs as built by Team Portgas D Ace for Smart India Hackathon.
