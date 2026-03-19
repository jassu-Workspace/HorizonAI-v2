import { NewsArticle } from '../types';

const API_KEY = "pub_92b34cf6f22843dd9ce940a6e04af28c";
const BACKUP_API_KEY = "YOUR_BACKUP_NEWS_KEY"; // Placeholder for a second key if user has one

export const getEducationNews = async (topic: string): Promise<NewsArticle[]> => {
    // Array of URLs to try in order
    const urlsToTry = [
        // 1. Specific topic query (High precision)
        `https://newsdata.io/api/1/latest?apikey=${API_KEY}&country=in&category=education&q=${encodeURIComponent(topic)}`,
        
        // 2. Default Top Education URL provided by user (Fallback)
        `https://newsdata.io/api/1/latest?apikey=${API_KEY}&country=in&category=education&prioritydomain=top`,

        // 3. Backup Key (Optional - if main key quota exceeded)
        `https://newsdata.io/api/1/latest?apikey=${BACKUP_API_KEY}&country=in&category=education`
    ];

    for (const url of urlsToTry) {
        // Skip URL if it contains placeholder backup key
        if (url.includes("YOUR_BACKUP_NEWS_KEY")) continue;

        try {
            const response = await fetch(url);
            
            // Check for rate limit specifically
            if (response.status === 429) {
                console.warn(`News API Rate limit for URL: ${url}`);
                continue; // Try next URL
            }

            const data = await response.json();

            if (data.status === "success" && data.results && data.results.length > 0) {
                return data.results
                    .map((item: any, index: number) => {
                        const rawLink = item?.link || item?.source_url || item?.url || '';
                        const normalizedLink = /^https?:\/\//i.test(String(rawLink))
                            ? String(rawLink)
                            : '';

                        return {
                            article_id: String(item?.article_id || `${Date.now()}-${index}`),
                            title: String(item?.title || 'Untitled news'),
                            link: normalizedLink,
                            description: item?.description ? String(item.description) : undefined,
                            pubDate: String(item?.pubDate || new Date().toISOString()),
                            image_url: item?.image_url ? String(item.image_url) : undefined,
                            source_id: String(item?.source_id || 'news'),
                        } as NewsArticle;
                    })
                    .filter((article: NewsArticle) => !!article.link)
                    .slice(0, 5);
            }
        } catch (error) {
            console.warn(`Failed to fetch news from ${url}`, error);
            // Continue to next URL
        }
    }

    console.error("All News API attempts failed.");
    return [];
};