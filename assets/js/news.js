const API_KEY = '320e688cfb9682d071750f4212f83753'; // ← أدخل مفتاح GNews الخاص بك هنا
const BASE_URL = 'https://gnews.io/api/v4/search';
// إعداد متغيرات عامة
const breakingNewsContainer = document.getElementById("breaking-news");
const loadMoreButton = document.getElementById("load-more");
const loadingIndicator = document.getElementById("loading");
const errorContainer = document.getElementById("error-container");

let currentPage = 1;
const pageSize = 6;
const cacheKey = "cachedNewsData";
const cacheTimeKey = "cacheTimestamp";
const cacheTTL = 6 * 60 * 60 * 1000; // 6 ساعات
const apiKey = "320e688cfb9682d071750f4212f83753"; // ضع مفتاح GNews API هنا
const keywords = [
  "كرة القدم الأوروبية",
  "الدوري الإنجليزي",
  "دوري أبطال أوروبا",
  "الدوري الإسباني",
  "الدوري الإيطالي",
  "الدوري الفرنسي",
  "الدوري الألماني",
  "الدوري المغربي",
  "الوداد",
  "الرجاء",
  "المنتخب المغربي",
  "دوري أبطال أفريقيا"
];

function fetchNewsFromAPI() {
  const query = encodeURIComponent(keywords.join(" OR "));
  const url = `https://gnews.io/api/v4/search?q=${query}&lang=ar&country=ma&max=30&apikey=${apiKey}`;

  return fetch(url)
    .then(res => {
      if (!res.ok) throw new Error("API error");
      return res.json();
    })
    .then(data => {
      localStorage.setItem(cacheKey, JSON.stringify(data.articles));
      localStorage.setItem(cacheTimeKey, Date.now());
      return data.articles;
    });
}

function getCachedNews() {
  const cached = localStorage.getItem(cacheKey);
  const timestamp = localStorage.getItem(cacheTimeKey);
  if (!cached || !timestamp) return null;

  if (Date.now() - parseInt(timestamp) > cacheTTL) return null;

  return JSON.parse(cached);
}

function displayArticles(articles, fromIndex, toIndex) {
  const slice = articles.slice(fromIndex, toIndex);
  slice.forEach(article => {
    const card = document.createElement("div");
    card.className = "news-card";

    card.innerHTML = `
      <img src="${article.image || 'https://via.placeholder.com/400x200'}" alt="صورة الخبر">
      <div class="news-content">
        <h3>${article.title}</h3>
        <p>${article.description || ''}</p>
        <a href="${article.url}" target="_blank">قراءة المزيد</a>
      </div>
    `;

    breakingNewsContainer.appendChild(card);
  });
}

function showError(message) {
  errorContainer.textContent = message;
  errorContainer.style.display = "block";
}

function hideError() {
  errorContainer.style.display = "none";
}

function showLoading() {
  loadingIndicator.style.display = "block";
}

function hideLoading() {
  loadingIndicator.style.display = "none";
}

function loadInitial() {
  showLoading();
  hideError();
  const cached = getCachedNews();
  if (cached) {
    hideLoading();
    displayArticles(cached, 0, pageSize);
  } else {
    fetchNewsFromAPI()
      .then(articles => {
        hideLoading();
        displayArticles(articles, 0, pageSize);
      })
      .catch(err => {
        hideLoading();
        showError("حدث خطأ أثناء تحميل الأخبار. حاول لاحقًا.");
      });
  }
}

function loadMoreNews() {
  const allArticles = getCachedNews();
  if (!allArticles) return;

  const from = currentPage * pageSize;
  const to = from + pageSize;
  displayArticles(allArticles, from, to);
  currentPage++;

  if (to >= allArticles.length) {
    loadMoreButton.style.display = "none";
  }
}

loadMoreButton.addEventListener("click", loadMoreNews);
window.addEventListener("DOMContentLoaded", loadInitial);
