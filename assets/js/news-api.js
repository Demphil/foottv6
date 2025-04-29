// إعدادات API
const apiKey = '320e688cfb9682d071750f4212f83753';
const baseUrl = 'https://gnews.io/api/v4/top-headlines';

/**
 * جلب الأخبار الرياضية
 * @param {string} country - رمز الدولة (مثال: 'sa' للسعودية، 'eg' لمصر)
 * @param {number} maxResults - عدد النتائج المراد جلبها
 * @returns {Promise} وعد يحتوي على بيانات الأخبار
 */
export async function fetchSportsNews(country = 'sa', maxResults = 10) {
  try {
    const url = `${baseUrl}?category=sports&lang=ar&country=${country}&max=${maxResults}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`خطأ في الشبكة: ${response.status}`);
    }
    
    const data = await response.json();
    return data.articles;
    
  } catch (error) {
    console.error('فشل جلب الأخبار الرياضية:', error);
    throw error;
  }
}

/**
 * جلب الأخبار العاجلة
 * @param {string} country - رمز الدولة
 * @param {number} maxResults - عدد النتائج المراد جلبها
 * @returns {Promise} وعد يحتوي على بيانات الأخبار العاجلة
 */
export async function fetchBreakingNews(country = 'sa', maxResults = 5) {
  try {
    const url = `${baseUrl}?category=general&lang=ar&country=${country}&max=${maxResults}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`خطأ في الشبكة: ${response.status}`);
    }
    
    const data = await response.json();
    return data.articles;
    
  } catch (error) {
    console.error('فشل جلب الأخبار العاجلة:', error);
    throw error;
  }
}
