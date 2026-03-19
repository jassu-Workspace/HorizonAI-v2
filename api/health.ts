export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    return res.status(200).json({
        status: 'ok',
        message: 'Vercel API route is running',
        keysConfigured: [
            process.env.NVIDIA_API_KEY_1,
            process.env.NVIDIA_API_KEY_2,
            process.env.NVIDIA_API_KEY_3,
            process.env.NVIDIA_API_KEY,
        ].filter(Boolean).length,
    });
}
