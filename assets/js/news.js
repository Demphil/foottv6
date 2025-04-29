import { fetchSportsNews, fetchBreakingNews } from './news-api.js';

// عناصر DOM مع التحقق من وجودها
const getElement = (id) => {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Element with ID '${id}' not found`);
  }
  return element;
};

const sportsNewsContainer = getElement('sports-news');
const breakingNewsContainer = getElement('breaking-news');
const loadingIndicator = getElement('loading');

/**
 * عرض الأخبار في واجهة المستخدم
 * @param {Array} articles - مصفوفة المقالات
 * @param {HTMLElement} container - العنصر الذي سيتم عرض الأخبار فيه
 */
function displayNews(articles, container) {
  if (!container) return;

  container.innerHTML = '';

  if (!articles || articles.length === 0) {
    container.innerHTML = '<p class="no-news">لا توجد أخبار متاحة حالياً</p>';
    return;
  }

  articles.forEach(article => {
    const newsCard = document.createElement('div');
    newsCard.className = 'news-card';
    
    newsCard.innerHTML = `
      <div class="news-image">
        ${article.image ? `<img src="${article.image}" alt="${article.title}" loading="lazy">` : ''}
      </div>
      <div class="news-content">
        <h3 class="news-title">${article.title}</h3>
        <p class="news-description">${article.description}</p>
        <div class="news-meta">
          <span class="news-source">${article.source?.name || 'مصدر غير معروف'}</span>
          <span class="news-date">${article.publishedAt || ''}</span>
        </div>
        <a href="${article.url}" target="_blank" class="read-more">قراءة المزيد</a>
      </div>
    `;
    
    container.appendChild(newsCard);
  });
}

/**
 * جلب وعرض البيانات الأولية
 */
async function loadInitialData() {
  try {
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    
    // جلب الأخبار الرياضية
    if (sportsNewsContainer) {
      const sportsNews = await fetchSportsNews('sa', 6);
      displayNews(sportsNews, sportsNewsContainer);
    }
    
    // جلب الأخبار العاجلة
    if (breakingNewsContainer) {
      const breakingNews = await fetchBreakingNews('sa', 3);
      displayNews(breakingNews, breakingNewsContainer);
    }
    
  } catch (error) {
    console.error('حدث خطأ أثناء جلب البيانات:', error);
    
    if (sportsNewsContainer) {
      sportsNewsContainer.innerHTML = '<p class="error-msg">حدث خطأ أثناء جلب الأخبار الرياضية</p>';
    }
    
    if (breakingNewsContainer) {
      breakingNewsContainer.innerHTML = '<p class="error-msg">حدث خطأ أثناء جلب الأخبار العاجلة</p>';
    }
    
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }
}

/**
 * تهيئة التطبيق
 */
function initApp() {
  // التحقق من وجود العناصر الأساسية قبل البدء
  if (!sportsNewsContainer || !breakingNewsContainer) {
    console.error('One or more required elements are missing in the DOM');
    return;
  }

  // جلب البيانات الأولية
  loadInitialData();
  
  // يمكنك إضافة المزيد من الوظائف هنا
  // مثل: تحديث الأخبار كل 5 دقائق
  // setInterval(loadInitialData, 300000);
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);
