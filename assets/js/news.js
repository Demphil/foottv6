const apiKey = '320e688cfb9682d071750f4212f83753';
const baseUrl = 'https://gnews.io/api/v4';
const language = 'ar';
const country = 'eg';
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

// جلب الأخبار
async function fetchNews(query = '', page = 1) {
  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&lang=${language}&country=${country}&max=${maxResults}&apikey=${apiKey}&page=${page}`;
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

// عرض الأخبار العاجلة
function displayBreakingNews(articles) {
  breakingNewsContainer.innerHTML = '';

  articles.forEach(article => {
    const item = document.createElement('div');
   
::contentReference[oaicite:0]{index=0}
 
