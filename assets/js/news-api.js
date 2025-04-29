const API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556'; // استبدلها بمفتاحك
const API_HOST = 'news-api14.p.rapidapi.com'; // يختلف حسب API المختار

export const fetchFootballNews = async () => {
    try {
        const response = await fetch('https://news-api14.p.rapidapi.com/top-headlines?category=sports&country=SA&language=ar', {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': API_KEY,
                'X-RapidAPI-Host': API_HOST
            }
        });

        if (!response.ok) {
            throw new Error('فشل جلب الأخبار');
        }

        const data = await response.json();
        return data.articles.map(article => ({
            id: article.url.hashCode(),
            title: article.title,
            excerpt: article.description || 'لا يوجد وصف',
            image: article.urlToImage || 'assets/images/default-news.jpg',
            date: new Date(article.publishedAt).toLocaleDateString('ar-AR'),
            source: article.source.name,
            url: article.url
        }));
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};
// أضف في news-api.js
const cacheDuration = 30 * 60 * 1000; // 30 دقيقة

export const fetchNews = async () => {
    const cachedData = localStorage.getItem('newsCache');
    const cacheTime = localStorage.getItem('newsCacheTime');
    
    if (cachedData && cacheTime && Date.now() - cacheTime < cacheDuration) {
        return JSON.parse(cachedData);
    }
    
    const data = await fetchFromAPI(); // استدعاء API الحقيقي
    
    localStorage.setItem('newsCache', JSON.stringify(data));
    localStorage.setItem('newsCacheTime', Date.now());
    
    return data;
};
