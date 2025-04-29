// assets/js/news-api.js

// دالة مساعدة لإنشاء ID فريد
const generateId = (url) => {
  return url.split('/').reduce((acc, char) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);
};

// دالة مساعدة لتنسيق التاريخ
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

export const fetchFootballNews = async () => {
  try {
    // استبدل هذا الرابط برابط السيرفر الوكيل الخاص بك
    const proxyUrl = 'https://your-cors-proxy.com/';
    const apiUrl = `https://newsapi.org/v2/everything?q=football&language=ar&sortBy=publishedAt&pageSize=20`;
    
    const response = await fetch(proxyUrl + apiUrl, {
      headers: {
        'X-API-KEY': 'your_api_key_here' // استبدل بمفتاح API الفعلي
      }
    });

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
    // استبدل هذا الرابط برابط السيرفر الوكيل الخاص بك
    const proxyUrl = 'https://your-cors-proxy.com/';
    const apiUrl = `https://newsapi.org/v2/top-headlines?category=sports&country=sa&pageSize=3`;
    
    const response = await fetch(proxyUrl + apiUrl, {
      headers: {
        'X-API-KEY': 'your_api_key_here' // استبدل بمفتاح API الفعلي
      }
    });

    const data = await response.json();
    return data.articles.slice(0, 3).map(article => ({
      id: generateId(article.url),
      title: article.title,
      excerpt: article.description || 'لا يوجد وصف متاح',
      image: article.urlToImage || 'assets/images/default-news.jpg',
      date: formatArabicDate(article.publishedAt),
      source: article.source?.name || 'مصدر غير معروف',
      url: article.url
    }));
  } catch (error) {
    console.error('فشل جلب الأخبار العاجلة:', error);
    return [];
  }
};
