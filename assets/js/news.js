// assets/js/news.js

// --- 1. الإعدادات الأساسية ---
const API_KEY = "pub_842146e80ac6ec8f039ac3c36364fdb5dcd24"; // مفتاحك الخاص
const BASE_URL = `https://newsdata.io/api/1/latest?apikey=${API_KEY}`;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 ساعة كافية للأخبار

// --- 2. دوال الكاش (احتفظنا بها كما هي لأنها ممتازة) ---
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

// --- 3. إدارة العناصر (تحديث IDs لتطابق HTML الجديد) ---
const elements = {
  grid: document.getElementById('news-grid-container'),
  searchInput: document.getElementById('news-search-input'),
  searchBtn: document.getElementById('search-btn'),
  filterBtns: document.querySelectorAll('.filter-btn'),
  loadMoreBtn: document.querySelector('.load-more-btn') // الزر الجديد
};

let state = {
  nextPage: null,
  currentKeywords: 'كرة القدم' // الكلمة الافتراضية
};

// --- 4. دالة الجلب (Fetch) ---
async function fetchNews(page = null) {
  const keywords = state.currentKeywords;
  
  // بناء الرابط (نبحث في الرياضة وباللغة العربية)
  let targetUrl = `${BASE_URL}&language=ar&category=sports&q=${encodeURIComponent(keywords)}`;
  if (page) targetUrl += `&page=${page}`;

  // محاولة الكاش أولاً
  const cacheKey = `news_${keywords}_${page || 'init'}`;
  const cachedData = getCache(cacheKey);

  if (cachedData) {
    console.log(`⚡ News loaded from cache: ${keywords}`);
    state.nextPage = cachedData.nextPage;
    updateLoadMoreBtn();
    return cachedData.articles;
  }
  
  try {
    // إظهار التحميل إذا كان أول طلب
    if (!page && elements.grid) {
        elements.grid.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i><p>جاري جلب الأخبار...</p></div>';
    }

    const response = await fetch(targetUrl);
    const result = await response.json();

    if (result.status !== "success") throw new Error(result.results?.message || 'API Error');

    const articles = result.results || [];
    state.nextPage = result.nextPage;

    // حفظ في الكاش
    setCache(cacheKey, { articles: articles, nextPage: state.nextPage });
    updateLoadMoreBtn();

    return articles;

  } catch (error) {
    console.error('News Fetch Error:', error);
    if (elements.grid) elements.grid.innerHTML = '<p class="error-msg">عذراً، حدث خطأ أثناء جلب الأخبار.</p>';
    return [];
  }
}

// --- 5. دالة العرض (Render) - تم تحديثها لتطابق التصميم الجديد ---
function renderNews(articles, append = false) {
    if (!elements.grid) return;

    // تنظيف الحاوية إذا لم يكن "تحميل المزيد"
    if (!append) {
        elements.grid.innerHTML = '';
    }

    if (!articles || articles.length === 0) {
        if (!append) elements.grid.innerHTML = '<p class="no-news">لا توجد أخبار تطابق بحثك حالياً.</p>';
        return;
    }

    articles.forEach(article => {
        // فلترة الصور المكسورة
        const imgUrl = article.image_url || 'assets/images/default-news.jpg';
        
        // تحديد التصنيف (Badge)
        let badge = "عالمي";
        if(article.title.includes("سعودي") || article.title.includes("الهلال")) badge = "السعودية";
        if(article.title.includes("مصري") || article.title.includes("الأهلي")) badge = "مصر";
        if(article.title.includes("إسباني") || article.title.includes("ريال")) badge = "إسبانيا";

        const card = document.createElement('article');
        card.className = 'news-card'; // الكلاس الجديد من CSS
        
        card.innerHTML = `
            <div class="news-image-wrapper">
                <span class="news-category-badge">${badge}</span>
                <img src="${imgUrl}" alt="${article.title}" loading="lazy" onerror="this.src='assets/images/default-news.jpg'">
            </div>
            <div class="news-content">
                <h3 class="news-title">
                    <a href="${article.link}" target="_blank">${truncateText(article.title, 60)}</a>
                </h3>
                <div class="news-meta">
                    <span><i class="far fa-clock"></i> ${formatDate(article.pubDate)}</span>
                    <a href="${article.link}" target="_blank" class="read-more-link">التفاصيل <i class="fas fa-arrow-left"></i></a>
                </div>
            </div>
        `;
        elements.grid.appendChild(card);
    });
}

// --- 6. دوال مساعدة ---
function updateLoadMoreBtn() {
    if (elements.loadMoreBtn) {
        elements.loadMoreBtn.style.display = state.nextPage ? 'inline-block' : 'none';
        elements.loadMoreBtn.innerHTML = 'عرض المزيد من الأخبار';
    }
}

function truncateText(text, length) {
    if (!text) return "";
    return text.length > length ? text.substring(0, length) + "..." : text;
}

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

// --- 7. تهيئة الصفحة والأحداث ---
async function init() {
    // التحميل المبدئي
    const initialNews = await fetchNews();
    renderNews(initialNews);
    
    // تفعيل البحث
    elements.searchBtn?.addEventListener('click', handleSearch);
    elements.searchInput?.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleSearch(); });

    // تفعيل الفلاتر
    elements.filterBtns?.forEach(btn => {
        btn.addEventListener('click', async () => {
            // تحديث الشكل (Active Class)
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // تحديد كلمة البحث بناءً على الفلتر
            const cat = btn.dataset.category;
            let query = 'كرة القدم'; // الافتراضي
            
            if(cat === 'spanish') query = 'الدوري الإسباني';
            if(cat === 'english') query = 'الدوري الإنجليزي';
            if(cat === 'saudi') query = 'الدوري السعودي';
            if(cat === 'can afrique ') query = 'دوري ابطال افريقيا';
            if(cat === 'champions') query = 'دوري أبطال أوروبا';
            if(cat === 'transfers') query = 'انتقالات لاعبين';

            state.currentKeywords = query;
            state.nextPage = null;
            
            const results = await fetchNews();
            renderNews(results);
        });
    });

    // تفعيل زر تحميل المزيد
    elements.loadMoreBtn?.addEventListener('click', async () => {
        if (state.nextPage) {
            elements.loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
            const moreNews = await fetchNews(state.nextPage);
            renderNews(moreNews, true); // True تعني أضف النتائج للأسفل ولا تمسح القديم
        }
    });
}

async function handleSearch() {
    const term = elements.searchInput.value.trim();
    if (!term) return;
    
    state.currentKeywords = term;
    state.nextPage = null;
    const results = await fetchNews();
    renderNews(results);
}

// تشغيل الكود عند فتح الصفحة
document.addEventListener('DOMContentLoaded', init);
