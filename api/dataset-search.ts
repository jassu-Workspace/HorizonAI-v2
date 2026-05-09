import { searchCourses } from '../lib/dataset-index';
import * as nvidia from '../lib/nvidia-client';

export default async function handler(req: any, res: any) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const body = req.body || {};
        const query = String(body.query || body.q || '').trim();
        const limit = Math.min(Number(body.limit || 20), 100);

        if (!query) return res.status(400).json({ error: 'Missing query' });

        const results = await searchCourses(query, limit);

        // Optional: call NVIDIA integration to update profile / request assessment
        let assessment: null | { id: string; status: string } = null;
        if (body.updateProfile && body.userId) {
            try {
                await nvidia.updateUserProfile(String(body.userId), { matchedCount: results.length });
                const a = await nvidia.requestAssessment(String(body.userId), { trigger: 'dataset_search', query });
                assessment = { id: a.id, status: a.status };
            } catch (e) {
                console.warn('nvidia integration failed', e);
            }
        }

        return res.status(200).json({ query, count: results.length, results, assessment });
    } catch (err: any) {
        console.error('dataset-search error', err);
        return res.status(500).json({ error: 'Internal error' });
    }
}
