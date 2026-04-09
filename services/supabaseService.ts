import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, RoadmapData, QuizResult, RoadmapWeek, Platform } from '../types';

// --- 1. SETUP CREDENTIALS ---
// Read Supabase credentials from Vite environment variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''; 
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
// --- END SETUP ---

// Use 'any' type to avoid TypeScript errors when v1 types are present but v2 syntax is used
let supabase: any;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL';

if (!isSupabaseConfigured) {
    console.warn("⚠️ Supabase URL or Key is missing.");
    supabase = {
        auth: {
            getUser: async () => ({ data: { user: null } }),
            getSession: async () => ({ data: { session: null } }),
            signInWithPassword: async () => ({ error: { message: "Supabase not configured" } }),
            signUp: async () => ({ error: { message: "Supabase not configured" } }),
            signOut: async () => {},
            signInWithOAuth: async () => ({ error: { message: "Supabase not configured" } }),
        },
        from: () => ({ 
            select: () => ({ 
                eq: () => ({ 
                    single: async () => ({ data: null }),
                    order: () => ({ limit: async () => ({ data: [] }) })
                }),
                insert: async () => ({ error: { message: "Supabase not configured" } }),
                update: async () => ({ error: { message: "Supabase not configured" } }),
                upsert: async () => ({ error: { message: "Supabase not configured" } }),
            }) 
        }),
        storage: {
            from: () => ({
                upload: async () => ({ error: { message: "Supabase not configured" } }),
                remove: async () => ({ error: { message: "Supabase not configured" } }),
                createSignedUrl: async () => ({ error: { message: "Supabase not configured" } })
            })
        }
    };
} else {
    supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            storageKey: 'horizon.auth.v1',
            persistSession: true,
            autoRefreshToken: true,
        }
    });
}

export { supabase };

// --- HELPER: Map Normalized DB Rows to RoadmapData Object ---
const mapDBToRoadmap = (row: any): RoadmapData => {
    // Sort weeks by week number
    const weeks = row.roadmap_weeks ? row.roadmap_weeks.map((w: any) => ({
        week: w.week_number,
        theme: w.theme,
        goals: w.goals || [],
        completed: Boolean(w.completed), // Explicitly cast to boolean to avoid falsy issues
        startedAt: w.started_at,
        completedAt: w.completed_at,
        earnedPoints: w.earned_points,
        score: w.score, // Map score if available
        // Map week-specific resources from separate table
        resources: w.week_resources ? w.week_resources.map((r: any) => ({
             title: r.title,
             searchQuery: r.search_query
        })) : []
    })).sort((a: any, b: any) => a.week - b.week) : [];

    // Filter global resources from separate table
    const globals = row.roadmap_global_resources || [];
    const freePlatforms = globals.filter((r: any) => r.category === 'free').map((r: any) => ({ name: r.name, description: r.description, searchQuery: r.search_query }));
    const paidPlatforms = globals.filter((r: any) => r.category === 'paid').map((r: any) => ({ name: r.name, description: r.description, searchQuery: r.search_query }));
    const books = globals.filter((r: any) => r.category === 'book').map((r: any) => ({ name: r.name, description: r.description, searchQuery: r.search_query }));

    return {
        id: row.id,
        skill: row.skill_name,
        status: row.status as 'active' | 'saved' | 'completed',
        progress: row.progress,
        created_at: row.created_at,
        roadmap: weeks,
        freePlatforms,
        paidPlatforms,
        books,
        isPublic: row.is_public
    };
};

// --- PROFILE FUNCTIONS ---

export const getCurrentProfile = async (): Promise<UserProfile | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !data) return null;

        const roleMap: Record<string, 'user' | 'trainer' | 'admin'> = {
            learner: 'user',
            user: 'user',
            trainer: 'trainer',
            policymaker: 'admin',
            admin: 'admin',
        };

        return {
            id: user.id,
            fullName: data.full_name,
            role: roleMap[String(data.role || 'user').toLowerCase()] || 'user',
            academicLevel: data.academic_level,
            stream: data.stream,
            academicCourse: data.academic_course, // Map DB column to profile type
            previousPerformance: data.previous_performance,
            interestedSubjects: data.interested_subjects, // Mapped to Specialization in Onboarding, read back here
            skillDivision: data.skill_division, // Read new Skill Division
            learningStyle: data.learning_style,
            focusArea: data.focus_area,
            lastEdited: data.last_edited_at,
            totalPoints: data.total_points || 0,
            skills: '', 
            interests: '',
            class10Performance: data.class_10_performance,
            class12Stream: data.class_12_stream,
            class12Performance: data.class_12_performance,
            diplomaPerformance: data.diploma_performance,
            resumePath: data.resume_path,
        };
    } catch (error) {
        console.error("Error fetching profile:", error);
        return null;
    }
};

