// assets/js/news-api.js

const API_KEY = '1930d8747282440aaee1688330c10db2'; // استبدل بمفتاحك من newsapi.org
const BASE_URL = 'https://newsapi.org/v2';

// دالة مساعدة للتعامل مع الأخطاء
const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `خطأ في الخادم: ${response.status}`);
    }
    return response.json();
};

// دالة جلب الأخبار الرياضية
export const fetchFootballNews = async (page = 1, pageSize = 10) => {
    try {
        const response = await fetch(
            `${BASE_URL}/everything?q=كرة القدم OR football&language=ar&page=${page}&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${API_KEY}`
        );
        
        const data = await handleResponse(response);
        
        return data.articles.map(article => ({
            id: article.url.hashCode(),
            title: article.title,
            excerpt: article.description || 'لا يوجد وصف متاح',
            content: article.content || '',
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

// دالة جلب الأخبار العاجلة
export const fetchBreakingNews = async () => {
    try {
        const response = await fetch(
            `${BASE_URL}/top-headlines?category=sports&country=sa&pageSize=3&apiKey=${API_KEY}`
        );
        
        const data = await handleResponse(response);
        return data.articles.slice(0, 3).map(article => ({
            ...article,
            id: article.url.hashCode(),
            date: formatArabicDate(article.publishedAt),
            image: article.urlToImage || 'assets/images/default-news.jpg'
        }));
    } catch (error) {
        console.error('فشل جلب الأخبار العاجلة:', error);
        return []; // إرجاع مصفوفة فارغة بدلاً من إظهار خطأ
    }
};

// تنسيق التاريخ بالعربية
const formatArabicDate = (dateString) => {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('ar-SA', options);
};

// دالة مساعدة لإنشاء ID فريد
String.prototype.hashCode = function() {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
        hash = (hash << 5) - hash + this.charCodeAt(i);
        hash |= 0;
    }
    return hash;
};
