// news.js

import fetchNews from './news-api.js';

async function displayNews() {
  const articles = await fetchNews();

  if (articles.length === 0) {
    document.getElementById('news-container').innerHTML = 'No news available.';
    return;
  }

  const newsContainer = document.getElementById('news-container');
  newsContainer.innerHTML = '';

  articles.forEach((article) => {
    const articleElement = document.createElement('div');
    articleElement.classList.add('news-card');
    
    // إنشاء هيكل المقالات
    articleElement.innerHTML = `
      <div class="news-image">
        <img src="${article.imageUrl}" alt="${article.title}">
      </div>
      <div class="news-content">
        <h3 class="news-title">${article.title}</h3>
        <p class="news-description">${article.description}</p>
        <a href="${article.url}" target="_blank" class="read-more">Read more</a>
      </div>
    `;

    // إضافة المقال إلى الحاوية
    newsContainer.appendChild(articleElement);
  });
}

// عند تحميل الصفحة، استدعاء دالة displayNews لعرض الأخبار
window.onload = displayNews;
