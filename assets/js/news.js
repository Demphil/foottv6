// الإعدادات الأساسية
const apiKey = 'c3043545e8b02be6502326236791500f';
const baseUrl = 'https://gnews.io/api/v4';
const language = 'ar';
const maxResults = 10;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 ساعات

// عناصر DOM
const elements = {
  breakingNews: document.getElementById('breaking-news'),
  sportsNews: document.getElementById('sports-news'),
  loading: document.getElementById('loading'),
  errorContainer: document.getElementById('error-container'),
  loadMoreBtn: document.getElementById('load-more'),
  searchInput: document.getElementById('news-search'),
  searchBtn: document.getElementById('search-btn'),
  categoryButtons: document.querySelectorAll('.category-btn')
};

// حالة التطبيق
let state = {
  currentPage: 1,
  currentCategory: 'all',
  breakingNews: []
};

// وظائف مساعدة
const helpers = {
  showLoading: () => elements.loading.style.display = 'flex',
  hideLoading: () => elements.loading.style.display = 'none',
  showError: (msg) => elements.errorContainer.innerHTML = `<div class="error">${msg}</div>`,
  clearError: () => elements.errorContainer.innerHTML = ''
};

// جلب الأخبار
async function fetchNews(category = 'all', page = 1) {
  const query = category === 'all' ? 'كرة القدم' : category;
  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&lang=ar&country=eg&max=${maxResults}&page=${page}&apikey=${apiKey}`;
  
  try {
    helpers.showLoading();
    const response = await fetch(url);
    const data = await response.json();
    helpers.hideLoading();
    
    if (!data.articles || data.articles.length === 0) {
      helpers.showError('لا توجد أخبار متاحة');
      return [];
    }
    
    return data.articles;
  } catch (error) {
    helpers.hideLoading();
    helpers.showError('حدث خطأ في جلب الأخبار');
    console.error('Fetch error:', error);
    return [];
  }
}

// جلب الأخبار العاجلة
async function fetchBreakingNews() {
  const keywords = ["كرة القدم", "رياضة", "الدوري", "منتخب"];
  const query = keywords.join(' OR ');
  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&lang=ar&country=eg&max=4&apikey=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error('Breaking news error:', error);
    return [];
  }
}

// عرض الأخبار العاجلة
function renderBreakingNews(articles) {
  if (!articles || articles.length === 0) {
    elements.breakingNews.innerHTML = '<p class="no-news">لا توجد أخبار عاجلة</p>';
    return;
  }

  elements.breakingNews.innerHTML = articles.map(article => `
    <div class="breaking-news-card">
      <img src="${article.image || 'assets/images/placeholder.jpg'}" 
           alt="${article.title}" 
           class="breaking-news-image">
      <div class="breaking-news-content">
        <h3>${article.title}</h3>
        <p>${article.description || 'لا يوجد وصف'}</p>
      </div>
    </div>
  `).join('');
}

// عرض أخبار الرياضة
function renderSportsNews(articles, append = false) {
  if (!append) {
    elements.sportsNews.innerHTML = '';
  }

  if (!articles || articles.length === 0) {
    elements.sportsNews.innerHTML = '<p class="no-news">لا توجد أخبار رياضية</p>';
    return;
  }

  articles.forEach(article => {
    const card = document.createElement('div');
    card.className = 'sports-news-card';
    card.innerHTML = `
      <img src="${article.image || 'assets/images/placeholder.jpg'}" 
           alt="${article.title}" 
           class="sports-news-image">
      <div class="sports-news-content">
        <h3>${article.title}</h3>
        <p>${article.description || 'لا يوجد وصف'}</p>
        <div class="news-meta">
          <span>${new Date(article.publishedAt).toLocaleDateString()}</span>
          <a href="${article.url}" target="_blank">قراءة المزيد</a>
        </div>
      </div>
    `;
    elements.sportsNews.appendChild(card);
  });
}

// التحميل الأولي
async function init() {
  try {
    // تحميل الأخبار العاجلة
    const breakingNews = await fetchBreakingNews();
    renderBreakingNews(breakingNews);
    
    // تحميل أخبار الرياضة
    const sportsNews = await fetchNews(state.currentCategory);
    renderSportsNews(sportsNews);
    
    // إعداد أحداث البحث
    setupSearch();
    
    // إعداد أحداث التصنيفات
    setupCategories();
    
    // إعداد حدث تحميل المزيد
    setupLoadMore();
    
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// إعداد أحداث البحث
function setupSearch() {
  elements.searchBtn.addEventListener('click', handleSearch);
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
}

async function handleSearch() {
  const term = elements.searchInput.value.trim();
  if (!term) return;
  
  state.currentCategory = 'search';
  state.currentPage = 1;
  
  const results = await fetchNews(term);
  renderSportsNews(results);
}

// إعداد أحداث التصنيفات
function setupCategories() {
  elements.categoryButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      elements.categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      state.currentCategory = btn.dataset.category;
      state.currentPage = 1;
      
      const results = await fetchNews(state.currentCategory);
      renderSportsNews(results);
    });
  });
}

// إعداد حدث تحميل المزيد
function setupLoadMore() {
  elements.loadMoreBtn.addEventListener('click', async () => {
    state.currentPage++;
    const results = await fetchNews(state.currentCategory, state.currentPage);
    renderSportsNews(results, true);
  });
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', init);
