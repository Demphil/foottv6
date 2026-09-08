// assets/js/news.js

// --- 1. الإعدادات الأساسية (نظام RSS المجاني) ---
const RSS_URL = encodeURIComponent('https://arabic.rt.com/rss/sport/'); // مصدر موثوق بصور عالية الدقة
const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${RSS_URL}`;
const CACHE_KEY = "koralive_rss_news_cache";
const CACHE_DURATION = 2 * 60 * 60 * 1000; // تخزين مؤقت لمدة ساعتين لحماية السرعة

// --- 2. إدارة العناصر (التعرف على الصفحتين) ---
const elements = {
    grid: document.getElementById('news-grid-container') || document.getElementById('sports-news'),
    breakingGrid: document.getElementById('breaking-news'), 
    searchInput: document.getElementById('news-search-input') || document.getElementById('news-search'),
    searchBtn: document.getElementById('search-btn'),
    filterBtns: document.querySelectorAll('.filter-btn'), 
    categoryBtns: document.querySelectorAll('.category-btn'), 
    loadMoreBtn: document.getElementById('load-more')
};

// حالة التطبيق الداخلية للفلترة والتقسيم
let state = {
    allArticles: [],       // كل الأخبار القادمة من المصدر
    filteredArticles: [],  // الأخبار بعد تطبيق البحث/الفلتر
    currentIndex: 0,       // مؤشر لزر "تحميل المزيد"
    itemsPerPage: 9        // عدد البطاقات في كل ضغطة
};

// --- 3. دوال الكاش ---
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

// --- 4. دالة الجلب الأساسية ---
async function fetchNews() {
    const cachedData = getCache(CACHE_KEY);
    if (cachedData && cachedData.length > 0) {
        return cachedData;
    }
    
    try {
        if (elements.grid) {
            elements.grid.innerHTML = '<div class="loading-placeholder" style="grid-column: 1/-1; text-align:center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i><p>جاري جلب أحدث الأخبار...</p></div>';
        }

        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        const articles = result.items || [];

        if (articles.length > 0) {
            setCache(CACHE_KEY, articles);
        }
        return articles;

    } catch (error) {
        console.error('RSS Fetch Error:', error);
        if (elements.grid) elements.grid.innerHTML = '<p class="error-msg" style="grid-column: 1/-1; text-align:center;">عذراً، تعذر الاتصال بمزود الأخبار.</p>';
        return [];
    }
}

// --- 5. منطق العرض والتقسيم ---
function displayNews(append = false) {
    if (!elements.grid) return;

    // تنظيف الحاوية إذا كان بحثاً جديداً (وليس تحميل المزيد)
    if (!append) {
        elements.grid.innerHTML = '';
        if (elements.breakingGrid) elements.breakingGrid.innerHTML = '';
        state.currentIndex = 0;
    }

    if (state.filteredArticles.length === 0) {
        elements.grid.innerHTML = '<p class="no-news" style="grid-column: 1/-1; text-align: center; color: #888;">لا توجد أخبار تطابق بحثك حالياً.</p>';
        updateLoadMoreBtn();
        return;
    }

    let itemsToRender = [];
    
    // إذا كنا في صفحة الأخبار الرئيسية (فيها العاجل) والتحميل من الصفر
    if (!append && elements.breakingGrid) {
        // أخذ أول 5 للعاجل
        const breaking = state.filteredArticles.slice(0, 5);
        breaking.forEach(article => {
            elements.breakingGrid.appendChild(createNewsCard(article, 'breaking'));
        });
        state.currentIndex = 5;
    }

    // أخذ الدفعة التالية للشبكة
    itemsToRender = state.filteredArticles.slice(state.currentIndex, state.currentIndex + state.itemsPerPage);
    state.currentIndex += itemsToRender.length;

    itemsToRender.forEach(article => {
        elements.grid.appendChild(createNewsCard(article, 'standard'));
    });

    updateLoadMoreBtn();
}

// دالة إنشاء البطاقة
function createNewsCard(article, type) {
    const title = article.title || 'تحديث رياضي';
    // تنظيف وصف RSS من أكواد HTML ليكون نصاً نقياً
    const description = stripHTML(article.description || article.content || '');
    const articleUrl = sanitizeUrl(article.link);
    const imgUrl = sanitizeUrl(article.thumbnail || (article.enclosure && article.enclosure.link), 'assets/images/default-news.jpg');
    
    // تحديد البادج بذكاء
    let badge = "عالمي";
    if (title.includes("سعودي") || title.includes("النصر") || title.includes("الهلال")) badge = "السعودية";
    if (title.includes("مصري") || title.includes("الأهلي") || title.includes("الزمالك")) badge = "مصر";
    if (title.includes("إسباني") || title.includes("ريال") || title.includes("برشلونة")) badge = "إسبانيا";
    if (title.includes("إنجليزي") || title.includes("سيتي") || title.includes("ليفربول")) badge = "إنجلترا";
    if (title.includes("مغرب") || title.includes("أسود")) badge = "المغرب";

    const card = document.createElement('article');
    card.className = type === 'breaking' ? 'breaking-news-card' : 'news-card'; 
    
    card.innerHTML = `
        <div class="news-image-wrapper">
            <span class="news-category-badge">${escapeHTML(badge)}</span>
            <img src="${escapeAttribute(imgUrl)}" alt="${escapeAttribute(title)}" loading="lazy" onerror="this.src='assets/images/default-news.jpg'">
        </div>
        <div class="news-content">
            <h3 class="news-title">
                <a href="${escapeAttribute(articleUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(truncateText(title, 80))}</a>
            </h3>
            ${description ? `<p class="news-summary">${escapeHTML(truncateText(description, 100))}</p>` : ''}
            <div class="news-meta">
                <span><i class="far fa-clock"></i> ${escapeHTML(formatDate(article.pubDate))}</span>
                <span class="news-source">RT Sports</span>
                <a href="${escapeAttribute(articleUrl)}" target="_blank" rel="noopener noreferrer" class="read-more-link">اقرأ <i class="fas fa-arrow-left"></i></a>
            </div>
        </div>
    `;
    return card;
}

// --- 6. الفلترة والبحث المحلي ---
function applyFilter(keyword) {
    if (!keyword || keyword === 'كرة القدم' || keyword === 'all') {
        state.filteredArticles = [...state.allArticles];
    } else {
        const lowerKeyword = keyword.toLowerCase();
        // فلترة ذكية تبحث في العنوان والوصف معاً
        state.filteredArticles = state.allArticles.filter(a => 
            (a.title && a.title.toLowerCase().includes(lowerKeyword)) || 
            (a.description && a.description.toLowerCase().includes(lowerKeyword))
        );
    }
    displayNews(false); // إعادة العرض من الصفر بناءً على الفلتر
}

function setupFilterClick(btn) {
    btn.addEventListener('click', () => {
        const siblings = btn.parentElement.querySelectorAll('button');
        siblings.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        let query = btn.dataset.category;
        if(query === 'football' || query === 'all') query = 'كرة القدم';
        if(query === 'spanish') query = 'إسباني';
        if(query === 'english') query = 'إنجليزي';
        if(query === 'saudi') query = 'سعودي';
        if(query === 'champions') query = 'أبطال';
        if(query === 'transfers') query = 'انتقال';

        applyFilter(query);
    });
}

// --- 7. دوال مساعدة ---
function updateLoadMoreBtn() {
    if (elements.loadMoreBtn) {
        // إظهار الزر فقط إذا كان هناك أخبار متبقية في المصفوفة
        if (state.currentIndex < state.filteredArticles.length) {
            elements.loadMoreBtn.style.display = 'inline-flex';
            elements.loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> تحميل المزيد';
            elements.loadMoreBtn.disabled = false;
        } else {
            elements.loadMoreBtn.style.display = 'none';
        }
    }
}

function stripHTML(htmlStr) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = htmlStr;
    return tmp.textContent || tmp.innerText || "";
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
    const date = new Date(dateString.replace(/-/g, '/'));
    return date.toLocaleDateString('ar-EG-u-nu-latn', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric' 
    });
}

// --- 8. التهيئة عند بدء التشغيل ---
async function init() {
    state.allArticles = await fetchNews();
    state.filteredArticles = [...state.allArticles];
    
    displayNews(false); // العرض الأولي

    // تفعيل البحث
    const performSearch = () => {
        const term = elements.searchInput?.value.trim();
        applyFilter(term);
    };

    elements.searchBtn?.addEventListener('click', performSearch);
    elements.searchInput?.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearch(); });

    // تفعيل الفلاتر
    elements.filterBtns?.forEach(btn => setupFilterClick(btn));
    elements.categoryBtns?.forEach(btn => setupFilterClick(btn));

    // تفعيل زر تحميل المزيد
    elements.loadMoreBtn?.addEventListener('click', () => {
        elements.loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري...';
        elements.loadMoreBtn.disabled = true;
        
        setTimeout(() => {
            displayNews(true); // true = استمرار (إضافة للأسفل)
        }, 300); // تأخير وهمي بسيط ليعطي إحساساً بالتحميل والتفاعل
    });
}

document.addEventListener('DOMContentLoaded', init);
