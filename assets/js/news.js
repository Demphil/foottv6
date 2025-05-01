const apiKey = '320e688cfb9682d071750f4212f83753';
const baseUrl = 'https://gnews.io/api/v4';
const language = 'ar';
const maxResults = 10;
let currentPage = 1;
let currentCategory = 'كرة القدم';

// عناصر DOM
const sportsNewsContainer = document.getElementById('sports-news');
const breakingNewsContainer = document.getElementById('breaking-news');
const loadingIndicator = document.getElementById('loading');
const errorContainer = document.getElementById('error-container');
const loadMoreBtn = document.getElementById('load-more');
const searchInput = document.getElementById('news-search');

// عرض التحميل
function showLoading() {
  loadingIndicator.style.display = 'block';
}
function hideLoading() {
  loadingIndicator.style.display = 'none';
}

// عرض خطأ
function showError(message) {
  errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
}

// كلمات مفتاحية موحدة
const keywords = [
  "كرة القدم", "المنتخب المغربي", "الوداد", "الرجاء",
  "الدوري السعودي", "دوري أبطال أوروبا", "Cristiano Ronaldo", "Messi"
];

// جلب الأخبار مع كاش محلي
async function fetchNewsCached() {
  const cacheKey = "cachedNews";
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const articles = JSON.parse(cached);
      displayBreakingNews(articles);
      displayNews(articles);
      return;
    } catch (err) {
      console.warn("فشل تحليل الكاش المحلي، يتم إعادة الطلب");
      localStorage.removeItem(cacheKey);
    }
  }

  const url = `${baseUrl}/search?q=${encodeURIComponent(keywords.join(" OR "))}&lang=${language}&max=${maxResults}&apikey=${apiKey}`;
  try {
    showLoading();
    const response = await fetch(url);
    const data = await response.json();
    hideLoading();

    if (!data.articles || data.articles.length === 0) {
      showError('لم يتم العثور على أخبار.');
      return;
    }

    localStorage.setItem(cacheKey, JSON.stringify(data.articles));
    displayBreakingNews(data.articles);
    displayNews(data.articles);
  } catch (err) {
    hideLoading();
    showError('حدث خطأ أثناء جلب الأخبار.');
    console.error(err);
  }
}

// عرض الأخبار العاجلة
function displayBreakingNews(articles) {
  breakingNewsContainer.innerHTML = '';
  articles.slice(0, 5).forEach(article => {
    const item = document.createElement('div');
    item.className = 'breaking-news-item';

    item.innerHTML = `
      <img src="${article.image || 'fallback.jpg'}" alt="${article.title}">
      <div class="content">
        <h3>${article.title}</h3>
        <p>${article.description || ''}</p>
      </div>
    `;

    breakingNewsContainer.appendChild(item);
  });
}

// عرض الأخبار الرياضية
function displayNews(articles, append = false) {
  if (!append) sportsNewsContainer.innerHTML = '';
  articles.forEach(article => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <img src="${article.image || 'assets/images/placeholder.jpg'}" alt="صورة الخبر">
      <div class="news-content">
        <h3>${article.title}</h3>
        <p>${article.description || ''}</p>
        <a href="${article.url}" target="_blank">قراءة المزيد</a>
      </div>
    `;
    sportsNewsContainer.appendChild(card);
  });
}

// تحميل الأخبار المبدئية
fetchNewsCached();

// زر البحث — غير مفعل لتقليل الطلبات
document.getElementById('search-btn').addEventListener('click', () => {
  alert("خاصية البحث غير مفعلة لتفادي تجاوز الحد المجاني.");
});

// تحميل المزيد — غير مفعل كذلك
loadMoreBtn.addEventListener('click', () => {
  alert("لا يمكن تحميل المزيد في الوقت الحالي لتجنب تجاوز الحد.");
});

// تصنيف الأخبار — فقط عرض محلي من الكاش
document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.category-btn.active').classList.remove('active');
    btn.classList.add('active');
    // لا يتم إرسال طلب جديد — فقط فلترة لاحقًا إن أردت
  });
});
