// news-api.js

const API_KEY = '320e688cfb9682d071750f4212f83753'; // استبدل بمفتاح API الفعلي
const BASE_URL = 'https://gnews.io/api/v4';

/**
 * جلب الأخبار الرياضية
 * @param {string} country - رمز الدولة (مثال: 'sa' للسعودية)
 * @param {number} maxResults - عدد النتائج المطلوبة
 * @param {number} page - رقم الصفحة
 * @returns {Promise<Array>} مصفوفة من المقالات
 */
export async function fetchSportsNews(country = 'sa', maxResults = 10, page = 1) {
  try {
    const url = new URL(`${BASE_URL}/top-headlines`);
    url.searchParams.append('category', 'sports');
    url.searchParams.append('country', country);
    url.searchParams.append('max', maxResults);
    url.searchParams.append('page', page);
    url.searchParams.append('apikey', API_KEY);
    url.searchParams.append('lang', 'ar');

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`خطأ في الشبكة: ${response.status}`);
    }
    
    const data = await response.json();
    
    // تعديل التواريخ لتكون متسقة
    const articles = data.articles || [];
    return articles.map(article => ({
      ...article,
      // تحويل التاريخ إلى الصيغة المطلوبة
      publishedAt: formatApiDate(article.publishedAt)
    }));
    
  } catch (error) {
    console.error('فشل جلب الأخبار الرياضية:', error);
    throw error;
  }
}

/**
 * جلب الأخبار العاجلة
 * @param {string} country - رمز الدولة
 * @param {number} maxResults - عدد النتائج المطلوبة
 * @returns {Promise<Array>} مصفوفة من المقالات
 */
export async function fetchBreakingNews(country = 'sa', maxResults = 5) {
  try {
    const url = new URL(`${BASE_URL}/top-headlines`);
    url.searchParams.append('category', 'general');
    url.searchParams.append('country', country);
    url.searchParams.append('max', maxResults);
    url.searchParams.append('apikey', API_KEY);
    url.searchParams.append('lang', 'ar');

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`خطأ في الشبكة: ${response.status}`);
    }
    
    const data = await response.json();
    
    // تعديل التواريخ لتكون متسقة
    const articles = data.articles || [];
    return articles.map(article => ({
      ...article,
      // تحويل التاريخ إلى الصيغة المطلوبة
      publishedAt: formatApiDate(article.publishedAt)
    }));
    
  } catch (error) {
    console.error('فشل جلب الأخبار العاجلة:', error);
    throw error;
  }
}

/**
 * تحويل تنسيق التاريخ من API إلى الصيغة المطلوبة (YYYY/MM/DD)
 * @param {string} dateString - التاريخ من API
 * @returns {string} التاريخ المنسق
 */
function formatApiDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}/${month}/${day}`;
  } catch (error) {
    console.error('خطأ في تنسيق التاريخ:', error);
    return '';
  }
}

/**
 * جلب الفيديوهات (مثال باستخدام API وهمي)
 * @param {number} count - عدد الفيديوهات المطلوبة
 * @returns {Promise<Array>} مصفوفة من الفيديوهات
 */
export async function fetchVideos(count = 3) {
  try {
    // هذا مثال - استبدله برابط API الفعلي للفيديوهات
    const mockVideos = [
      {
        thumbnail: 'https://via.placeholder.com/320x180',
        title: 'أهداف المباراة الأخيرة',
        duration: '02:45',
        views: 12500,
        publishedAt: '2025-04-30T18:30:00Z', // مثال لتاريخ
        url: '#'
      },
      // ... فيديوهات أخرى
    ];
    
    // محاكاة اتصال API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // تعديل تواريخ الفيديوهات
    return mockVideos.slice(0, count).map(video => ({
      ...video,
      publishedAt: formatApiDate(video.publishedAt)
    }));
    
  } catch (error) {
    console.error('فشل جلب الفيديوهات:', error);
    throw error;
  }
}
