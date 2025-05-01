// news.js
const apiKey = '320e688cfb9682d071750f4212f83753';
const baseUrl = 'https://gnews.io/api/v4';
const language = 'ar';
const country = 'eg';
const maxResults = 10;

let currentPage = 1;
let currentCategory = 'sports';

// DOM elements
const sportsNewsContainer = document.getElementById('sports-news-container');
const loadingIndicator = document.getElementById('loading');
const errorContainer = document.getElementById('error-container');
const loadMoreBtn = document.getElementById('load-more');
const searchInput = document.getElementById('search-container');

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

// Fetch news
async function fetchNews(endpoint, query = '') {
  const url = `${baseUrl}/${endpoint}?q=${encodeURIComponent(query)}&lang=${language}&country=${country}&max=${maxResults}&apikey=${apiKey}&page=${currentPage}`;
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

// Display sports news
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

// Initial load
async function loadInitialNews() {
  const articles = await fetchNews('search', 'كرة القدم');
  displayNews(articles);
}

loadInitialNews();

// Load more
loadMoreBtn.addEventListener('click', async () => {
  currentPage++;
  const articles = await fetchNews('search', 'كرة القدم');
  displayNews(articles, true);
});

// Search button
document.getElementById('search-btn').addEventListener('click', async () => {
  const query = searchInput.value.trim();
  if (!query) return;
  currentPage = 1;
  const articles = await fetchNews('search', query);
  displayNews(articles);
});
