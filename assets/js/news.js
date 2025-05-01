// إعداد متغيرات عامة
const API_KEY = '320e688cfb9682d071750f4212f83753';
const BASE_URL = 'https://gnews.io/api/v4/search';
const breakingNewsContainer = document.getElementById('breaking-news').querySelector('.news-container');
const transfersContainer = document.getElementById('transfers').querySelector('.news-container');
const generalFootballNewsContainer = document.getElementById('general-football-news').querySelector('.news-container');
const loading = document.getElementById('loading');
const errorContainer = document.getElementById('error-container');

const KEYWORDS = {
  breakingNews: 'أخبار عاجلة',
  transfers: 'أخبار الانتقالات',
  generalFootballNews: 'كرة القدم العالمية'
};

// دالة لجلب الأخبار من API
async function fetchNews(query, container) {
  loading.style.display = 'block';
  errorContainer.textContent = '';
  try {
    const url = `${BASE_URL}?q=${encodeURIComponent(query)}&lang=ar&max=10&apikey=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    displayNews(data.articles, container);
  } catch (err) {
    errorContainer.textContent = 'حدث خطأ أثناء تحميل الأخبار.';
    console.error(err);
  } finally {
    loading.style.display = 'none';
  }
}

// دالة لعرض الأخبار في الصفحة
function displayNews(articles, container) {
  container.innerHTML = '';
  if (!articles || articles.length === 0) {
    container.innerHTML = '<p>لا توجد أخبار حالياً.</p>';
    return;
  }

  articles.forEach(article => {
    const item = document.createElement('div');
    item.className = 'news-item';
    item.innerHTML = `
      <img src="${article.image || 'https://via.placeholder.com/600x300'}" alt="صورة الخبر">
      <h3>${article.title}</h3>
      <p>${article.description || ''}</p>
      <a href="${article.url}" target="_blank">قراءة المزيد</a>
    `;
    container.appendChild(item);
  });
}

// تحميل الأخبار عند فتح الصفحة
window.addEventListener('DOMContentLoaded', () => {
  fetchNews(KEYWORDS.breakingNews, breakingNewsContainer);
  fetchNews(KEYWORDS.transfers, transfersContainer);
  fetchNews(KEYWORDS.generalFootballNews, generalFootballNewsContainer);
});
