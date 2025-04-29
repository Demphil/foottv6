// assets/js/news.js

import { fetchFootballNews, fetchBreakingNews } from './news-api.js';

// حالة التطبيق
const state = {
  currentPage: 1,
  newsPerPage: 6,
  allNews: [],
  isLoading: false
};

// عناصر DOM
const elements = {
  breakingNews: document.getElementById('breaking-news'),
  mainNews: document.getElementById('main-news'),
  loading: document.getElementById('loading-indicator'),
  error: document.getElementById('error-container'),
  search: document.getElementById('news-search'),
  loadMore: document.getElementById('load-more')
};

// ========== دوال العرض ========== //

const createNewsCard = (article) => {
  return `
    <div class="news-card" onclick="window.open('${article.url}', '_blank')">
      <img src="${article.image}" alt="${article.title}" 
           onerror="this.src='assets/images/default-news.jpg'">
      <div class="news-content">
        <h3>${article.title}</h3>
        <p>${article.excerpt}</p>
        <div class="news-meta">
          <span><i class="far fa-calendar-alt"></i> ${article.date}</span>
          <span><i class="fas fa-source"></i> ${article.source}</span>
        </div>
      </div>
    </div>
  `;
};

const createBreakingNewsCard = (article) => {
  return `
    <div class="breaking-news-card" onclick="window.open('${article.url}', '_blank')">
      <img src="${article.image}" alt="${article.title}"
           onerror="this.src='assets/images/default-news.jpg'">
      <div class="breaking-content">
        <span class="breaking-tag">عاجل</span>
        <h3>${article.title}</h3>
        <div class="breaking-meta">
          <span><i class="far fa-clock"></i> ${article.date}</span>
        </div>
      </div>
    </div>
  `;
};

// ========== دوال جلب البيانات ========== //

const loadInitialData = async () => {
  try {
    setLoading(true);
    
    // جلب البيانات بالتوازي
    const [breakingNews, footballNews] = await Promise.all([
      fetchBreakingNews(),
      fetchFootballNews()
    ]);
    
    state.allNews = footballNews;
    renderBreakingNews(breakingNews);
    renderNews();
    
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
};

const loadMoreNews = async () => {
  try {
    setLoading(true);
    state.currentPage++;
    renderNews();
  } catch (error) {
    showError('فشل تحميل المزيد من الأخبار');
  } finally {
    setLoading(false);
  }
};

// ========== دوال العرض ========== //

const renderBreakingNews = (articles) => {
  if (!articles || articles.length === 0) {
    elements.breakingNews.innerHTML = `
      <div class="no-news">
        <i class="fas fa-info-circle"></i>
        <p>لا توجد أخبار عاجلة حالياً</p>
      </div>
    `;
    return;
  }
  
  elements.breakingNews.innerHTML = articles.map(createBreakingNewsCard).join('');
};

const renderNews = () => {
  const { currentPage, newsPerPage, allNews } = state;
  const startIdx = 0;
  const endIdx = currentPage * newsPerPage;
  const newsToShow = allNews.slice(startIdx, endIdx);
  
  if (newsToShow.length === 0 && currentPage === 1) {
    elements.mainNews.innerHTML = `
      <div class="no-news">
        <i class="far fa-newspaper"></i>
        <p>لا توجد أخبار متاحة حالياً</p>
      </div>
    `;
  } else {
    elements.mainNews.innerHTML = newsToShow.map(createNewsCard).join('');
  }
  
  elements.loadMore.style.display = 
    allNews.length > endIdx ? 'block' : 'none';
};

// ========== دوال المساعدة ========== //

const setLoading = (isLoading) => {
  state.isLoading = isLoading;
  elements.loading.style.display = isLoading ? 'block' : 'none';
  if (elements.loadMore) {
    elements.loadMore.disabled = isLoading;
  }
};

const showError = (message) => {
  elements.error.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${message}</p>
      <button class="retry-btn">إعادة المحاولة</button>
    </div>
  `;
  elements.error.style.display = 'block';
  
  document.querySelector('.retry-btn')?.addEventListener('click', loadInitialData);
};

const filterNewsBySearch = (searchTerm) => {
  const filtered = state.allNews.filter(news => 
    news.title.toLowerCase().includes(searchTerm) || 
    news.excerpt.toLowerCase().includes(searchTerm)
  );
  
  elements.mainNews.innerHTML = filtered.length > 0
    ? filtered.map(createNewsCard).join('')
    : `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <p>لا توجد نتائج مطابقة للبحث</p>
      </div>
    `;
};

// ========== إعداد مستمعي الأحداث ========== //

const setupEventListeners = () => {
  // زر تحميل المزيد
  elements.loadMore?.addEventListener('click', loadMoreNews);
  
  // حقل البحث
  elements.search?.addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    if (term.length > 2) {
      filterNewsBySearch(term);
    } else if (term.length === 0) {
      state.currentPage = 1;
      renderNews();
    }
  });
};

// ========== تهيئة التطبيق ========== //

const initApp = () => {
  setupEventListeners();
  loadInitialData();
};

// بدء التطبيق بعد اكتمال تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);
