// --- الإعدادات الأساسية للنظام الجديد ---
const WORKER_URL = 'https://news.koora-live.workers.dev/'; // <-- رابط العامل الخاص بك

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
  currentCategory: 'أخبار-الكرة-العالمية', // القسم الافتراضي الجديد
  currentSearchTerm: ''
};

// وظائف مساعدة
const helpers = {
  showLoading: () => { if(elements.loading) elements.loading.style.display = 'flex'; },
  hideLoading: () => { if(elements.loading) elements.loading.style.display = 'none'; },
  showError: (msg) => { if(elements.errorContainer) elements.errorContainer.innerHTML = `<div class="error">${msg}</div>`; },
  clearError: () => { if(elements.errorContainer) elements.errorContainer.innerHTML = ''; }
};

/**
 * دالة جديدة ومبسطة لجلب الأخبار كـ JSON من العامل
 */
async function fetchNews(page = 1) {
  let targetUrl;
  
  if (state.currentSearchTerm) {
    targetUrl = `${WORKER_URL}?s=${encodeURIComponent(state.currentSearchTerm)}&page=${page}`;
  } else {
    targetUrl = `${WORKER_URL}?category=${state.currentCategory}&page=${page}`;
  }
  
  try {
    helpers.showLoading();
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const articles = await response.json();
    helpers.hideLoading();
    
    // korascope يعرض 20 خبرًا في الصفحة
    if (articles.length < 20) { 
      elements.loadMoreBtn.style.display = 'none';
    } else {
      elements.loadMoreBtn.style.display = 'inline-block';
    }
    return articles;
  } catch (error) {
    helpers.hideLoading();
    helpers.showError('حدث خطأ في جلب الأخبار من المصدر.');
    console.error('Fetch error:', error);
    return [];
  }
}

// ... بقية دوال الملف (render, init, etc.) تبقى كما هي تمامًا ...

function renderBreakingNews(articles) {
    if (!elements.breakingNews) return;
    if (!articles || articles.length === 0) {
        elements.breakingNews.innerHTML = '<p class="no-news">No breaking news available.</p>';
        return;
    }
    elements.breakingNews.innerHTML = articles.map(article => `
        <div class="breaking-news-card">
            <a href="${article.url}" target="_blank" rel="noopener noreferrer">
                <img src="${article.image || 'assets/images/placeholder.jpg'}" alt="${article.title}" class="breaking-news-image" onerror="this.src='assets/images/placeholder.jpg';"/>
                <div class="breaking-news-content">
                    <h3>${article.title}</h3>
                </div>
            </a>
        </div>
    `).join('');
}
function renderSportsNews(articles, append = false) {
    if (!elements.sportsNews) return;
    if (!append) {
        elements.sportsNews.innerHTML = '';
    }
    if (!append && (!articles || articles.length === 0)) {
        elements.sportsNews.innerHTML = '<p class="no-news">No news found for this category.</p>';
        return;
    }
    articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'sports-news-card';
        card.innerHTML = `
            <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-card-link">
                <img src="${article.image || 'assets/images/placeholder.jpg'}" alt="${article.title}" class="sports-news-image" onerror="this.src='assets/images/placeholder.jpg';"/>
                <div class="sports-news-content">
                    <h3>${article.title}</h3>
                    <p>${article.description || ''}</p>
                    <div class="news-meta">
                        <span>${article.publishedAt}</span>
                        <span>Read More</span>
                    </div>
                </div>
            </a>
        `;
        elements.sportsNews.appendChild(card);
    });
}
async function init() {
  helpers.clearError();
  const initialNews = await fetchNews();
  renderSportsNews(initialNews);
  renderBreakingNews(initialNews.slice(0, 4));
  setupEventListeners();
}
function setupEventListeners() {
  elements.searchBtn?.addEventListener('click', handleSearch);
  elements.searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
  elements.categoryButtons?.forEach(btn => {
    btn.addEventListener('click', async () => {
      elements.categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const category = btn.dataset.category === 'all' ? 'أخبار-الكرة-العالمية' : btn.dataset.category;
      state.currentCategory = category;
      state.currentSearchTerm = '';
      state.currentPage = 1;
      const results = await fetchNews(state.currentPage);
      renderSportsNews(results);
    });
  });
  elements.loadMoreBtn?.addEventListener('click', async () => {
    state.currentPage++;
    const moreNews = await fetchNews(state.currentPage);
    renderSportsNews(moreNews, true);
  });
}
async function handleSearch() {
  const term = elements.searchInput.value.trim();
  state.currentSearchTerm = term;
  state.currentCategory = ''; // مسح القسم عند البحث
  state.currentPage = 1;
  helpers.clearError();
  const results = await fetchNews(state.currentPage);
  renderSportsNews(results);
}
document.addEventListener('DOMContentLoaded', init);
