import { NewsArticle } from '../types';

export const getEducationNews = async (topic: string): Promise<NewsArticle[]> => {
    try {
        const response = await fetch(`/api/news?topic=${encodeURIComponent(topic || '')}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        return results as NewsArticle[];
    } catch {
        return [];
    }
};