//=================== الإعدادات ===================
const apiKey   ='c3043545e8b02be6502326236791500f';
url = 'https://gnews.io/api/v4/top-headlines?category=' + category + '&lang=en&country=us&max=10&apikey=' + apikey;

fetch(url)
  .then(function (response) {
    return response.json();
  })
  .then(function (data) {
    articles = data.articles;

    for (i = 0; i < articles.length; i++) {
      // articles[i].title
      console.log("Title: " + articles[i]['title']);
      // articles[i].description
      console.log("Description: " + articles[i]['description']);
      // You can replace {property} below with any of the article properties returned by the API.
      // articles[i].{property}
      // console.log(articles[i]['{property}']);

      // Delete this line to display all the articles returned by the request. Currently only the first article is displayed.
      break;
    }
  });;
const baseUrl      = 'https://gnews.io/api/v4';
const language     = 'ar';
const country      = 'eg';
const maxResults   = 10;
const breakingMax  = 10;  // عدد مقالات الأخبار العاجلة

// مدة حفظ البيانات (6 ساعات = 21600000 ميلي ثانية)
const CACHE_DURATION = 6 * 60 * 60 * 1000;

// حفظ الصفحة والتصنيف الحالي
let currentPage     = 1;
let currentCategory = 'all';

// ربط قيم data-category بعبارات البحث بالعربية
const categoryQueries = {
  all:       'كرة القدم',
  transfers: 'انتقالات',
  matches:   'مباريات',
  injuries:  'إصابات'
};

// كلمات مفتاحية للأخبار العاجلة (ستُستخدم بالحلقة)
const breakingKeywords = [
  "كرة القدم", "رياضة", "المنتخب المغربي", "الوداد", "الرجاء",
  "الدوري السعودي", "الدوري المصري", "الدوري الإسباني",
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

//=================== دوال مساندة ===================
function showLoading()    { loadingIndicator.style.display = 'block'; }
function hideLoading()    { loadingIndicator.style.display = 'none'; }
function showError(msg)   { errorContainer.innerHTML = `<div class="error-message">${msg}</div>`; }
function clearError()     { errorContainer.innerHTML = ''; }

// دالة جلب الأخبار العامّة
async function fetchNews(query, page = 1) {
  const url = `${baseUrl}/search` +
              `?q=${encodeURIComponent(query)}` +
              `&lang=${language}` +
              `&country=${country}` +
              `&max=${maxResults}` +
              `&page=${page}` +
              `&apikey=${apiKey}`;

  try {
    showLoading();
    clearError();
    const res  = await fetch(url);
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

// دالة جلب الأخبار العاجلة بكلمات مفتاحية متعددة
async function fetchBreakingNews() {
  let all = [];
  for (const kw of breakingKeywords) {
    try {
      const url  = `${baseUrl}/search?q=${encodeURIComponent(kw)}` +
                   `&lang=${language}&country=${country}` +
                   `&max=2&apikey=${apiKey}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.articles) all = all.concat(data.articles);
    } catch (err) {
      console.warn(`فشل جلب عاجل لـ: ${kw}`, err);
    }
    if (all.length >= breakingMax) break;
  }
  displayBreakingNews(all.slice(0, breakingMax));
}

// عرض الأخبار العاجلة
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

// عرض الأخبار العادية
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

// دالة لحفظ الأخبار في localStorage
function saveToLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

// دالة لتحميل الأخبار من localStorage
function loadFromLocalStorage(key) {
  const savedData = JSON.parse(localStorage.getItem(key));
  if (savedData && (Date.now() - savedData.timestamp < CACHE_DURATION)) {
    return savedData.data;
  }
  return null;
}

//=================== الأحداث ===================
// تحميل أولي
async function loadInitial() {
  const cacheKey = `news-${currentCategory}`;
  let articles = loadFromLocalStorage(cacheKey);
  
  if (!articles) {
    const q = categoryQueries[currentCategory];
    articles = await fetchNews(q, currentPage);
    saveToLocalStorage(cacheKey, articles);
  }

  displayNews(articles);
  await fetchBreakingNews();
}
loadInitial();

// زر “تحميل المزيد”
loadMoreBtn.addEventListener('click', async () => {
  currentPage++;
  const cacheKey = `news-${currentCategory}`;
  let articles = loadFromLocalStorage(cacheKey);
  
  if (!articles) {
    const q = categoryQueries[currentCategory];
    articles = await fetchNews(q, currentPage);
    saveToLocalStorage(cacheKey, articles);
  }
  
  displayNews(articles, true);
});

// زر البحث
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
      const q = categoryQueries[currentCategory] || 'كرة القدم';
      articles = await fetchNews(q, currentPage);
      saveToLocalStorage(cacheKey, articles);
    }

    displayNews(articles);
  });
});
