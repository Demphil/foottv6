//=================== الإعدادات ===================
const apiKey       = '320e688cfb9682d071750f4212f83753';
const baseUrl      = 'https://gnews.io/api/v4';
const language     = 'ar';
const country      = 'eg';
const maxResults   = 10;
const breakingMax  = 10;  // عدد مقالات الأخبار العاجلة

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

// دالة جلب الأخبار العاجلة مع فاصل زمني بين الطلبات
async function fetchBreakingNews() {
  const cachedData = localStorage.getItem('breakingNews');
  const lastFetchTime = localStorage.getItem('breakingNewsTime');
  const currentTime = Date.now();

  // إذا كانت البيانات قديمة (مثلاً، مرت ساعة)
  if (cachedData && lastFetchTime && currentTime - lastFetchTime < 3600000) {
    // استخدم البيانات المخزنة
    displayBreakingNews(JSON.parse(cachedData));
    return;
  }

  let all = [];
  for (const kw of breakingKeywords) {
    try {
      const url = `${baseUrl}/search?q=${encodeURIComponent(kw)}` +
        `&lang=${language}&country=${country}` +
        `&max=2&apikey=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.articles) all = all.concat(data.articles);

      // إضافة فاصل زمني
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1000 ميلي ثانية (1 ثانية)
    } catch (err) {
      console.warn(`فشل جلب عاجل لـ: ${kw}`, err);
    }
    if (all.length >= breakingMax) break;
  }

  // حفظ البيانات في الذاكرة المحلية
  localStorage.setItem('breakingNews', JSON.stringify(all.slice(0, breakingMax)));
  localStorage.setItem('breakingNewsTime', currentTime.toString());

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

//=================== الأحداث ===================
// تحميل أولي
async function loadInitial() {
  const q = categoryQueries[currentCategory];
  const arts = await fetchNews(q, currentPage);
  displayNews(arts);
  await fetchBreakingNews();
}
loadInitial();

// زر “تحميل المزيد”
loadMoreBtn.addEventListener('click', async () => {
  currentPage++;
  const q = categoryQueries[currentCategory];
  const arts = await fetchNews(q, currentPage);
  displayNews(arts, true);
});

// زر البحث
searchBtn.addEventListener('click', async () => {
  const term = searchInput.value.trim();
  if (!term) return;
  currentCategory = 'search';
  currentPage = 1;
  const arts = await fetchNews(term, currentPage);
  displayNews(arts);
});

// أزرار التصنيفات
categoryButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    categoryButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentCategory = btn.dataset.category;
    currentPage = 1;

    const q = categoryQueries[currentCategory] || 'كرة القدم';
    const arts = await fetchNews(q, currentPage);
    displayNews(arts);
  });
});
