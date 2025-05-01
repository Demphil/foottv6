//=================== الإعدادات ===================
const apiKey = 'c3043545e8b02be6502326236791500f';
const baseUrl = 'https://gnews.io/api/v4';
const language = 'ar';
const country = 'eg';
const maxResults = 10;
const breakingMax = 4; // تغيير إلى 4 مقالات فقط
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 ساعات

// الحالة
let currentPage = 1;
let currentCategory = 'all';
let breakingNewsInterval;

// الكلمات المفتاحية حسب التصنيفات
const breakingKeywords = [
  "كرة القدم", "رياضة", "المنتخب المغربي", "الوداد", "الرجاء"
];

//=================== عناصر DOM ===================
const sportsNewsContainer = document.getElementById('sports-news');
const breakingNewsContainer = document.getElementById('breaking-news');
const loadingIndicator = document.getElementById('loading');
const errorContainer = document.getElementById('error-container');
const loadMoreBtn = document.getElementById('load-more');
const searchInput = document.getElementById('news-search');
const searchBtn = document.getElementById('search-btn');
const categoryButtons = document.querySelectorAll('.category-btn');

//=================== وظائف مساعدة ===================
function showLoading() {
  loadingIndicator.style.display = 'flex';
}

function hideLoading() {
  loadingIndicator.style.display = 'none';
}

function showError(msg) {
  errorContainer.innerHTML = `<div class="error-message">${msg}</div>`;
}

function clearError() {
  errorContainer.innerHTML = '';
}

function saveToLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

function loadFromLocalStorage(key) {
  const saved = localStorage.getItem(key);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (Date.now() - parsed.timestamp < CACHE_DURATION) {
      return parsed.data;
    }
  }
  return null;
}

//=================== جلب الأخبار ===================
async function fetchNews(query, page = 1) {
  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&lang=${language}&country=${country}&max=${maxResults}&page=${page}&apikey=${apiKey}`;
  try {
    showLoading();
    clearError();
    const res = await fetch(url);
    const data = await res.json();
    hideLoading();
    if (!data.articles || data.articles.length === 0) {
      showError('لم يتم العثور على أخبار.');
      return [];
    }
    return data.articles;
  } catch (err) {
    hideLoading();
    showError('حدث خطأ أثناء جلب الأخبار.');
    console.error(err);
    return [];
  }
}

async function fetchBreakingNews() {
  const query = breakingKeywords.join(' OR ');
  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&lang=${language}&country=${country}&max=${breakingMax * 2}&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.articles) {
      return data.articles;
    }
    return [];
  } catch (err) {
    console.warn('فشل في جلب الأخبار العاجلة', err);
    return [];
  }
}

//=================== عرض الأخبار ===================
function displayNews(articles, append = false) {
  if (!append) sportsNewsContainer.innerHTML = '';
  
  if (articles.length === 0) {
    sportsNewsContainer.innerHTML = '<p class="no-news">لا توجد أخبار متاحة حالياً.</p>';
    return;
  }

  articles.forEach(article => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <img src="${article.image || 'assets/images/placeholder.jpg'}" alt="صورة الخبر">
      <div class="news-content">
        <h3>${article.title}</h3>
        <p>${article.description || 'لا يوجد وصف متاح'}</p>
        <div class="news-meta">
          <span>${new Date(article.publishedAt).toLocaleDateString()}</span>
          <a href="${article.url}" target="_blank">قراءة المزيد</a>
        </div>
      </div>
    `;
    sportsNewsContainer.appendChild(card);
  });
}

