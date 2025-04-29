// assets/js/news.js

import { fetchFootballNews, fetchBreakingNews } from './news-api.js';

// عناصر DOM
const breakingNewsContainer = document.getElementById('breaking-news');
const mainNewsContainer = document.getElementById('main-news');
const loadingIndicator = document.getElementById('loading-indicator');
const errorContainer = document.getElementById('error-container');
const searchInput = document.getElementById('news-search');
const categoryButtons = document.querySelectorAll('.category-btn');

// عرض حالة التحميل
const showLoading = () => {
  loadingIndicator.style.display = 'block';
  errorContainer.style.display = 'none';
};

// إخفاء التحميل
const hideLoading = () => {
  loadingIndicator.style.display = 'none';
};

// عرض خطأ
const showError = (message) => {
  errorContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${message}</p>
      <button onclick="window.location.reload()">إعادة المحاولة</button>
    </div>
  `;
  errorContainer.style.display = 'block';
};

// إنشاء بطاقة خبر عاجل
const createBreakingNewsCard = (article) => {
  return `
    <div class="breaking-news-card" onclick="window.open('${article.url}', '_blank')">
      <img src="${article.image}" alt="${article.title}" 
           onerror="this.src='assets/images/default-news.jpg'">
      <div class="breaking-news-content">
        <span class="breaking-tag">عاجل</span>
        <h3 class="breaking-news-title">${article.title}</h3>
        <p class="breaking-news-excerpt">${article.excerpt}</p>
        <div class="breaking-news-meta">
          <span><i class="far fa-calendar-alt"></i> ${article.date}</span>
          <span><i class="far fa-newspaper"></i> ${article.source}</span>
        </div>
      </div>
    </div>
  `;
};

// إنشاء بطاقة خبر عادي
const createNewsCard = (article) => {
  return `
    <div class="news-card" onclick="window.open('${article.url}', '_blank')">
      <img src="${article.image}" alt="${article.title}" 
           onerror="this.src='assets/images/default-news.jpg'">
      <div class="news-content">
        <h3 class="news-title">${article.title}</h3>
        <p class="news-excerpt">${article.excerpt}</p>
        <div class="news-meta">
          <span><i class="far fa-calendar-alt"></i> ${article.date}</span>
          <span><i class="far fa-user"></i> ${article.author}</span>
        </div>
      </div>
    </div>
  `;
};

// عرض الأخبار العاجلة
const renderBreakingNews = async () => {
  try {
    const breakingNews = await fetchBreakingNews();
    breakingNewsContainer.innerHTML = breakingNews.map(createBreakingNewsCard).join('');
  } catch (error) {
    console.error('Error rendering breaking news:', error);
    breakingNewsContainer.innerHTML = '<p>لا توجد أخبار عاجلة حالياً</p>';
  }
};

// عرض الأخبار الرئيسية
const renderMainNews = async () => {
  try {
    const articles = await fetchFootballNews();
    mainNewsContainer.innerHTML = articles.map(createNewsCard).join('');
  } catch (error) {
    showError('تعذر تحميل الأخبار. يرجى المحاولة لاحقاً.');
  } finally {
    hideLoading();
  }
};

// تصفية الأخبار حسب البحث
const filterNewsBySearch = async (searchTerm) => {
  try {
    const articles = await fetchFootballNews();
    const filtered = articles.filter(article => 
      article.title.includes(searchTerm) || 
      article.excerpt.includes(searchTerm)
    );
    
    mainNewsContainer.innerHTML = filtered.length > 0 
      ? filtered.map(createNewsCard).join('')
      : '<p class="no-results">لا توجد نتائج مطابقة للبحث</p>';
  } catch (error) {
    showError('حدث خطأ أثناء البحث');
  }
};

// تهيئة الصفحة
const initPage = async () => {
  showLoading();
  await renderBreakingNews();
  await renderMainNews();
  
  // إضافة مستمع للأحداث
  searchInput.addEventListener('input', (e) => {
    if (e.target.value.length > 2) {
      filterNewsBySearch(e.target.value);
    } else if (e.target.value.length === 0) {
      renderMainNews();
    }
  });

  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // يمكنك إضافة فلترة حسب التصنيف هنا
    });
  });
};

// بدء التحميل عند اكتمال الصفحة
document.addEventListener('DOMContentLoaded', initPage);
