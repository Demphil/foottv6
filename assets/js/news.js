// assets/js/news.js

// --- 1. الإعدادات الأساسية ---
const API_KEY = "pub_842146e80ac6ec8f039ac3c36364fdb5dcd24"; 
const PAGE_SIZE = 10;
const BASE_URL = `https://newsdata.io/api/1/latest?apikey=${API_KEY}&size=${PAGE_SIZE}&removeduplicate=1`;
const CACHE_DURATION = 8 * 60 * 60 * 1000; 

// --- 2. دوال الكاش ---
function setCache(key, data) {
  try {
    const cacheItem = { timestamp: Date.now(), data: data };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) { console.error("Cache Error:", error); }
}

function getCache(key) {
  try {
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) return null;
    const { timestamp, data } = JSON.parse(cachedItem);
    if ((Date.now() - timestamp) > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch (error) { return null; }
}

// --- 3. إدارة العناصر (التعرف على الصفحتين) ---
const elements = {
  // المحاولة الأولى: ID الصفحة الرئيسية || المحاولة الثانية: ID صفحة الأخبار
  grid: document.getElementById('news-grid-container') || document.getElementById('sports-news'),
  
  // خاص بصفحة الأخبار فقط
  breakingGrid: document.getElementById('breaking-news'), 
  
  // عناصر مشتركة (نبحث عن ID أو Class لضمان العمل)
  searchInput: document.getElementById('news-search-input') || document.getElementById('news-search'),
  searchBtn: document.getElementById('search-btn'),
  
  // الأزرار
  filterBtns: document.querySelectorAll('.filter-btn'), // الصفحة الرئيسية
  categoryBtns: document.querySelectorAll('.category-btn'), // صفحة الأخبار
  
  loadMoreBtn: document.getElementById('load-more')
};

let state = {
  nextPage: null,
  currentKeywords: 'كرة القدم'
};

// --- 4. دالة الجلب ---
async function fetchNews(page = null) {
  const keywords = state.currentKeywords;
  let targetUrl = `${BASE_URL}&language=ar&category=sports&q=${encodeURIComponent(keywords)}`;
  if (page) targetUrl += `&page=${page}`;

  const cacheKey = `news_${keywords}_${page || 'init'}`;
  const cachedData = getCache(cacheKey);

  if (cachedData) {
    state.nextPage = cachedData.nextPage;
    updateLoadMoreBtn();
    return cachedData.articles;
  }
  
  try {
    // إظهار اللودر في الشبكة الرئيسية المتوفرة
    if (!page && elements.grid) {
        elements.grid.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i><p>جاري جلب الأخبار...</p></div>';
    }

    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();

    if (result.status !== "success") throw new Error(result.results?.message || 'API Error');

    const articles = result.results || [];
    state.nextPage = result.nextPage;

    setCache(cacheKey, { articles: articles, nextPage: state.nextPage });
    updateLoadMoreBtn();

    return articles;

  } catch (error) {
    console.error('News Fetch Error:', error);
    if (elements.grid) elements.grid.innerHTML = '<p class="error-msg">عذراً، حدث خطأ في الاتصال.</p>';
    return [];
  }
}

// --- 5. دالة العرض (Render) ---
function renderNews(articles, append = false) {
    if (!elements.grid) return;

    // تنظيف الحاوية إذا لم يكن "تحميل المزيد"
    if (!append) {
        elements.grid.innerHTML = '';
        if (elements.breakingGrid) elements.breakingGrid.innerHTML = ''; // تنظيف العاجل أيضاً
    }

    if (!articles || articles.length === 0) {
        if (!append) elements.grid.innerHTML = '<p class="no-news">لا توجد أخبار.</p>';
        return;
    }

    // --- منطق خاص لصفحة news.html ---
    // إذا كنا في صفحة الأخبار (يوجد breakingGrid) ولم يكن "تحميل المزيد" (append=false)
    // نأخذ أول 4 أخبار ونضعها في "أخبار عاجلة" والباقي في الشبكة
    let mainArticles = articles;
    
    if (elements.breakingGrid && !append) {
        const breakingArticles = articles.slice(0, 4);
        mainArticles = articles.slice(4); // الباقي للشبكة الرئيسية

        breakingArticles.forEach(article => {
            const card = createNewsCard(article, 'breaking');
            elements.breakingGrid.appendChild(card);
        });
    }

    // عرض الباقي في الشبكة الرئيسية (Grid)
    mainArticles.forEach(article => {
        const card = createNewsCard(article, 'standard');
        elements.grid.appendChild(card);
    });
}

// دالة مساعدة لإنشاء HTML البطاقة
function createNewsCard(article, type) {
    const title = article.title || 'خبر كرة قدم';
    const description = article.description || article.content || '';
    const sourceName = article.source_name || article.source_id || 'مصدر رياضي';
    const articleUrl = sanitizeUrl(article.link);
    const imgUrl = sanitizeUrl(article.image_url, 'assets/images/default-news.jpg');
    
    // تحديد البادج
    let badge = "عالمي";
    if(title.includes("سعودي") || title.includes("الهلال")) badge = "السعودية";
    if(title.includes("مصري") || title.includes("الأهلي")) badge = "مصر";
    if(title.includes("إسباني") || title.includes("ريال")) badge = "إسبانيا";

    const card = document.createElement('article');
    // استخدام كلاسات موحدة ليعمل CSS الجديد
    card.className = type === 'breaking' ? 'breaking-news-card' : 'news-card'; 
    
    // HTML موحد (يعتمد على CSS الجديد)
    card.innerHTML = `
        <div class="news-image-wrapper">
            <span class="news-category-badge">${escapeHTML(badge)}</span>
            <img src="${escapeAttribute(imgUrl)}" alt="${escapeAttribute(title)}" loading="lazy" onerror="this.src='assets/images/default-news.jpg'">
        </div>
        <div class="news-content">
            <h3 class="news-title">
                <a href="${escapeAttribute(articleUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(truncateText(title, 82))}</a>
            </h3>
            ${description ? `<p class="news-summary">${escapeHTML(truncateText(description, 120))}</p>` : ''}
            <div class="news-meta">
                <span><i class="far fa-clock"></i> ${escapeHTML(formatDate(article.pubDate))}</span>
                <span class="news-source">${escapeHTML(truncateText(sourceName, 24))}</span>
                <a href="${escapeAttribute(articleUrl)}" target="_blank" rel="noopener noreferrer" class="read-more-link">اقرأ <i class="fas fa-arrow-left"></i></a>
            </div>
        </div>
    `;
    return card;
}

// --- 6. دوال مساعدة وزر التحميل ---
function updateLoadMoreBtn() {
    if (elements.loadMoreBtn) {
        // إظهار الزر فقط إذا كانت هناك صفحة تالية
        elements.loadMoreBtn.style.display = state.nextPage ? 'inline-flex' : 'none'; // inline-flex لتوسط الأيقونة
        elements.loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> تحميل المزيد';
        elements.loadMoreBtn.disabled = false;
    }
}

function truncateText(text, length) {
    if (!text) return "";
    return text.length > length ? text.substring(0, length) + "..." : text;
}

function sanitizeUrl(url, fallback = '#') {
    if (!url) return fallback;
    try {
        const parsed = new URL(url, window.location.origin);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
    } catch (error) {}
    return fallback;
}

function escapeHTML(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
    return escapeHTML(value).replaceAll('`', '&#096;');
}

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    
    // التغيير هنا: استخدام 'ar-EG-u-nu-latn' لإجبار الأرقام اللاتينية
    return date.toLocaleDateString('ar-EG-u-nu-latn', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric' // أضفت السنة لتكون المعلومة كاملة (يمكنك إزالتها إذا أردت)
    });
}

