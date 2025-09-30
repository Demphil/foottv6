// --- الإعدادات الأساسية للنظام الجديد (kooora.com) ---
const PROXY_URL = 'https://news.koora-live.workers.dev/?url='; // <-- تأكد من أنه رابط العامل الخاص بك
const SOURCE_BASE_URL = 'https://www.kooora.com/';

// عناصر DOM (تبقى كما هي)
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
  currentCategory: 'news', // القسم الافتراضي هو "الأخبار"
  currentSearchTerm: ''
};

// وظائف مساعدة (تبقى كما هي)
const helpers = {
  showLoading: () => { if(elements.loading) elements.loading.style.display = 'flex'; },
  hideLoading: () => { if(elements.loading) elements.loading.style.display = 'none'; },
  showError: (msg) => { if(elements.errorContainer) elements.errorContainer.innerHTML = `<div class="error">${msg}</div>`; },
  clearError: () => { if(elements.errorContainer) elements.errorContainer.innerHTML = ''; }
};

/**
 * دالة جديدة لتحليل HTML واستخراج الأخبار من kooora.com
 * @param {string} html - The raw HTML content
 * @returns {Array} - An array of article objects
 */
function parseNews(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const articles = [];
    
    // المحدد الرئيسي لكل خبر في kooora.com
    const newsElements = doc.querySelectorAll('li.post_item');

    newsElements.forEach(element => {
        const titleElement = element.querySelector('h3 a');
        const imageElement = element.querySelector('img.post_img');
        const descriptionElement = element.querySelector('p.post_excerpt');
        const dateElement = element.querySelector('span.post_date');

        if (titleElement && imageElement && titleElement.href) {
            articles.push({
                title: titleElement.textContent.trim(),
                url: titleElement.href,
                image: imageElement.dataset.src || imageElement.src,
                description: descriptionElement ? descriptionElement.textContent.trim() : '',
                publishedAt: dateElement ? dateElement.textContent.trim() : new Date().toISOString(),
                source: { name: "Kooora" }
            });
        }
    });
    return articles;
}

/**
 * دالة جديدة لجلب الأخبار من kooora.com
 * @param {string} category - The category or search term
 * @param {number} page - The page number
 * @returns {Promise<Array>}
 */
async function fetchNews(category = 'news', page = 1) {
  let targetUrl;

  if (state.currentSearchTerm) {
      targetUrl = `${SOURCE_BASE_URL}?s=${encodeURIComponent(state.currentSearchTerm)}&page=${page}`;
  } else {
      targetUrl = `${SOURCE_BASE_URL}${category}/?page=${page}`;
  }

  try {
    helpers.showLoading();
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const html = await response.text();
    const articles = parseNews(html);
    
    helpers.hideLoading();
    
    if (articles.length === 0) {
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

// دوال العرض (render) تبقى كما هي تقريبًا
function renderBreakingNews(articles) {
    if (!elements.breakingNews) return;
    if (!articles || articles.length === 0) {
        elements.breakingNews.innerHTML = '<p class="no-news">لا توجد أخبار عاجلة.</p>';
        return;
    }
    elements.breakingNews.innerHTML = articles.map(article => `
        <div class="breaking-news-card">
            <img src="${article.image || 'assets/images/placeholder.jpg'}" alt="${article.title}" class="breaking-news-image" onerror="this.src='assets/images/placeholder.jpg';"/>
            <div class="breaking-news-content">
                <h3><a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a></h3>
            </div>
        </div>
    `).join('');
}
function renderSportsNews(articles, append = false) {
    if (!elements.sportsNews) return;
    if (!append) {
        elements.sportsNews.innerHTML = '';
    }
    articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'sports-news-card';
        card.innerHTML = `
            <img src="${article.image || 'assets/images/placeholder.jpg'}" alt="${article.title}" class="sports-news-image" onerror="this.src='assets/images/placeholder.jpg';"/>
            <div class="sports-news-content">
                <h3><a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a></h3>
                <p>${article.description || ''}</p>
                <div class="news-meta">
                    <span>${article.publishedAt}</span>
                    <a href="${article.url}" target="_blank" rel="noopener noreferrer">قراءة المزيد</a>
                </div>
            </div>
        `;
        elements.sportsNews.appendChild(card);
    });
}

// التحميل الأولي
async function init() {
  const initialNews = await fetchNews('news');
  renderSportsNews(initialNews);
  renderBreakingNews(initialNews.slice(0, 4));
  setupEventListeners();
}

// إعداد كل مستمعي الأحداث
function setupEventListeners() {
  elements.searchBtn?.addEventListener('click', handleSearch);
  elements.searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });

  elements.categoryButtons?.forEach(btn => {
    btn.addEventListener('click', async () => {
      elements.categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentCategory = btn.dataset.category || 'news';
      state.currentSearchTerm = '';
      state.currentPage = 1;
      const results = await fetchNews(state.currentCategory);
      renderSportsNews(results);
    });
  });

  elements.loadMoreBtn?.addEventListener('click', async () => {
    state.currentPage++;
    const moreNews = await fetchNews(state.currentCategory, state.currentPage);
    renderSportsNews(moreNews, true);
  });
}

// معالج البحث
async function handleSearch() {
  const term = elements.searchInput.value.trim();
  if (!term) return;
  state.currentSearchTerm = term;
  state.currentPage = 1;
  helpers.clearError();
  const results = await fetchNews();
  renderSportsNews(results);
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', init);
