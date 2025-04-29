const NEWS_API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556'; // استبدل بمفتاح API الفعلي
const NEWS_API_URL = 'news-api14.p.rapidapi.com';

// دالة مساعدة لإنشاء ID فريد لكل خبر
const generateId = (url) => {
  return url.split('/').reduce((acc, char) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);
};

// دالة جلب الأخبار الرئيسية
export const fetchFootballNews = async () => {
  try {
    const response = await fetch(`${NEWS_API_URL}&apiKey=${NEWS_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`خطأ في الشبكة: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.articles || data.articles.length === 0) {
      throw new Error('لا توجد أخبار متاحة حالياً');
    }

    return data.articles.map(article => ({
      id: generateId(article.url),
      title: article.title,
      excerpt: article.description || 'لا يوجد وصف متاح',
      content: article.content || '',
      image: article.urlToImage || 'assets/images/default-news.jpg',
      date: new Date(article.publishedAt).toLocaleDateString('ar-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      source: article.source.name,
      url: article.url,
      author: article.author || 'مصدر مجهول'
    }));
  } catch (error) {
    console.error('فشل جلب الأخبار:', error);
    throw error;
  }
};

// دالة جلب الأخبار العاجلة فقط
export const fetchBreakingNews = async () => {
  try {
    const response = await fetch(`${NEWS_API_URL}&sortBy=publishedAt&pageSize=3&apiKey=${NEWS_API_KEY}`);
    const data = await response.json();
    return data.articles.slice(0, 3); // أول 3 أخبار كأخبار عاجلة
  } catch (error) {
    console.error('فشل جلب الأخبار العاجلة:', error);
    return [];
  }
};