// --- 7. التهيئة ---
async function init() {
    // 1. جلب وعرض الأخبار
    const initialNews = await fetchNews();
    renderNews(initialNews);

    // صفحة الأخبار تعرض دفعة إضافية تلقائياً لتظهر بطاقات أكثر بدون انتظار أول نقرة.
    if (elements.breakingGrid && state.nextPage) {
        const moreInitialNews = await fetchNews(state.nextPage);
        renderNews(moreInitialNews, true);
    }
    
    // 2. تفعيل البحث (يعمل في الصفحتين)
    const performSearch = async () => {
        const term = elements.searchInput?.value.trim();
        if (!term) return;
        state.currentKeywords = term;
        state.nextPage = null;
        const results = await fetchNews();
        renderNews(results);
    };

    elements.searchBtn?.addEventListener('click', performSearch);
    elements.searchInput?.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearch(); });

    // 3. تفعيل الفلاتر (للصفحة الرئيسية)
    elements.filterBtns?.forEach(btn => setupFilterClick(btn));
    // 4. تفعيل التصنيفات (لصفحة news.html)
    elements.categoryBtns?.forEach(btn => setupFilterClick(btn));

    // 5. تفعيل زر تحميل المزيد (المشكلة كانت هنا وتم حلها)
    elements.loadMoreBtn?.addEventListener('click', async () => {
        if (state.nextPage) {
            elements.loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري...';
            elements.loadMoreBtn.disabled = true; // منع النقر المتكرر
            
            const moreNews = await fetchNews(state.nextPage);
            renderNews(moreNews, true); // true = إضافة للأسفل
        }
    });
}

// دالة مساعدة للفلاتر
function setupFilterClick(btn) {
    btn.addEventListener('click', async () => {
        // إزالة active من جميع الأزرار المشابهة
        const siblings = btn.parentElement.querySelectorAll('button');
        siblings.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        let query = btn.dataset.category;
        if(query === 'football' || query === 'all') query = 'كرة القدم';
        
        // تحويل كلمات الفلاتر الإنجليزية (index.html) إلى عربي
        if(query === 'spanish') query = 'الدوري الإسباني';
        if(query === 'english') query = 'الدوري الإنجليزي';
        if(query === 'saudi') query = 'الدوري السعودي';
        if(query === 'champions') query = 'دوري أبطال أوروبا';
        if(query === 'transfers') query = 'انتقالات لاعبين';

        state.currentKeywords = query;
        state.nextPage = null;
        const results = await fetchNews();
        renderNews(results);
    });
}

document.addEventListener('DOMContentLoaded', init);
