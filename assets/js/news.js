import { fetchSportsNews } from './news-api.js';

// عناصر DOM
const sportsNewsContainer = document.getElementById('sports-news');
const breakingNewsContainer = document.getElementById('breaking-news');
const loadingIndicator = document.getElementById('loading');

/**
 * عرض الأخبار في واجهة المستخدم
 * @param {Array} articles - مصفوفة المقالات
 * @param {HTMLElement} container - العنصر الذي سيتم عرض الأخبار فيه
 */
function displayNews(articles, container) {
  container.innerHTML = ''; // مسح المحتوى القديم

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
          <span class="news-source">${article.source.name}</span>
          <span class="news-date">${new Date(article.publishedAt).toLocaleString('ar-SA')}</span>
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
    loadingIndicator.style.display = 'block';
    
    // جلب الأخبار الرياضية
    const sportsNews = await fetchSportsNews('sa', 6);
    displayNews(sportsNews, sportsNewsContainer);
    
    // جلب الأخبار العاجلة
    const breakingNews = await fetchBreakingNews('sa', 3);
    displayNews(breakingNews, breakingNewsContainer);
    
  } catch (error) {
    console.error('حدث خطأ أثناء جلب البيانات:', error);
    sportsNewsContainer.innerHTML = '<p class="error-msg">حدث خطأ أثناء جلب الأخبار الرياضية</p>';
    breakingNewsContainer.innerHTML = '<p class="error-msg">حدث خطأ أثناء جلب الأخبار العاجلة</p>';
  } finally {
    loadingIndicator.style.display = 'none';
  }
}

/**
 * تهيئة التطبيق
 */
function initApp() {
  // جلب البيانات الأولية
  loadInitialData();
  
  // يمكنك إضافة المزيد من الوظائف هنا
  // مثل تحديث الأخبار تلقائياً أو إضافة فلترات
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);