export const saveProfileFromOnboarding = async (profile: UserProfile) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const userRole: 'user' = 'user';

    const profileData = {
        id: user.id,
        full_name: profile.fullName,
        role: userRole,
        academic_level: profile.academicLevel,
        stream: profile.stream,
        academic_course: profile.academicCourse, // Store Branch here
        // Store Specialization/Academics in 'interested_subjects' to avoid schema mismatch errors if column missing
        interested_subjects: profile.specialization || profile.interestedSubjects, 
        skill_division: profile.skillDivision, // Store Skill Division
        previous_performance: profile.previousPerformance,
        learning_style: profile.learningStyle,
        focus_area: profile.focusArea,
        class_10_performance: profile.class10Performance,
        class_12_stream: profile.class12Stream,
        class_12_performance: profile.class12Performance,
        diploma_performance: profile.diplomaPerformance,
        resume_path: profile.resumePath,
        last_edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_points: 0,
    };
    
    // Use upsert for resilience. If a DB trigger created a blank profile,
    // this will update it. If the trigger failed, this will insert it.
    let { error } = await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });

    const errorMessage = String(error?.message || '').toLowerCase();

    if (error && (errorMessage.includes('full_name') || errorMessage.includes('schema cache'))) {
        throw new Error(
            "Your Supabase database is missing the profiles.full_name column or the schema cache is stale. Run the latest supabase_schema.sql, then reload the schema cache and try again."
        );
    }

    // Fallback for older schemas that do not yet include all optional columns.
    if (error && (error.code === '42703' || String(error.message || '').toLowerCase().includes('column'))) {
        const minimalProfileData = {
            id: user.id,
            full_name: profile.fullName,
            role: userRole,
            academic_level: profile.academicLevel,
            stream: profile.stream,
            academic_course: profile.academicCourse,
            interested_subjects: profile.specialization || profile.interestedSubjects,
            learning_style: profile.learningStyle,
            focus_area: profile.focusArea,
            resume_path: profile.resumePath,
            updated_at: new Date().toISOString(),
            total_points: 0,
        };

        const retry = await supabase.from('profiles').upsert(minimalProfileData, { onConflict: 'id' });
        error = retry.error;
    }

    if (error) {
        console.error("Error saving onboarding profile:", error);
        throw new Error(error.message || 'Failed to save profile in database.');
    }
};

export const updateProfileFromDashboard = async (profile: UserProfile) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const updates = {
        full_name: profile.fullName,
        academic_level: profile.academicLevel,
        stream: profile.stream,
        previous_performance: profile.previousPerformance,
        interested_subjects: profile.interestedSubjects,
        learning_style: profile.learningStyle,
        focus_area: profile.focusArea,
        resume_path: profile.resumePath,
        last_edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) {
        console.error("Error updating dashboard profile:", error);
        throw error;
    }
};


export const updateProfileWithLimit = async (profile: UserProfile): Promise<{ success: boolean, message?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "User not found" };

    if (profile.lastEdited) {
        const lastEditedDate = new Date(profile.lastEdited);
        const now = new Date();
        const diffHours = (now.getTime() - lastEditedDate.getTime()) / (1000 * 60 * 60);
        
        if (diffHours < 24) {
            return { success: false, message: `You can only edit your profile once every 24 hours. Next edit available in ${Math.ceil(24 - diffHours)} hours.` };
        }
    }

    await updateProfileFromDashboard(profile);
    return { success: true };
};

export const updateUserPoints = async (points: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('profiles').select('total_points').eq('id', user.id).single();
    const currentPoints = data?.total_points || 0;
    const newTotal = currentPoints + points;

    await supabase.from('profiles').update({ total_points: newTotal }).eq('id', user.id);
};

// --- RESUME STORAGE FUNCTIONS ---

export const uploadResume = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const allowedMimeTypes = new Set([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    const allowedExtensions = new Set(['pdf', 'doc', 'docx']);
    const maxFileSizeBytes = 5 * 1024 * 1024;

    const fileExt = (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedExtensions.has(fileExt)) {
        throw new Error('Unsupported file type. Allowed: PDF, DOC, DOCX.');
    }

    if (!allowedMimeTypes.has(file.type)) {
        throw new Error('Invalid MIME type for resume upload.');
    }

    if (file.size > maxFileSizeBytes) {
        throw new Error('File too large. Maximum allowed size is 5 MB.');
    }

    const filePath = `${user.id}/resume.${fileExt}`;

    const { error } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: true }); // upsert = true will overwrite existing file

    if (error) {
        console.error("Error uploading resume:", error);
        throw error;
    }
    
    // Update profile with the new path
    await supabase.from('profiles').update({ resume_path: filePath }).eq('id', user.id);

    return filePath;
};

