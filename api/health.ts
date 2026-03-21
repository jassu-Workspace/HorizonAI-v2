export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.status(200).json({
        status: 'ok',
        service: 'horizon-api',
        timestamp: new Date().toISOString(),
    });
}