function displayBreakingNews(articles) {
  if (!articles || articles.length === 0) {
    breakingNewsContainer.innerHTML = '<p class="no-news">لا توجد أخبار عاجلة حالياً.</p>';
    return;
  }

  // تقسيم الأخبار إلى مجموعات كل 4 مقالات
  const newsGroups = [];
  for (let i = 0; i < articles.length; i += breakingMax) {
    newsGroups.push(articles.slice(i, i + breakingMax));
  }

  // إنشاء عناصر العرض
  breakingNewsContainer.innerHTML = `
    <div class="breaking-news-items">
      ${newsGroups.map((group, groupIndex) => `
        <div class="breaking-news-group" data-index="${groupIndex}">
          ${group.map(article => `
            <div class="breaking-news-card">
              <img src="${article.image || 'assets/images/placeholder.jpg'}" alt="${article.title}">
              <div class="news-content">
                <h3>${article.title}</h3>
                <p>${article.description || 'لا يوجد وصف متاح'}</p>
                <div class="news-meta">
                  <i class="fas fa-clock"></i>
                  <span>${new Date(article.publishedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
    <div class="breaking-news-controls">
      ${newsGroups.map((_, index) => `
        <div class="breaking-news-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>
      `).join('')}
    </div>
  `;

  // بدء التبديل التلقائي
  startAutoRefresh(newsGroups);
}

function startAutoRefresh(newsGroups) {
  if (newsGroups.length <= 1) return;

  clearInterval(breakingNewsInterval);
  let currentIndex = 0;
  const newsItems = breakingNewsContainer.querySelector('.breaking-news-items');
  const dots = breakingNewsContainer.querySelectorAll('.breaking-news-dot');

  function updateSlider(index) {
    newsItems.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  breakingNewsInterval = setInterval(() => {
    currentIndex = (currentIndex + 1) % newsGroups.length;
    updateSlider(currentIndex);
  }, 20000);

  // إضافة أحداث النقر على النقاط
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.dataset.index);
      currentIndex = index;
      updateSlider(index);
      
      // إعادة تعيين المؤقت
      clearInterval(breakingNewsInterval);
      breakingNewsInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % newsGroups.length;
        updateSlider(currentIndex);
      }, 20000);
    });
  });
}

//=================== التحميل الأولي ===================
async function loadInitial() {
  const cacheKey = `news-${currentCategory}`;
  let articles = loadFromLocalStorage(cacheKey);

  if (!articles) {
    const query = currentCategory === 'all' ? 'كرة القدم' : currentCategory;
    articles = await fetchNews(query, currentPage);
    saveToLocalStorage(cacheKey, articles);
  }

  displayNews(articles);
  
  const breakingCacheKey = 'breaking-news';
  let breakingArticles = loadFromLocalStorage(breakingCacheKey);
  
  if (!breakingArticles) {
    breakingArticles = await fetchBreakingNews();
    saveToLocalStorage(breakingCacheKey, breakingArticles);
  }
  
  displayBreakingNews(breakingArticles);
}

//=================== الأحداث ===================
// تحميل المزيد
loadMoreBtn.addEventListener('click', async () => {
  currentPage++;
  const cacheKey = `news-${currentCategory}`;
  let articles = loadFromLocalStorage(cacheKey);

  if (!articles) {
    const query = currentCategory === 'all' ? 'كرة القدم' : currentCategory;
    articles = await fetchNews(query, currentPage);
    saveToLocalStorage(cacheKey, articles);
  }

  displayNews(articles, true);
});

// البحث
searchBtn.addEventListener('click', async () => {
  const term = searchInput.value.trim();
  if (!term) return;
  currentCategory = 'search';
  currentPage = 1;
  const cacheKey = `news-${term}`;
  let articles = loadFromLocalStorage(cacheKey);

  if (!articles) {
    articles = await fetchNews(term, currentPage);
    saveToLocalStorage(cacheKey, articles);
  }

  displayNews(articles);
});

// أزرار التصنيفات
categoryButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    categoryButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentCategory = btn.dataset.category;
    currentPage = 1;
    const cacheKey = `news-${currentCategory}`;
    let articles = loadFromLocalStorage(cacheKey);

    if (!articles) {
      const query = currentCategory === 'all' ? 'كرة القدم' : currentCategory;
      articles = await fetchNews(query, currentPage);
      saveToLocalStorage(cacheKey, articles);
    }

    displayNews(articles);
  });
});

// البحث عند الضغط على Enter
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});

// التحميل الأولي
document.addEventListener('DOMContentLoaded', loadInitial);
