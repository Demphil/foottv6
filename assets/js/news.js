// assets/js/news.js

import { fetchNews } from './news-api.js';

// عناصر DOM
const breakingNewsContainer = document.getElementById('breaking-news');
const mainNewsContainer = document.getElementById('main-news');
const loadingIndicator = document.createElement('div');
loadingIndicator.className = 'loader';
loadingIndicator.style.margin = '2rem auto';

// عرض حالة التحميل
const showLoading = () => {
    breakingNewsContainer.innerHTML = '';
    mainNewsContainer.innerHTML = '';
    mainNewsContainer.appendChild(loadingIndicator);
};

// عرض خطأ
const showError = (message) => {
    mainNewsContainer.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
            <button onclick="window.location.reload()">إعادة المحاولة</button>
        </div>
    `;
};

// إنشاء بطاقة خبر
const createNewsCard = (article, isBreaking = false) => {
    return `
        <div class="${isBreaking ? 'breaking-news-card' : 'news-card'}" onclick="window.open('${article.url}', '_blank')">
            <img src="${article.image}" alt="${article.title}" 
                 onerror="this.src='assets/images/default-news.jpg'">
            <div class="news-content">
                ${isBreaking ? `<span class="breaking-tag">عاجل</span>` : ''}
                <h3>${article.title}</h3>
                <p>${article.excerpt}</p>
                <div class="news-meta">
                    <span><i class="far fa-calendar-alt"></i> ${article.date}</span>
                    <span><i class="far fa-newspaper"></i> ${article.source}</span>
                </div>
            </div>
        </div>
    `;
};

// تصنيف الأخبار
const categorizeNews = (articles) => {
    const breaking = articles.slice(0, 3); // أول 3 أخبار كمحتوى عاجل
    const main = articles.slice(3); // البقية كمحتوى رئيسي
    return { breaking, main };
};

// عرض الأخبار
const renderNews = (articles) => {
    const { breaking, main } = categorizeNews(articles);
    
    breakingNewsContainer.innerHTML = breaking.map(article => 
        createNewsCard(article, true)).join('');
    
    mainNewsContainer.innerHTML = main.map(article => 
        createNewsCard(article)).join('');
};

// تهيئة الصفحة
const initPage = async () => {
    showLoading();
    
    try {
        const articles = await fetchNews();
        renderNews(articles);
    } catch (error) {
        showError(error.message);
    }
};

// بدء التحميل
document.addEventListener('DOMContentLoaded', initPage);
