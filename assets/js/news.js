const apiKey = '320e688cfb9682d071750f4212f83753';
const baseUrl = 'https://gnews.io/api/v4';
const language = 'ar';
const country = 'eg';
const maxResults = 10;

let currentPage = 1;
let currentCategory = 'كرة القدم';

const sportsNewsContainer = document.getElementById('sports-news');
const breakingNewsContainer = document.getElementById('breaking-news');
const loadingIndicator = document.getElementById('loading');
const errorContainer = document.getElementById('error-container');
const loadMoreBtn = document.getElementById('load-more');
const searchInput = document.getElementById('news-search');

// الكلمات المفتاحية للأخبار العاجلة
const keywords = [
  "كرة القدم", "رياضة", "المنتخب المغربي", "الوداد", "الرجاء",
  "الدوري السعودي", "الدوري المصري", "الدوري الإسباني", "Cristiano Ronaldo", "Messi", "Champions League"
];

// عرض التحميل
function showLoading() {
  loadingIndicator.style.display = 'block';
}
function hideLoading() {
  loadingIndicator.style.display = 'none';
}

// عرض رسالة خطأ
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

// عرض الأخبار
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

// جلب الأخبار العاجلة
async function fetchBreakingNews() {
  try {
    const response = await fetch(`${baseUrl}/search?q=${keywords.join(" OR ")}&lang=ar&country=ma&max=10&apikey=${apiKey}`);
    const data = await response.json();
    displayBreakingNews(data.articles);
  } catch (error) {
    breakingNewsContainer.innerHTML = `<p style="color: red;">فشل تحميل الأخبار العاجلة.</p>`;
    console.error("حدث خطأ:", error);
  }
}

// عرض الأخبار العاجلة
function displayBreakingNews(articles) {
  breakingNewsContainer.innerHTML = '';
  articles.forEach(article => {
    const item = document.createElement('div');
    item.className = 'breaking-news-item';
    item.innerHTML = `
      <img src="${article.image || 'assets/images/placeholder.jpg'}" alt="${article.title}">
      <div class="content">
        <h3>${article.title}</h3>
        <p>${article.description || ''}</p>
      </div>
    `;
    breakingNewsContainer.appendChild(item);
  });
}

// تحميل أولي
async function loadInitialNews() {
  const articles = await fetchNews(currentCategory, currentPage);
  displayNews(articles);
  await fetchBreakingNews();
}
loadInitialNews();

// زر "تحميل المزيد"
loadMoreBtn.addEventListener('click', async () => {
  currentPage++;
  const articles = await fetchNews(currentCategory, currentPage);
  displayNews(articles, true);
});

// البحث
document.getElementById('search-btn').addEventListener('click', async () => {
  const query = searchInput.value.trim();
  if (!query) return;
  currentPage = 1;
  currentCategory = query;
  const articles = await fetchNews(query);
  displayNews(articles);
});

// التصنيفات
document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelector('.category-btn.active')?.classList.remove('active');
    btn.classList.add('active');
    const category = btn.dataset.category;
    currentCategory = category === 'all' ? 'كرة القدم' : category;
    currentPage = 1;
    const articles = await fetchNews(currentCategory);
    displayNews(articles);
  });
});