export const deleteResume = async (path: string) => {
    const { error } = await supabase.storage.from('resumes').remove([path]);
    if (error) {
        console.error("Error deleting resume:", error);
        throw error;
    }
};

export const getResumeUrl = async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from('resumes').createSignedUrl(path, 60 * 60); // URL valid for 1 hour
    if (error) {
        console.error("Error getting resume URL:", error);
        return null;
    }
    return data.signedUrl;
};

export const getResumeText = async (path: string): Promise<string> => {
    if (!path) throw new Error("No resume path provided.");
    
    const signedUrl = await getResumeUrl(path);
    if (!signedUrl) throw new Error("Could not get a secure URL for the resume.");

    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
        throw new Error("PDF.js library is not loaded.");
    }

    const loadingTask = pdfjsLib.getDocument(signedUrl);
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
};


// --- ROADMAP FUNCTIONS (Normalized Relational Storage) ---

export const saveRoadmap = async (skill: string, roadmapData: RoadmapData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to save roadmaps.");

    // 1. CHECK LIMIT (Max 3 Saved Roadmaps, excluding active one)
    // Explicitly checking for 'saved' status count
    const { count, error: countError } = await supabase
        .from('roadmaps')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'saved'); 

    if (count !== null && count >= 3) {
        throw new Error("You have reached the limit of 3 saved roadmaps. Please delete or complete one to save a new one.");
    }

    // 2. INSERT PARENT ROADMAP (Stores Skill & Status)
    const { data: roadmapRow, error: roadmapError } = await supabase
        .from('roadmaps')
        .insert({
            user_id: user.id,
            skill_name: skill,
            status: 'saved', // Default to saved
            progress: 0,
            is_public: false // Default private
        })
        .select()
        .single();

    if (roadmapError || !roadmapRow) throw roadmapError;
    const roadmapId = roadmapRow.id;

    // 3. INSERT WEEKS (Stores Weekly Theme & Goals) & WEEK RESOURCES
    // Using Promise.all for efficiency, though sequential is safer for order (DB sorts by week_number anyway)
    await Promise.all(roadmapData.roadmap.map(async (week) => {
        // a. Insert Week
        const { data: weekRow, error: weekError } = await supabase
            .from('roadmap_weeks')
            .insert({
                roadmap_id: roadmapId,
                week_number: week.week,
                theme: week.theme,
                goals: week.goals, 
                completed: false,
                earned_points: 0,
                score: week.score || 0 // Try saving score if column exists
            })
            .select()
            .single();
        
        if (weekError) {
            console.error(`Error saving week ${week.week}:`, weekError);
            return;
        }
        
        // b. Insert Resources for this specific week
        if (weekRow && week.resources && week.resources.length > 0) {
            const resourcesPayload = week.resources.map(r => ({
                week_id: weekRow.id,
                title: r.title,
                search_query: r.searchQuery
            }));
            await supabase.from('week_resources').insert(resourcesPayload);
        }
    }));

    // 4. INSERT GLOBAL RESOURCES (Platforms/Books)
    const globalResources = [
        ...roadmapData.freePlatforms.map(p => ({ ...p, category: 'free' })),
        ...roadmapData.paidPlatforms.map(p => ({ ...p, category: 'paid' })),
        ...roadmapData.books.map(b => ({ ...b, category: 'book' }))
    ];

    if (globalResources.length > 0) {
        const globalPayload = globalResources.map(r => ({
            roadmap_id: roadmapId,
            category: r.category,
            name: r.name,
            description: r.description,
            search_query: r.searchQuery
        }));
        await supabase.from('roadmap_global_resources').insert(globalPayload);
    }
    
    return roadmapId; // Return ID so we can update state
};

// --- SHARING & IMPORTING FUNCTIONS ---

export const makeRoadmapPublic = async (roadmapId: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from('roadmaps')
        .update({ is_public: true })
        .eq('id', roadmapId)
        .eq('user_id', user.id);

    if (error) throw error;
    return roadmapId;
};

export const getPublicRoadmap = async (roadmapId: string): Promise<RoadmapData> => {
    // We do NOT filter by user_id here, allowing public access via RLS
    const { data, error } = await supabase
        .from('roadmaps')
        .select(`
            *,
            roadmap_weeks (
                *,
                week_resources (*)
            ),
            roadmap_global_resources (*)
        `)
        .eq('id', roadmapId)
        .single();

    if (error || !data) {
        console.error("Error fetching shared roadmap:", error);
        throw new Error("Roadmap not found or is private.");
    }

    return mapDBToRoadmap(data);
};

