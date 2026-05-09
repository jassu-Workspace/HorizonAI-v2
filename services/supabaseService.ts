import { createClient } from '@supabase/supabase-js';

// Minimal supabase service stubs to satisfy frontend imports during development.
type MockSession = {
    user: {
        id: string;
        email: string;
        user_metadata?: Record<string, unknown>;
    };
} | null;

const mockSession: MockSession = null;

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const createAuthSubscription = () => ({
    subscription: {
        unsubscribe: () => {},
    },
});

const mockSupabase = {
    auth: {
        getSession: async () => ({ data: { session: mockSession }, error: null }),
        exchangeCodeForSession: async (_code: string) => ({ data: { session: mockSession }, error: null }),
        onAuthStateChange: (_cb: (event: string, session?: MockSession) => void) => ({ data: createAuthSubscription() }),
        signOut: async () => ({ error: null }),
        signInWithOAuth: async (_args: any) => ({ data: { provider: 'google', url: null }, error: null }),
        signInWithPassword: async (_args: any) => ({ data: { user: null, session: null }, error: null }),
        signUp: async (_args: any) => ({ data: { user: null, session: null }, error: null }),
        resetPasswordForEmail: async (_email: string, _opts?: any) => ({ data: {}, error: null }),
        getUser: async (_token?: string) => ({ data: { user: mockSession?.user || null }, error: null }),
    },
} as any;

export const supabase = hasSupabaseConfig
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    })
    : mockSupabase;

export const isSupabaseConfigured = () => hasSupabaseConfig;

export const getCurrentProfile = async (userId?: string) => {
  if (!userId) {
    return { id: userId || 'anon', skills: '', interests: '' };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
};
export const getPublicRoadmap = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching roadmap:', error);
      return { id, title: 'Public Roadmap', weeks: [] };
    }

    return data || { id, title: 'Public Roadmap', weeks: [] };
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    return { id, title: 'Public Roadmap', weeks: [] };
  }
};
export const updateRoadmapWeek = async (roadmapId: string, weekIndex: number, data: any) => {
  try {
    const { error } = await supabase
      .from('roadmap_weeks')
      .update(data)
      .eq('roadmap_id', roadmapId)
      .eq('week_number', weekIndex);

    if (error) {
      console.error('Error updating roadmap week:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error updating roadmap week:', error);
    return { ok: false, error: error.message };
  }
};
export const updateRoadmapProgress = async (roadmapId: string, progress: any) => {
  try {
    const { error } = await supabase
      .from('roadmaps')
      .update({ progress: progress })
      .eq('id', roadmapId)
      .single();

    if (error) {
      console.error('Error updating roadmap progress:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error in updateRoadmapProgress:', error);
    return { ok: false, error: error.message };
  }
};
export const saveProfileFromOnboarding = async (profile: any) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role || 'user',
        academic_level: profile.academic_level,
        stream: profile.stream,
        academic_course: profile.academic_course,
        interested_subjects: profile.interested_subjects,
        skill_division: profile.skill_division,
        previous_performance: profile.previous_performance,
        learning_style: profile.learning_style,
        focus_area: profile.focus_area,
        class_10_performance: profile.class_10_performance,
        class_12_stream: profile.class_12_stream,
        class_12_performance: profile.class_12_performance,
        diploma_performance: profile.diploma_performance,
        resume_path: profile.resume_path,
        total_points: profile.total_points || 0,
        last_edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving profile:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error saving profile:', error);
    return { ok: false, error: error.message };
  }
};

