import { RoadmapData } from '../types';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3004';

export type RoadmapGenerationJob = {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  skill: string;
  userLevel: 'Beginner' | 'Intermediate' | 'Expert';
  interestDomain: string;
  roadmap?: RoadmapData;
  error?: string;
  createdAt: string;
};

// Store jobs in memory (in production, would use database/Redis)
const jobStore = new Map<string, RoadmapGenerationJob>();

/**
 * Create a new roadmap generation job
 */
export const createRoadmapJob = async (payload: {
  skill: string;
  userLevel: 'Beginner' | 'Intermediate' | 'Expert';
  interestDomain: string;
  weeks?: number;
}): Promise<{ jobId: string }> => {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const job: RoadmapGenerationJob = {
    id: jobId,
    status: 'pending',
    skill: payload.skill,
    userLevel: payload.userLevel,
    interestDomain: payload.interestDomain,
    createdAt: new Date().toISOString(),
  };

  jobStore.set(jobId, job);

  // Immediately start the job in the background
  generateRoadmapBackground(jobId, payload).catch(error => {
    console.error(`[jobService] Background generation failed for ${jobId}:`, error);
    const job = jobStore.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }
  });

  return { jobId };
};

/**
 * Generate roadmap in background
 */
const generateRoadmapBackground = async (
  jobId: string,
  payload: {
    skill: string;
    userLevel: 'Beginner' | 'Intermediate' | 'Expert';
    interestDomain: string;
    weeks?: number;
  },
) => {
  try {
    const job = jobStore.get(jobId);
    if (!job) throw new Error('Job not found');

    console.log(`[jobService] Starting roadmap generation for job ${jobId}`);

    // Call backend to generate roadmap
    const response = await fetch(`${BACKEND_URL}/api/roadmap/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.roadmap) {
      throw new Error('Invalid roadmap response');
    }

    console.log(`[jobService] Roadmap generated for job ${jobId}`);

    // Transform to RoadmapData format
    const roadmapData: RoadmapData = {
      skill: payload.skill,
      roadmap: data.roadmap.map((week: any, idx: number) => ({
        week: week.week || idx + 1,
        theme: week.theme || `Week ${idx + 1}`,
        goals: Array.isArray(week.goals) ? week.goals : [],
        resources: (Array.isArray(week.resources) ? week.resources : []).map((r: string) => ({
          title: r,
          searchQuery: r,
        })),
        completed: false,
      })),
      freePlatforms: [],
      paidPlatforms: [],
      books: [],
      status: 'active',
      progress: 0,
      isPublic: false,
    };

    job.status = 'completed';
    job.roadmap = roadmapData;
  } catch (error) {
    console.error(`[jobService] Roadmap generation failed for job ${jobId}:`, error);
    const job = jobStore.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }
    throw error;
  }
};

/**
 * Run a job (legacy, jobs run immediately now)
 */
export const runJob = async (jobId: string) => {
  const job = jobStore.get(jobId);
  if (!job) {
    throw new Error('Job not found');
  }
  return { status: job.status };
};

/**
 * Get job status
 */
export const getJob = async (jobId: string): Promise<RoadmapGenerationJob> => {
  const job = jobStore.get(jobId);
  if (!job) {
    throw new Error('Job not found');
  }
  return job;
};

/**
 * Get active roadmap job for a user
 */
export const getActiveRoadmapJob = async (userId?: string): Promise<RoadmapGenerationJob | null> => {
  // In production, would query database for user's jobs
  // For now, return null
  return null;
};

/**
 * Get persisted workflow state
 */
export const getPersistedWorkflowState = async (userId?: string): Promise<any> => {
  // In production, would query database
  return null;
};

/**
 * Clear workflow state
 */
export const clearWorkflowState = async (userId?: string) => {
  return { ok: true };
};

/**
 * Transform job result to roadmap format
 */
export const toRoadmapResult = (jobResult: RoadmapGenerationJob) => {
  if (jobResult.status === 'completed' && jobResult.roadmap) {
    return jobResult.roadmap;
  }
  return null;
};

export default { createRoadmapJob, runJob, getJob };