export const importRoadmap = async (sharedRoadmap: RoadmapData) => {
    // Basically saveRoadmap but forces it to be a new entry for the current user
    // Reset progress and status
    const cleanRoadmap: RoadmapData = {
        ...sharedRoadmap,
        id: undefined,
        status: 'saved',
        progress: 0,
        roadmap: sharedRoadmap.roadmap.map(w => ({
            ...w,
            completed: false,
            startedAt: undefined,
            completedAt: undefined,
            earnedPoints: undefined,
            score: undefined
        }))
    };
    
    return await saveRoadmap(cleanRoadmap.skill, cleanRoadmap);
};


// Generic update for full roadmap sync (heavier, used sparingly)
export const updateRoadmap = async (roadmap: RoadmapData) => {
    if (!roadmap.id) return;
    
    // 1. Update Main Metadata
    const { error } = await supabase
        .from('roadmaps')
        .update({
            progress: roadmap.progress,
            status: roadmap.status
        })
        .eq('id', roadmap.id);
        
    if (error) console.error("Error updating roadmap metadata:", error);

    // 2. Update Weeks (Progress tracking) - Iterative approach
    for (const week of roadmap.roadmap) {
        await supabase
            .from('roadmap_weeks')
            .update({
                completed: week.completed || false,
                started_at: week.startedAt || null,
                completed_at: week.completedAt || null,
                earned_points: week.earnedPoints || 0,
                score: week.score || 0
            })
            .eq('roadmap_id', roadmap.id)
            .eq('week_number', week.week);
    }
};

// Optimized function to update a single week's completion status (Faster & More Reliable)
export const updateRoadmapWeek = async (roadmapId: string, weekNumber: number, data: { completed: boolean, score?: number, earned_points?: number, completed_at?: string }) => {
    const { error } = await supabase
        .from('roadmap_weeks')
        .update(data)
        .eq('roadmap_id', roadmapId)
        .eq('week_number', weekNumber);

    if (error) console.error(`Error updating week ${weekNumber}:`, error);
};

// Optimized function to just update the parent roadmap progress
export const updateRoadmapProgress = async (roadmapId: string, progress: number, status?: string) => {
    const updateData: any = { progress };
    if (status) updateData.status = status;

    const { error } = await supabase
        .from('roadmaps')
        .update(updateData)
        .eq('id', roadmapId);

    if (error) console.error("Error updating roadmap progress:", error);
};

export const markRoadmapComplete = async (roadmapId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
        .from('roadmaps')
        .update({ status: 'completed', progress: 100 })
        .eq('id', roadmapId);
        
    // Award Bonus Points
    await updateUserPoints(100);
};

export const setRoadmapAsActive = async (roadmapId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. STRICT RULE: Enforce only ONE active roadmap.
    // Downgrade ALL currently active roadmaps for this user to 'saved'
    await supabase
        .from('roadmaps')
        .update({ status: 'saved' })
        .eq('user_id', user.id)
        .eq('status', 'active');

    // 2. Promote the selected roadmap to 'active'
    await supabase
        .from('roadmaps')
        .update({ status: 'active' })
        .eq('id', roadmapId)
        .eq('user_id', user.id);
};

export const getPastRoadmaps = async (limit = 5): Promise<RoadmapData[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // DEEP FETCH: Join all related tables to reconstruct the object
    const { data, error } = await supabase
        .from('roadmaps')
        .select(`
            *,
            roadmap_weeks (
                *,
                week_resources (*)
            ),
            roadmap_global_resources (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit + 1); // Fetch slightly more to handle active + saved list separation in UI if needed

    if (error) {
        console.error("Error fetching roadmaps:", error);
        return [];
    }

    // Convert DB rows back to application RoadmapData format
    return data ? data.map(mapDBToRoadmap) : [];
};

export const saveQuizResult = async (result: QuizResult) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('quiz_results')
        .insert({
            user_id: user.id,
            roadmap_id: result.roadmapId,
            skill_name: result.skill,
            week_theme: result.weekTheme,
            score: result.score,
            total_questions: result.totalQuestions,
            points_earned: result.pointsEarned,
            assessment_type: result.assessmentType || 'standard',
            created_at: new Date().toISOString()
        });
    
    if (result.pointsEarned && result.pointsEarned > 0) {
        await updateUserPoints(result.pointsEarned);
    }

    if (error) {
        console.warn("Error saving quiz result:", error);
    }
};

export const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('horizon.auth.v1');
    localStorage.removeItem('horizon.activeRoadmapJobId');
    localStorage.removeItem('horizon.workflowStep');
    Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) {
            localStorage.removeItem(key);
        }
    });
};