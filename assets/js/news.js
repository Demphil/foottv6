// assets/js/news.js

import { fetchFootballNews, fetchBreakingNews } from './news-api.js';

// عناصر DOM
const elements = {
    breakingNews: document.getElementById('breaking-news'),
    mainNews: document.getElementById('main-news'),
    loading: document.getElementById('loading-indicator'),
    error: document.getElementById('error-container'),
    search: document.getElementById('news-search'),
    loadMore: document.getElementById('load-more')
};

// متغيرات حالة
let currentPage = 1;
const newsPerPage = 6;
let allNews = [];

// ========== دوال العرض ========== //

const createNewsCard = (article) => {
    return `
        <div class="news-card" data-id="${article.id}">
            <img src="${article.image}" alt="${article.title}" 
                 onerror="this.src='assets/images/default-news.jpg'">
            <div class="news-content">
                <span class="news-category">${article.category}</span>
                <h3>${article.title}</h3>
                <p>${article.excerpt}</p>
                <div class="news-meta">
                    <span><i class="far fa-calendar-alt"></i> ${article.date}</span>
                    <span><i class="fas fa-source"></i> ${article.source}</span>
                </div>
                <a href="${article.url}" target="_blank" class="read-more">قراءة المزيد</a>
            </div>
        </div>
    `;
};

const createBreakingNewsCard = (article) => {
    return `
        <div class="breaking-news-card" data-id="${article.id}">
            <div class="breaking-image">
                <img src="${article.image}" alt="${article.title}"
                     onerror="this.src='assets/images/default-news.jpg'">
            </div>
            <div class="breaking-content">
                <span class="breaking-tag">عاجل</span>
                <h3>${article.title}</h3>
                <p>${article.excerpt}</p>
                <div class="breaking-meta">
                    <span><i class="far fa-clock"></i> ${article.date}</span>
                    <a href="${article.url}" target="_blank" class="read-now">قراءة الآن</a>
                </div>
            </div>
        </div>
    `;
};

// ========== دوال جلب البيانات ========== //

const loadNewsData = async () => {
    try {
        elements.loading.style.display = 'block';
        elements.error.style.display = 'none';
        
        allNews = await fetchFootballNews();
        return true;
    } catch (error) {
        console.error('Error loading news:', error);
        showError('تعذر تحميل الأخبار. يرجى التحقق من اتصال الإنترنت والمحاولة لاحقاً.');
        return false;
    } finally {
        elements.loading.style.display = 'none';
    }
};

const renderNews = () => {
    const startIdx = (currentPage - 1) * newsPerPage;
    const paginatedNews = allNews.slice(startIdx, startIdx + newsPerPage);
    
    if (paginatedNews.length > 0) {
        elements.mainNews.innerHTML += paginatedNews.map(createNewsCard).join('');
        elements.loadMore.style.display = 
            allNews.length > (currentPage * newsPerPage) ? 'block' : 'none';
    } else if (currentPage === 1) {
        elements.mainNews.innerHTML = '<p class="no-news">لا توجد أخبار متاحة حالياً</p>';
    }
};

const renderBreakingNews = async () => {
    try {
        const breakingNews = await fetchBreakingNews();
        elements.breakingNews.innerHTML = breakingNews.length > 0
            ? breakingNews.map(createBreakingNewsCard).join('')
            : '<p class="no-news">لا توجد أخبار عاجلة حالياً</p>';
    } catch (error) {
        console.error('Error loading breaking news:', error);
        elements.breakingNews.innerHTML = `
            <p class="error-msg">تعذر تحميل الأخبار العاجلة</p>
        `;
    }
};

// ========== إدارة الأحداث ========== //

const setupEventListeners = () => {
    elements.loadMore?.addEventListener('click', () => {
        currentPage++;
        renderNews();
    });

    elements.search?.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        if (term.length > 2) {
            const filtered = allNews.filter(news => 
                news.title.toLowerCase().includes(term) || 
                news.excerpt.toLowerCase().includes(term)
            );
            elements.mainNews.innerHTML = filtered.length > 0
                ? filtered.map(createNewsCard).join('')
                : '<p class="no-results">لا توجد نتائج مطابقة للبحث</p>';
        } else if (term.length === 0) {
            currentPage = 1;
            elements.mainNews.innerHTML = '';
            renderNews();
        }
    });
};

// ========== تهيئة الصفحة ========== //

const initPage = async () => {
    await renderBreakingNews();
    
    if (await loadNewsData()) {
        renderNews();
        setupEventListeners();
    }
};

// بدء التحميل بعد اكتمال DOM
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initPage, 500);
});
