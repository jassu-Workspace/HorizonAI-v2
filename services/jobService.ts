import { RoadmapData, UserProfile } from '../types';
import { supabase } from './supabaseService';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type WorkflowJob<TPayload = Record<string, unknown>, TResult = Record<string, unknown>> = {
    id: string;
    user_id: string;
    type: string;
    status: JobStatus;
    progress: number;
    idempotency_key: string;
    payload: TPayload;
    result: TResult | null;
    error: string | null;
    created_at: string;
    updated_at: string;
};

const ACTIVE_JOB_ID_KEY = 'horizon.activeRoadmapJobId';
const ACTIVE_STEP_KEY = 'horizon.workflowStep';

const getApiBase = (): string => {
    return '/api';
};

const readToken = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
        throw new Error('Please sign in to continue.');
    }
    return token;
};

const authHeaders = (token: string): Record<string, string> => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
});

const stableHash = (value: string): string => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return String(hash >>> 0);
};

const makeRoadmapIdempotencyKey = (
    skill: string,
    weeks: string,
    level: string,
    profile: UserProfile,
): string => {
    const normalized = JSON.stringify({
        skill: skill.trim().toLowerCase(),
        weeks: String(weeks || '').trim(),
        level: String(level || '').trim().toLowerCase(),
        profile: {
            academicLevel: profile.academicLevel,
            stream: profile.stream,
            academicCourse: profile.academicCourse,
            focusArea: profile.focusArea,
            learningStyle: profile.learningStyle,
            interests: profile.interests,
            skills: profile.skills,
        },
    });
    return `roadmap_${stableHash(normalized)}`;
};

const parseJson = async <T>(response: Response): Promise<T> => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(String((body as any)?.error || 'Request failed'));
    }
    return body as T;
};

export const persistWorkflowState = (jobId: string, step: string) => {
    localStorage.setItem(ACTIVE_JOB_ID_KEY, jobId);
    localStorage.setItem(ACTIVE_STEP_KEY, step);
};

export const clearWorkflowState = () => {
    localStorage.removeItem(ACTIVE_JOB_ID_KEY);
    localStorage.removeItem(ACTIVE_STEP_KEY);
};

export const getPersistedWorkflowState = (): { jobId: string | null; step: string | null } => {
    return {
        jobId: localStorage.getItem(ACTIVE_JOB_ID_KEY),
        step: localStorage.getItem(ACTIVE_STEP_KEY),
    };
};

export const createRoadmapJob = async (
    skill: string,
    weeks: string,
    level: string,
    profile: UserProfile,
): Promise<WorkflowJob> => {
    const token = await readToken();
    const idempotencyKey = makeRoadmapIdempotencyKey(skill, weeks, level, profile);

    const response = await fetch(`${getApiBase()}/jobs`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
            type: 'roadmap_generation',
            idempotencyKey,
            payload: { skill, weeks, level, profile },
        }),
    });

    const data = await parseJson<{ job: WorkflowJob }>(response);
    persistWorkflowState(data.job.id, 'running');
    return data.job;
};

export const runJob = async (jobId: string): Promise<WorkflowJob> => {
    const token = await readToken();
    const response = await fetch(`${getApiBase()}/jobs?action=run`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ id: jobId }),
    });

    const data = await parseJson<{ job: WorkflowJob }>(response);
    return data.job;
};

export const getJob = async (jobId: string): Promise<WorkflowJob> => {
    const token = await readToken();
    const response = await fetch(`${getApiBase()}/jobs?id=${encodeURIComponent(jobId)}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await parseJson<{ job: WorkflowJob }>(response);
    return data.job;
};

export const getActiveRoadmapJob = async (): Promise<WorkflowJob | null> => {
    const token = await readToken();
    const response = await fetch(`${getApiBase()}/jobs?status=running`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await parseJson<{ jobs: WorkflowJob[] }>(response);
    const running = (data.jobs || []).find((job) => job.type === 'roadmap_generation');
    if (running) {
        persistWorkflowState(running.id, 'running');
        return running;
    }

    return null;
};

export const toRoadmapResult = (job: WorkflowJob<any, any>): RoadmapData | null => {
    if (job.status !== 'completed' || !job.result) {
        return null;
    }

    return job.result as unknown as RoadmapData;
};
