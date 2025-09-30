// --- الإعدادات الأساسية للنظام الجديد ---
const PROXY_URL = 'https://news.koora-live.workers.dev/?url='; // <-- تأكد من أنه رابط العامل الخاص بك
const SOURCE_BASE_URL = 'https://www.hihi2.com/';
const maxResults = 12; // عدد الأخبار في كل صفحة

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

// حالة التطبيق (تبقى كما هي)
let state = {
  currentPage: 1,
  currentCategory: 'all',
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
 * دالة جديدة لتحليل HTML واستخراج الأخبار
 * @param {string} html - The raw HTML content from hihi2.com
 * @returns {Array} - An array of article objects
 */
function parseNews(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const articles = [];
    
    // المحدد الرئيسي لكل خبر في hihi2.com
    const newsElements = doc.querySelectorAll('article.post-box');

    newsElements.forEach(element => {
        const titleElement = element.querySelector('h2.post-title a');
        const imageElement = element.querySelector('.post-img img');
        const descriptionElement = element.querySelector('p.post-excerpt');
        const dateElement = element.querySelector('span.post-date');

        if (titleElement && imageElement) {
            articles.push({
                title: titleElement.textContent.trim(),
                url: titleElement.href,
                image: imageElement.dataset.src || imageElement.src, // للتعامل مع التحميل البطيء للصور
                description: descriptionElement ? descriptionElement.textContent.trim() : 'لا يوجد وصف متاح.',
                publishedAt: dateElement ? dateElement.textContent.trim() : new Date().toISOString(),
                source: { name: "HiHi2" }
            });
        }
    });
    return articles;
}

/**
 * دالة جديدة لجلب الأخبار عن طريق الـ scraping
 * @param {string} category - The category or search term
 * @param {number} page - The page number
 * @returns {Promise<Array>}
 */
async function fetchNews(category = 'all', page = 1) {
  let targetUrl;

  if (state.currentSearchTerm) {
      // حالة البحث
      targetUrl = `${SOURCE_BASE_URL}page/${page}/?s=${encodeURIComponent(state.currentSearchTerm)}`;
  } else if (category === 'all') {
      // الصفحة الرئيسية
      targetUrl = `${SOURCE_BASE_URL}page/${page}/`;
  } else {
      // الأقسام
      targetUrl = `${SOURCE_BASE_URL}category/${category}/page/${page}/`;
  }

  try {
    helpers.showLoading();
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const html = await response.text();
    const articles = parseNews(html);
    
    helpers.hideLoading();
    
    if (articles.length === 0) {
      elements.loadMoreBtn.style.display = 'none'; // إخفاء زر "تحميل المزيد" إذا لا توجد نتائج
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
    // ... (هذه الدالة تبقى كما هي، لا تغيير)
}
function renderSportsNews(articles, append = false) {
    // ... (هذه الدالة تبقى كما هي، لا تغيير)
}

// التحميل الأولي (تم تعديله قليلاً)
async function init() {
  const sportsNews = await fetchNews('all');
  renderSportsNews(sportsNews);
  
  // الأخبار العاجلة ستكون أول 4 أخبار من الصفحة الرئيسية
  renderBreakingNews(sportsNews.slice(0, 4));

  setupSearch();
  setupCategories();
  setupLoadMore();
}

// معالج البحث (تم تعديله)
async function handleSearch() {
  const term = elements.searchInput.value.trim();
  if (!term) return;
  
  state.currentCategory = 'all'; // إعادة تعيين القسم
  state.currentSearchTerm = term;
  state.currentPage = 1;
  
  const results = await fetchNews();
  renderSportsNews(results);
}

// معالج الأقسام (تم تعديله)
function setupCategories() {
  elements.categoryButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      elements.categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      state.currentCategory = btn.dataset.category;
      state.currentSearchTerm = ''; // مسح البحث السابق
      state.currentPage = 1;
      
      const results = await fetchNews(state.currentCategory);
      renderSportsNews(results);
    });
  });
}

// دالة تحميل المزيد (تم تعديلها قليلاً)
async function setupLoadMore() {
  elements.loadMoreBtn.addEventListener('click', async () => {
    state.currentPage++;
    const results = await fetchNews(state.currentCategory, state.currentPage);
    renderSportsNews(results, true); // true للإضافة على المحتوى الحالي
  });
}

// دوال البحث والإعدادات الأخرى تبقى كما هي
function setupSearch() {
    // ... (هذه الدالة تبقى كما هي، لا تغيير)
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', init);
