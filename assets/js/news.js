// --- الإعدادات الأساسية للنظام الجديد (sport360.com) ---
const PROXY_URL = 'https://news.koora-live.workers.dev/?url='; // <-- تأكد من أنه رابط العامل الخاص بك
const SOURCE_BASE_URL = 'https://arabic.sport360.com/';

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
  currentCategory: 'football', // القسم الافتراضي هو "كرة القدم"
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
 * دالة لتحليل HTML واستخراج الأخبار من arabic.sport360.com (مع المحددات الصحيحة)
 */
function parseNews(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const articles = [];
    
    // المحدد الرئيسي الصحيح لكل خبر في sport360 هو 'article.post-item'
    const newsElements = doc.querySelectorAll('article.post-item');
    
    // رسالة مساعدة للتحقق من أننا نجد العناصر
    console.log(`Found ${newsElements.length} news elements with selector 'article.post-item'`);

    newsElements.forEach(element => {
        const titleElement = element.querySelector('h2.post-title a');
        const imageElement = element.querySelector('.post-image img');
        const descriptionElement = element.querySelector('.post-excerpt p');
        const dateElement = element.querySelector('.post-date');

        if (titleElement && imageElement && titleElement.href) {
            articles.push({
                title: titleElement.textContent.trim(),
                url: titleElement.href,
                image: imageElement.dataset.src || imageElement.src, // للتعامل مع التحميل البطيء
                description: descriptionElement ? descriptionElement.textContent.trim() : '',
                publishedAt: dateElement ? dateElement.textContent.trim() : new Date().toISOString(),
                source: { name: "Sport360" }
            });
        }
    });
    return articles;
}

/**
 * دالة جديدة وموحدة لجلب الأخبار من sport360.com
 */
async function fetchNews(page = 1) {
  let targetUrl;
  
  if (state.currentSearchTerm) {
    targetUrl = `${SOURCE_BASE_URL}page/${page}/?s=${encodeURIComponent(state.currentSearchTerm)}`;
  } else {
    // بناء الرابط للأقسام والصفحة الرئيسية
    targetUrl = `${SOURCE_BASE_URL}category/${state.currentCategory}/page/${page}`;
  }
  
  try {
    helpers.showLoading();
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const html = await response.text();
    const articles = parseNews(html);
    
    helpers.hideLoading();
    
    if (articles.length < 10) { 
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

// دوال العرض (render) تبقى كما هي
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
    // إذا لم تكن هناك أخبار، اعرض رسالة
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

// التحميل الأولي
async function init() {
  const initialNews = await fetchNews();
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
      
      const category = btn.dataset.category === 'all' ? 'football' : btn.dataset.category;
      
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

// معالج البحث
async function handleSearch() {
  const term = elements.searchInput.value.trim();
  state.currentSearchTerm = term;
  state.currentCategory = 'football'; // إعادة تعيين القسم عند البحث
  state.currentPage = 1;
  helpers.clearError();
  const results = await fetchNews(state.currentPage);
  renderSportsNews(results);
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', init);