export const getPastRoadmaps = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching past roadmaps:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching past roadmaps:', error);
    return [];
  }
};
export const setRoadmapAsActive = async (userId: string, roadmapId: string) => {
  try {
    // First, set all user's roadmaps to 'saved' status
    const { error: updateError } = await supabase
      .from('roadmaps')
      .update({ status: 'saved' })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating roadmap status:', updateError);
    }

    // Then, set the specific roadmap to 'active' status
    const { error } = await supabase
      .from('roadmaps')
      .update({ status: 'active' })
      .eq('id', roadmapId)
      .single();

    if (error) {
      console.error('Error setting roadmap as active:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error in setRoadmapAsActive:', error);
    return { ok: false, error: error.message };
  }
};
export const uploadResume = async (userId: string, file: any) => {
  try {
    // First check if user already has a resume
    const { data: existingData, error: fetchError } = await supabase
      .storage
      .from('resumes')
      .list(userId, {
        limit: 1
      });

    if (fetchError) {
      console.error('Error fetching existing resumes:', fetchError);
    }

    // Upload the new resume
    const fileName = `${userId}/resume.pdf`;
    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(fileName, file, {
        upsert: true,
        contentType: 'application/pdf'
      });

    if (error) {
      console.error('Error uploading resume:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, path: fileName };
  } catch (error) {
    console.error('Error in uploadResume:', error);
    return { ok: false, error: error.message };
  }
};
export const deleteResume = async (userId: string, resumeId: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('resumes')
      .remove([`${userId}/resume.pdf`]);

    if (error) {
      console.error('Error deleting resume:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error in deleteResume:', error);
    return { ok: false, error: error.message };
  }
};
export const getResumeText = async (userId: string) => {
  try {
    // This would fetch resume text from storage, but we'll implement a basic version
    return { text: '' };
  } catch (error) {
    console.error('Error fetching resume text:', error);
    return { text: '' };
  }
};

export const saveQuizResult = async (userId: string, result: any) => {
  try {
    const { error } = await supabase
      .from('quiz_results')
      .insert({
        user_id: userId,
        roadmap_id: result.roadmapId,
        skill_name: result.skillName,
        week_theme: result.weekTheme,
        score: result.score,
        total_questions: result.totalQuestions,
        points_earned: result.pointsEarned,
        assessment_type: result.assessmentType || 'standard',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving quiz result:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error in saveQuizResult:', error);
    return { ok: false, error: error.message };
  }
};

export const signOut = async () => {
    await supabase.auth.signOut();
    return { ok: true };
};
export const updateProfileWithLimit = async (userId: string, updates: any) => {
  try {
    // Add rate limiting logic here if needed
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error updating profile with limit:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error in updateProfileWithLimit:', error);
    return { ok: false, error: error.message };
  }
};
export const importRoadmap = async (payload: any) => {
  try {
    const { data, error } = await supabase
      .from('roadmaps')
      .insert({
        user_id: payload.userId,
        skill_name: payload.skill,
        status: 'saved',
        progress: 0,
        is_public: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error importing roadmap:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data.id };
  } catch (error) {
    console.error('Error in importRoadmap:', error);
    return { ok: false, error: error.message };
  }
};

export const saveRoadmap = async (userId: string, roadmap: any) => {
  try {
    const { data, error } = await supabase
      .from('roadmaps')
      .insert({
        user_id: userId,
        skill_name: roadmap.skill,
        status: 'saved',
        progress: 0,
        is_public: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving roadmap:', error);
      return { ok: false, error: error.message };
    }

    return { id: data.id, ok: true };
  } catch (error) {
    console.error('Error in saveRoadmap:', error);
    return { ok: false, error: error.message };
  }
};
export const updateRoadmap = async (roadmapId: string, changes: any) => {
  try {
    const { error } = await supabase
      .from('roadmaps')
      .update(changes)
      .eq('id', roadmapId)
      .single();

    if (error) {
      console.error('Error updating roadmap:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error in updateRoadmap:', error);
    return { ok: false, error: error.message };
  }
};
export const updateUserPoints = async (userId: string, points: number) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ total_points: points })
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error updating user points:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error in updateUserPoints:', error);
    return { ok: false, error: error.message };
  }
};
export const markRoadmapComplete = async (roadmapId: string) => {
  try {
    const { error } = await supabase
      .from('roadmaps')
      .update({ status: 'completed' })
      .eq('id', roadmapId)
      .single();

    if (error) {
      console.error('Error marking roadmap complete:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error in markRoadmapComplete:', error);
    return { ok: false, error: error.message };
  }
};
export const makeRoadmapPublic = async (roadmapId: string) => {
  try {
    const { error } = await supabase
      .from('roadmaps')
      .update({ is_public: true })
      .eq('id', roadmapId)
      .single();

    if (error) {
      console.error('Error making roadmap public:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error in makeRoadmapPublic:', error);
    return { ok: false, error: error.message };
  }
};

export default {
    supabase,
    isSupabaseConfigured,
};
