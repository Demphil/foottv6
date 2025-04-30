// ===== news.js =====
const API_KEY = "320e688cfb9682d071750f4212f83753"; // استبدل بمفتاح GNews الخاص بك
const BASE_URL = "https://gnews.io/api/v4/top-headlines?sports=general&apikey=320e688cfb9682d071750f4212f83753";

const breakingKeywords = ["عاجل", "انفجار", "زلزال", "حادث", "وفاة", "أزمة"];
const moroccanAfricanKeywords = ["المغرب", "الرجاء", "الوداد", "المنتخب المغربي", "الجيش الملكي", "دوري أبطال أفريقيا"];
const globalKeywords = ["ريال مدريد", "برشلونة", "مانشستر سيتي", "بايرن ميونخ", "ليفربول", "دوري أبطال أوروبا"];

let page = 1;
const pageSize = 10;

function buildQuery(keywords) {
  return `${BASE_URL}?q=${keywords.join(" OR ")}&lang=ar&max=${pageSize}&page=${page}&apikey=${API_KEY}`;
}

function createCard(article) {
  return `
    <div class="news-card">
      <img src="${article.image || 'assets/images/placeholder.jpg'}" alt="news image">
      <div class="news-content">
        <h3><a href="${article.url}" target="_blank">${article.title}</a></h3>
        <p>${article.description || ''}</p>
        <span class="date">${new Date(article.publishedAt).toLocaleDateString('ar-MA')}</span>
      </div>
    </div>
  `;
}

function displayNews(containerId, articles) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML += articles.map(createCard).join("");
}

async function fetchNews(keywords, containerId) {
  const url = buildQuery(keywords);
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.articles) {
      displayNews(containerId, data.articles);
    } else {
      showError("حدث خطأ في تحميل الأخبار.");
    }
  } catch (err) {
    showError("فشل الاتصال بالخادم.");
  }
}

function showError(message) {
  const errorContainer = document.getElementById("error-container");
  errorContainer.innerText = message;
  errorContainer.style.display = "block";
}

function loadInitialNews() {
  fetchNews(breakingKeywords, "breaking-news");
  fetchNews([...globalKeywords, ...moroccanAfricanKeywords], "sports-news");
}

document.getElementById("load-more").addEventListener("click", () => {
  page++;
  fetchNews([...globalKeywords, ...moroccanAfricanKeywords], "sports-news");
});

document.getElementById("search-btn").addEventListener("click", () => {
  const query = document.getElementById("news-search").value.trim();
  if (query) {
    page = 1;
    document.getElementById("sports-news").innerHTML = "";
    fetchNews([query], "sports-news");
  }
});

window.addEventListener("DOMContentLoaded", loadInitialNews);
