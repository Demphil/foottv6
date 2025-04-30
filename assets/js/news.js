// news.js
const apiKey = '320e688cfb9682d071750f4212f83753';
const baseUrl = 'https://gnews.io/api/v4/top-headlines?sports=general&apikey=320e688cfb9682d071750f4212f83753';
const language = 'ar';
const country = 'eg';
const maxResults = 10;

let currentPage = 1;
let currentCategory = 'general';

// DOM elements
const breakingNewsContainer = document.getElementById('breaking-news');
const sportsNewsContainer = document.getElementById('sports-news');
const loadingIndicator = document.getElementById('loading');
const errorContainer = document.getElementById('error-container');
const loadMoreBtn = document.getElementById('load-more');

// Show loader
function showLoading() {
  loadingIndicator.style.display = 'block';
}

// Hide loader
function hideLoading() {
  loadingIndicator.style.display = 'none';
}

// Show error
function showError(message) {
  errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
}

// Fetch news from GNews API
async function fetchNews(category, page = 1) {
  const url = `${baseUrl}?category=${category}&lang=${language}&country=${country}&max=${maxResults}&page=${page}&apikey=${apiKey}`;
  try {
    showLoading();
    const response = await fetch(url);
    const data = await response.json();
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

// Display breaking news (first 3)
function displayBreakingNews(articles) {
  breakingNewsContainer.innerHTML = '';
  const breaking = articles.slice(0, 3);
  breaking.forEach(article => {
    const div = document.createElement('div');
    div.className = 'breaking-news-item';
    div.innerHTML = `
      <a href="${article.url}" target="_blank" class="breaking-link">
        <h3>${article.title}</h3>
        <p>${article.description || ''}</p>
      </a>
    `;
    breakingNewsContainer.appendChild(div);
  });
}

// Display sports news
function displaySportsNews(articles, append = false) {
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

// تحميل الأخبار عند بداية الصفحة
async function loadInitialNews() {
  const articles = await fetchNews(currentCategory);
  displayBreakingNews(articles);
  displaySportsNews(articles);
}

loadInitialNews();

// تحميل المزيد عند الضغط على الزر
loadMoreBtn.addEventListener('click', async () => {
  currentPage++;
  const articles = await fetchNews(currentCategory, currentPage);
  displaySportsNews(articles, true);
});

// تصفية الأخبار حسب التصنيفات (dummy logic — GNews API لا يدعم تصنيفات مخصصة)
document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    currentPage = 1;
    const selected = btn.dataset.category;
    currentCategory = selected === 'all' ? 'general' : 'sports'; // GNews doesn't support custom categories
    const articles = await fetchNews(currentCategory);
    displayBreakingNews(articles);
    displaySportsNews(articles);
  });
});

// البحث في الأخبار (من input)
document.getElementById('search-btn').addEventListener('click', async () => {
  const query = document.getElementById('news-search').value.trim();
  if (!query) return;

  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${language}&country=${country}&max=${maxResults}&apikey=${apiKey}`;
  try {
    showLoading();
    const response = await fetch(url);
    const data = await response.json();
    hideLoading();
    if (!data.articles || data.articles.length === 0) {
      showError('لم يتم العثور على نتائج للبحث.');
      return;
    }
    displayBreakingNews(data.articles);
    displaySportsNews(data.articles);
  } catch (err) {
    hideLoading();
    showError('فشل البحث.');
    console.error(err);
  }
});
