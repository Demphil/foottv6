const API_OPTIONS = {
    method: 'GET',
    headers: {
        'X-RapidAPI-Key': '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556', // استبدل بمفتاحك
        'X-RapidAPI-Host': 'football-news-aggregator.p.rapidapi.com'
    }
};

// دالة مساعدة للتعامل مع الأخطاء
const handleResponse = async (response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `خطأ في الخادم: ${response.status}`);
    }
    return response.json();
};

// دالة جلب الأخبار العامة
export const fetchFootballNews = async () => {
    try {
        const response = await fetch(
            'https://football-news-aggregator.p.rapidapi.com/news?lang=ar&limit=20',
            API_OPTIONS
        );
        
        const data = await handleResponse(response);
        
        return data.articles.map(article => ({
            id: article.url.hashCode(),
            title: article.title,
            excerpt: article.description || 'لا يوجد وصف متاح',
            image: article.image || 'assets/images/default-news.jpg',
            date: new Date(article.publishedAt).toLocaleDateString('ar-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            source: article.source?.name || 'مصدر غير معروف',
            url: article.url,
            category: article.category || 'عام'
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
            'https://football-news-aggregator.p.rapidapi.com/news/breaking?lang=ar&limit=3',
            API_OPTIONS
        );
        
        const data = await handleResponse(response);
        return data.articles.slice(0, 3);
    } catch (error) {
        console.error('فشل جلب الأخبار العاجلة:', error);
        return []; // إرجاع مصفوفة فارغة بدلاً من إظهار خطأ
    }
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
