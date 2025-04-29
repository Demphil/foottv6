// assets/js/news-api.js

const PROXY_URL = 'https://newsapi.org/v2/everything?q=tesla&from=2025-03-29&sortBy=publishedAt&apiKey=1930d8747282440aaee1688330c10db2
'; // استبدل برابط السيرفر الوكيل
const API_KEY = '1930d8747282440aaee1688330c10db2'; // احتفظ بالمفتاح للاستخدام في السيرفر

export const fetchFootballNews = async (page = 1, pageSize = 10) => {
    try {
        const response = await fetch(
            `${PROXY_URL}/everything?q=كرة القدم OR football&language=ar&page=${page}&pageSize=${pageSize}`
        );
        
        if (!response.ok) {
            throw new Error(`خطأ في السيرفر: ${response.status}`);
        }
        
        const data = await response.json();
        
        return data.articles.map(article => ({
            id: article.url.hashCode(),
            title: article.title,
            excerpt: article.description || 'لا يوجد وصف متاح',
            image: article.urlToImage || 'assets/images/default-news.jpg',
            date: formatArabicDate(article.publishedAt),
            source: article.source?.name || 'مصدر غير معروف',
            url: article.url,
            author: article.author || 'كاتب غير معروف'
        }));
    } catch (error) {
        console.error('فشل جلب الأخبار:', error);
        throw new Error('تعذر الاتصال بخدمة الأخبار. يرجى المحاولة لاحقاً.');
    }
};

export const fetchBreakingNews = async () => {
    try {
        const response = await fetch(`${PROXY_URL}/top-headlines?category=sports&country=sa&pageSize=3`);
        
        if (!response.ok) {
            throw new Error(`خطأ في السيرفر: ${response.status}`);
        }
        
        const data = await response.json();
        return data.articles.slice(0, 3).map(article => ({
            ...article,
            id: article.url.hashCode(),
            date: formatArabicDate(article.publishedAt),
            image: article.urlToImage || 'assets/images/default-news.jpg'
        }));
    } catch (error) {
        console.error('فشل جلب الأخبار العاجلة:', error);
        return [];
    }
};

// باقي الدوال المساعدة تبقى كما هي
