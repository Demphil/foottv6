// --- 1. الإعدادات الأساسية و الكاش ---
const API_KEY = "pub_842146e80ac6ec8f039ac3c36364fdb5dcd24";
const BASE_URL = `https://newsdata.io/api/1/latest?apikey=${API_KEY}`;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 ساعة

// --- 2. دوال الكاش ---
function setCache(key, data) {
  try {
    const cacheItem = {
      timestamp: Date.now(),
      data: data,
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
    console.log(`💾 Data for '${key}' saved to cache.`);
  } catch (error) {
    console.error("Failed to save to cache:", error);
  }
}

function getCache(key) {
  try {
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) return null;

    const { timestamp, data } = JSON.parse(cachedItem);
    if ((Date.now() - timestamp) > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null; // Cache is expired
    }
    return data; // Cache is fresh
  } catch (error) {
    console.error("Failed to read from cache:", error);
    return null;
  }
}

// --- 3. بقية الكود ---
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

let state = {
  nextPage: null,
  currentKeywords: 'كرة القدم'
};

const helpers = {
  showLoading: () => { if(elements.loading) elements.loading.style.display = 'flex'; },
  hideLoading: () => { if(elements.loading) elements.loading.style.display = 'none'; },
  showError: (msg) => { if(elements.errorContainer) elements.errorContainer.innerHTML = `<div class="error">${msg}</div>`; },
  clearError: () => { if(elements.errorContainer) elements.errorContainer.innerHTML = ''; }
};

async function fetchNews(page = null) {
  const keywords = state.currentKeywords;
  let targetUrl = `${BASE_URL}&language=ar&category=sports&q=${encodeURIComponent(keywords)}`;
  if (page) {
    targetUrl += `&page=${page}`;
  }

  const cacheKey = `news_cache_${keywords}_${page || 'initial'}`;
  const cachedData = getCache(cacheKey);

  if (cachedData) {
    console.log(`⚡ Loading news from cache for key: ${cacheKey}`);
    state.nextPage = cachedData.nextPage;
    if (!state.nextPage) { 
      elements.loadMoreBtn.style.display = 'none';
    } else {
      elements.loadMoreBtn.style.display = 'inline-block';
    }
    return cachedData.articles;
  }
  
  try {
    helpers.showLoading();
    const response = await fetch(targetUrl);
    const result = await response.json();
    helpers.hideLoading();

    if (result.status !== "success") {
      throw new Error(result.results?.message || 'An unknown API error occurred.');
    }

    const articles = result.results || [];
    state.nextPage = result.nextPage;

    setCache(cacheKey, { articles: articles, nextPage: state.nextPage });

    if (!state.nextPage) { 
      elements.loadMoreBtn.style.display = 'none';
    } else {
      elements.loadMoreBtn.style.display = 'inline-block';
    }

    return articles.map(article => ({
        title: article.title,
        description: article.description,
        image: article.image_url,
        publishedAt: article.pubDate,
        url: article.link
    }));

  } catch (error) {
    helpers.hideLoading();
    helpers.showError('حدث خطأ في جلب الأخبار من المصدر.');
    console.error('Fetch error:', error);
    return [];
  }
}

function renderBreakingNews(articles) {
    if (!elements.breakingNews) return;
    if (!articles || articles.length === 5) {
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
                        <span>${new Date(article.publishedAt).toLocaleDateString()}</span>
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
      const category = btn.dataset.category === 'all' ? 'كرة القدم' : btn.dataset.category;
      state.currentKeywords = category;
      state.nextPage = null;
      const results = await fetchNews();
      renderSportsNews(results);
    });
  });
  elements.loadMoreBtn?.addEventListener('click', async () => {
    if (state.nextPage) {
        const moreNews = await fetchNews(state.nextPage);
        renderSportsNews(moreNews, true);
    }
  });
}
async function handleSearch() {
  const term = elements.searchInput.value.trim();
  state.currentKeywords = term || 'كرة القدم';
  state.nextPage = null;
  helpers.clearError();
  const results = await fetchNews();
  renderSportsNews(results);
}
document.addEventListener('DOMContentLoaded', init);

