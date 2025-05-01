const API_KEY = '320e688cfb9682d071750f4212f83753'; // ← أدخل مفتاح GNews الخاص بك هنا
const BASE_URL = 'https://gnews.io/api/v4/search';
const breakingNewsContainer = document.getElementById('breaking-news');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const loading = document.getElementById('loading');
const errorContainer = document.getElementById('error-container');
const CACHE_KEY = 'cachedBreakingNews';
const CACHE_TIME_KEY = 'breakingNewsCacheTime';
const CACHE_DURATION_HOURS = 6;

const KEYWORDS = [
  'المنتخب المغربي',
  'ريال مدريد',
  'الرجاء',
  'دوري أبطال أفريقيا',
  'كرة القدم',
  'دوري ابطال اوروبا'
];

function isCacheValid() {
  const lastTime = localStorage.getItem(CACHE_TIME_KEY);
  if (!lastTime) return false;

  const diff = (Date.now() - parseInt(lastTime, 10)) / (1000 * 60 * 60); // فرق بالساعات
  return diff < CACHE_DURATION_HOURS;
}

function saveCache(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
}

function loadFromCache() {
  const data = localStorage.getItem(CACHE_KEY);
  if (data) {
    try {
      const articles = JSON.parse(data);
      displayBreakingNews(articles);
    } catch {
      localStorage.removeItem(CACHE_KEY);
    }
  }
}

async function fetchBreakingNews(query) {
  loading.style.display = 'block';
  errorContainer.textContent = '';
  try {
    const url = `${BASE_URL}?q=${encodeURIComponent(query)}&lang=ar&max=10&apikey=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    saveCache(data.articles);
    displayBreakingNews(data.articles);
  } catch (err) {
    errorContainer.textContent = 'حدث خطأ أثناء تحميل الأخبار.';
    console.error(err);
  } finally {
    loading.style.display = 'none';
  }
}

function displayBreakingNews(articles) {
  breakingNewsContainer.innerHTML = '';
  if (!articles || articles.length === 0) {
    breakingNewsContainer.innerHTML = '<p>لا توجد أخبار حالياً.</p>';
    return;
  }

  articles.forEach(article => {
    const item = document.createElement('div');
    item.className = 'glass-card';

    item.innerHTML = `
      <img src="${article.image || 'https://via.placeholder.com/600x300'}" alt="صورة الخبر">
      <h3>${article.title}</h3>
      <p>${article.description || ''}</p>
      <a href="${article.url}" target="_blank">قراءة المزيد</a>
    `;

    breakingNewsContainer.appendChild(item);
  });
}

function loadInitial() {
  const query = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];

  if (isCacheValid()) {
    loadFromCache();
  } else {
    fetchBreakingNews(query);
  }
}

searchButton.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (query) {
    fetchBreakingNews(query);
  }
});

window.addEventListener('DOMContentLoaded', loadInitial);
