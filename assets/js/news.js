import { fetchSportsNews, fetchBreakingNews } from './news-api.js';

// عناصر DOM مع التحقق من وجودها
const getElement = (id) => {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Element with ID '${id}' not found`);
  }
  return element;
};

// العناصر المطلوبة
const elements = {
  sportsNewsContainer: getElement('sports-news'),
  breakingNewsContainer: getElement('breaking-news'),
  loadingIndicator: getElement('loading'),
  errorContainer: getElement('error-container')
};

/**
 * عرض الأخبار في واجهة المستخدم
 */
function displayNews(articles, container) {
  if (!container) return;

  container.innerHTML = '';

  if (!articles || articles.length === 0) {
    container.innerHTML = `
      <div class="no-news-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>لا توجد أخبار متاحة حالياً</p>
      </div>
    `;
    return;
  }

  articles.forEach(article => {
    const newsCard = document.createElement('div');
    newsCard.className = 'news-card';
    
    newsCard.innerHTML = `
      <div class="news-image">
        ${article.image ? `<img src="${article.image}" alt="${article.title}" loading="lazy">` : 
          `<div class="no-image"><i class="fas fa-image"></i></div>`}
      </div>
      <div class="news-content">
        <h3 class="news-title">${article.title}</h3>
        <p class="news-description">${article.description || 'لا يوجد وصف متاح'}</p>
        <div class="news-meta">
          <span class="news-source">${article.source?.name || 'مصدر غير معروف'}</span>
          <span class="news-date">${formatDate(article.publishedAt)}</span>
        </div>
        <a href="${article.url}" target="_blank" class="read-more">قراءة المزيد</a>
      </div>
    `;
    
    container.appendChild(newsCard);
  });
}

/**
 * تنسيق التاريخ
 */
function formatDate(dateString) {
  if (!dateString) return 'تاريخ غير معروف';
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString('ar-SA', options);
}

/**
 * عرض رسالة خطأ
 */
function showError(message) {
  if (!elements.errorContainer) return;
  
  elements.errorContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${message}</p>
      <button class="retry-btn" id="retry-btn">
        <i class="fas fa-sync-alt"></i> إعادة المحاولة
      </button>
    </div>
  `;

  document.getElementById('retry-btn')?.addEventListener('click', loadInitialData);
}

/**
 * جلب وعرض البيانات الأولية
 */
async function loadInitialData() {
  try {
    if (elements.loadingIndicator) {
      elements.loadingIndicator.style.display = 'block';
    }
    
    if (elements.errorContainer) {
      elements.errorContainer.innerHTML = '';
    }

    // جلب الأخبار الرياضية
    if (elements.sportsNewsContainer) {
      const sportsNews = await fetchSportsNews('sa', 6);
      displayNews(sportsNews, elements.sportsNewsContainer);
    }
    
    // جلب الأخبار العاجلة
    if (elements.breakingNewsContainer) {
      const breakingNews = await fetchBreakingNews('sa', 3);
      displayNews(breakingNews, elements.breakingNewsContainer);
    }
    
  } catch (error) {
    console.error('حدث خطأ أثناء جلب البيانات:', error);
    showError('تعذر تحميل الأخبار. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
    
  } finally {
    if (elements.loadingIndicator) {
      elements.loadingIndicator.style.display = 'none';
    }
  }
}

/**
 * تهيئة التطبيق
 */
function initApp() {
  // التحقق من وجود العناصر الأساسية
  const requiredElements = [
    'sportsNewsContainer',
    'breakingNewsContainer',
    'loadingIndicator'
  ];

  const missingElements = requiredElements.filter(
    el => !elements[el]
  );

  if (missingElements.length > 0) {
    console.error('العناصر المفقودة:', missingElements);
    showError('حدث خطأ في تحميل واجهة المستخدم');
    return;
  }

  // جلب البيانات الأولية
  loadInitialData();
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);
