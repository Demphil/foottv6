// assets/js/news.js

import { fetchFootballNews, fetchBreakingNews } from './news-api.js';

// عناصر DOM
const getDOMElement = (id) => {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Element with ID '${id}' not found`);
  }
  return element;
};

const breakingNewsContainer = getDOMElement('breaking-news');
const mainNewsContainer = getDOMElement('main-news');
const loadingIndicator = getDOMElement('loading-indicator');
const errorContainer = getDOMElement('error-container');
const searchInput = getDOMElement('news-search');

// تأكد من وجود العناصر قبل الاستخدام
if (!breakingNewsContainer || !mainNewsContainer || !loadingIndicator || !errorContainer) {
  console.error('Required DOM elements are missing');
}

// عرض حالة التحميل (معدلة)
const showLoading = () => {
  if (loadingIndicator) loadingIndicator.style.display = 'block';
  if (errorContainer) errorContainer.style.display = 'none';
  if (mainNewsContainer) mainNewsContainer.style.display = 'none';
};

// إخفاء التحميل (معدلة)
const hideLoading = () => {
  if (loadingIndicator) loadingIndicator.style.display = 'none';
  if (mainNewsContainer) mainNewsContainer.style.display = 'grid';
};

// عرض خطأ (معدلة)
const showError = (message) => {
  if (!errorContainer) return;
  
  errorContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${message}</p>
      <button class="retry-btn">إعادة المحاولة</button>
    </div>
  `;
  errorContainer.style.display = 'block';

  // إضافة مستمع حدث للزر الجديد
  const retryBtn = errorContainer.querySelector('.retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', initPage);
  }
};

// باقي الدوال (createBreakingNewsCard, createNewsCard... تبقى كما هي)

// تهيئة الصفحة (معدلة)
const initPage = async () => {
  if (!breakingNewsContainer || !mainNewsContainer) {
    showError('حدث خطأ في تحميل المكونات الرئيسية');
    return;
  }

  showLoading();
  
  try {
    await renderBreakingNews();
    await renderMainNews();
  } catch (error) {
    showError('حدث خطأ في تحميل الأخبار');
    console.error('Initialization error:', error);
  } finally {
    hideLoading();
  }

  // إضافة مستمع الأحداث بشكل آمن
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      if (e.target.value.length > 2) {
        filterNewsBySearch(e.target.value);
      } else if (e.target.value.length === 0) {
        renderMainNews();
      }
    });
  }
};

// بدء التحميل بعد التأكد من اكتمال DOM
document.addEventListener('DOMContentLoaded', () => {
  // تأخير التنفيذ قليلاً لضمان تحميل جميع العناصر
  setTimeout(initPage, 100);
});
