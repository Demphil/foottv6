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
  currentSearchTerm: '' // سنعتمد على البحث كمصدر أساسي
};

// وظائف مساعدة (تبقى كما هي)
const helpers = {
  showLoading: () => { if(elements.loading) elements.loading.style.display = 'flex'; },
  hideLoading: () => { if(elements.loading) elements.loading.style.display = 'none'; },
  showError: (msg) => { if(elements.errorContainer) elements.errorContainer.innerHTML = `<div class="error">${msg}</div>`; },
  clearError: () => { if(elements.errorContainer) elements.errorContainer.innerHTML = ''; }
};

/**
 * دالة لتحليل HTML واستخراج الأخبار من kooora.com
 */
function parseNews(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const articles = [];
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
 * دالة جديدة وموحدة لجلب الأخبار من kooora.com
 */
async function fetchNews(page = 1) {
  let targetUrl;
  const searchTerm = state.currentSearchTerm;

  // إذا كان هناك مصطلح بحث، استخدم رابط البحث
  if (searchTerm) {
      targetUrl = `${SOURCE_BASE_URL}?s=${encodeURIComponent(searchTerm)}&page=${page}`;
  } else {
      // إذا لم يكن هناك بحث، اعرض الصفحة الرئيسية للأخبار
      targetUrl = `${SOURCE_BASE_URL}news/?page=${page}`;
  }

  try {
    helpers.showLoading();
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const html = await response.text();
    const articles = parseNews(html);
    
    helpers.hideLoading();
    
    if (articles.length < 10) { // إذا كانت النتائج أقل من المتوقع، فهذه هي الصفحة الأخيرة
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
  const initialNews = await fetchNews();
  renderSportsNews(initialNews);
  renderBreakingNews(initialNews.slice(0, 4));
  setupEventListeners();
}

// إعداد كل مستمعي الأحداث
function setupEventListeners() {
  elements.searchBtn?.addEventListener('click', handleSearch);
  elements.searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });

  // الأقسام الآن تعمل كأزرار بحث جاهزة
  elements.categoryButtons?.forEach(btn => {
    btn.addEventListener('click', async () => {
      elements.categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const categoryTerm = btn.dataset.category;
      
      // إذا كان الزر هو "الكل"، امسح مصطلح البحث
      if (categoryTerm === 'news' || categoryTerm === 'all') {
          state.currentSearchTerm = '';
      } else {
          // وإلا، استخدم القيمة ككلمة بحث
          state.currentSearchTerm = categoryTerm;
      }
      
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
  state.currentSearchTerm = term; // لا نحتاج للبحث إذا كان فارغًا، سيعود تلقائيًا للأخبار العامة
  state.currentPage = 1;
  helpers.clearError();
  const results = await fetchNews(state.currentPage);
  renderSportsNews(results);
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', init);
