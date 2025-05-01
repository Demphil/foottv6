//=================== الإعدادات ===================
const apiKey        = 'c3043545e8b02be6502326236791500f';
const baseUrl       = 'https://gnews.io/api/v4';
const language      = 'ar';
const country       = 'eg';
const maxResults    = 10;
const breakingMax   = 10;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 ساعات

// الحالة
let currentPage     = 1;
let currentCategory = 'all';

// الكلمات المفتاحية حسب التصنيفات
const breakingKeywords = [
  "كرة القدم", "رياضة", "المنتخب المغربي", "الوداد", "الرجاء"
];

const breakingKeywords = [كرة القدم", "رياضة", "المنتخب المغربء",
  "الدوري السعودي", "الدوري المغربي", "الدوري الإسباني",
  "Champions League", "كأس العالم"
];

//=================== عناصر DOM ===================
const sportsNewsContainer   = document.getElementById('sports-news');
const breakingNewsContainer = document.getElementById('breaking-news');
const loadingIndicator      = document.getElementById('loading');
const errorContainer        = document.getElementById('error-container');
const loadMoreBtn           = document.getElementById('load-more');
const searchInput           = document.getElementById('news-search');
const searchBtn             = document.getElementById('search-btn');
const categoryButtons       = document.querySelectorAll('.category-btn');

//=================== وظائف مساعدة ===================
function showLoading()    { loadingIndicator.style.display = 'block'; }
function hideLoading()    { loadingIndicator.style.display = 'none'; }
function showError(msg)   { errorContainer.innerHTML = `<div class="error-message">${msg}</div>`; }
function clearError()     { errorContainer.innerHTML = ''; }

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
  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&lang=${language}&country=${country}&max=${breakingMax}&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.articles) {
      displayBreakingNews(data.articles.slice(0, breakingMax));
    } else {
      displayBreakingNews([]);
    }
  } catch (err) {
    console.warn('فشل في جلب الأخبار العاجلة', err);
  }
}

//=================== عرض الأخبار ===================
function displayNews(articles, append = false) {
  if (!append) sportsNewsContainer.innerHTML = '';
  articles.forEach(a => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <img src="${a.image || 'assets/images/placeholder.jpg'}" alt="صورة الخبر">
      <div class="news-content">
        <h3>${a.title}</h3>
        <p>${a.description || ''}</p>
        <a href="${a.url}" target="_blank">قراءة المزيد</a>
      </div>
    `;
    sportsNewsContainer.appendChild(card);
  });
}

function displayBreakingNews(articles) {
  breakingNewsContainer.innerHTML = '';
  if (articles.length === 0) {
    breakingNewsContainer.innerHTML = '<p>لا توجد أخبار عاجلة حالياً.</p>';
    return;
  }
  articles.forEach(a => {
    const div = document.createElement('div');
    div.className = 'breaking-news-item';
    div.innerHTML = ` 
      <img src="${a.image || 'assets/images/placeholder.jpg'}" alt="${a.title}">
      <div class="content">
        <h3>${a.title}</h3>
        <p>${a.description || ''}</p>
      </div>
    `;
    breakingNewsContainer.appendChild(div);
  });
}

//=================== التحميل الأولي ===================
async function loadInitial() {
  const cacheKey = `news-${currentCategory}`;
  let articles = loadFromLocalStorage(cacheKey);

  if (!articles) {
    const query = categoryQueries[currentCategory];
    articles = await fetchNews(query, currentPage);
    saveToLocalStorage(cacheKey, articles);
  }

  displayNews(articles);
  await fetchBreakingNews();
}
loadInitial();

//=================== الأحداث ===================
// تحميل المزيد
loadMoreBtn.addEventListener('click', async () => {
  currentPage++;
  const cacheKey = `news-${currentCategory}`;
  let articles = loadFromLocalStorage(cacheKey);

  if (!articles) {
    const query = categoryQueries[currentCategory];
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
      const query = categoryQueries[currentCategory] || 'كرة القدم';
      articles = await fetchNews(query, currentPage);
      saveToLocalStorage(cacheKey, articles);
    }

    displayNews(articles);
  });
});
