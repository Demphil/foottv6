// assets/js/news.js

import { fetchFootballNews, fetchBreakingNews } from './news-api.js';

// عناصر DOM
const getDOMElement = (id) => {
    const element = document.getElementById(id);
    if (!element) console.error(`Element with ID '${id}' not found`);
    return element;
};

const breakingNewsContainer = getDOMElement('breaking-news');
const mainNewsContainer = getDOMElement('main-news');
const loadingIndicator = getDOMElement('loading-indicator');
const errorContainer = getDOMElement('error-container');
const searchInput = getDOMElement('news-search');
const loadMoreBtn = getDOMElement('load-more');

// متغيرات حالة
let currentPage = 1;
const newsPerPage = 6;

// ========== دوال العرض ========== //

const createNewsCard = (article) => {
    return `
        <div class="news-card" onclick="window.open('${article.url}', '_blank')">
            <img src="${article.image}" alt="${article.title}" 
                 onerror="this.src='assets/images/default-news.jpg'">
            <div class="news-content">
                <span class="news-category">${article.category || 'عام'}</span>
                <h3>${article.title}</h3>
                <p>${article.excerpt}</p>
                <div class="news-meta">
                    <span><i class="far fa-calendar-alt"></i> ${article.date}</span>
                    <span><i class="far fa-eye"></i> ${article.views || '0'}</span>
                </div>
            </div>
        </div>
    `;
};

const createBreakingNewsCard = (article) => {
    return `
        <div class="breaking-news-card" onclick="window.open('${article.url}', '_blank')">
            <img src="${article.image}" alt="${article.title}"
                 onerror="this.src='assets/images/default-news.jpg'">
            <div class="breaking-content">
                <span class="breaking-tag">عاجل</span>
                <h3>${article.title}</h3>
                <div class="breaking-meta">
                    <span><i class="fas fa-clock"></i> ${article.time || 'الآن'}</span>
                    <span><i class="fas fa-tag"></i> ${article.category || 'فوري'}</span>
                </div>
            </div>
        </div>
    `;
};

// ========== دوال جلب البيانات ========== //

const renderBreakingNews = async () => {
    try {
        const breakingNews = await fetchBreakingNews();
        if (breakingNews.length > 0) {
            breakingNewsContainer.innerHTML = breakingNews.map(createBreakingNewsCard).join('');
        } else {
            breakingNewsContainer.innerHTML = '<p class="no-news">لا توجد أخبار عاجلة حالياً</p>';
        }
    } catch (error) {
        console.error('Error loading breaking news:', error);
        breakingNewsContainer.innerHTML = '<p class="error-msg">فشل تحميل الأخبار العاجلة</p>';
    }
};

const renderMainNews = async (page = 1) => {
    try {
        const allNews = await fetchFootballNews();
        const startIdx = (page - 1) * newsPerPage;
        const paginatedNews = allNews.slice(startIdx, startIdx + newsPerPage);
        
        if (paginatedNews.length > 0) {
            mainNewsContainer.innerHTML += paginatedNews.map(createNewsCard).join('');
            loadMoreBtn.style.display = allNews.length > (page * newsPerPage) ? 'block' : 'none';
        } else if (page === 1) {
            mainNewsContainer.innerHTML = '<p class="no-news">لا توجد أخبار متاحة حالياً</p>';
            loadMoreBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading news:', error);
        showError('فشل تحميل الأخبار. يرجى المحاولة لاحقاً');
    }
};

// ========== دوال المساعدة ========== //

const showLoading = () => {
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (errorContainer) errorContainer.style.display = 'none';
};

const hideLoading = () => {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
};

const showError = (message) => {
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="retry-btn">إعادة المحاولة</button>
            </div>
        `;
        errorContainer.style.display = 'block';
        
        const retryBtn = errorContainer.querySelector('.retry-btn');
        if (retryBtn) retryBtn.addEventListener('click', initPage);
    }
};

// ========== إدارة الأحداث ========== //

const setupEventListeners = () => {
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentPage++;
            renderMainNews(currentPage);
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            if (searchTerm.length > 2) {
                filterNews(searchTerm);
            } else if (searchTerm.length === 0) {
                currentPage = 1;
                mainNewsContainer.innerHTML = '';
                renderMainNews();
            }
        });
    }
};

const filterNews = async (searchTerm) => {
    try {
        const allNews = await fetchFootballNews();
        const filtered = allNews.filter(news => 
            news.title.includes(searchTerm) || 
            news.excerpt.includes(searchTerm)
        );
        
        mainNewsContainer.innerHTML = filtered.length > 0 
            ? filtered.map(createNewsCard).join('')
            : '<p class="no-results">لا توجد نتائج مطابقة للبحث</p>';
    } catch (error) {
        console.error('Error filtering news:', error);
    }
};

// ========== تهيئة الصفحة ========== //

const initPage = async () => {
    showLoading();
    mainNewsContainer.innerHTML = '';
    currentPage = 1;
    
    try {
        await Promise.all([
            renderBreakingNews(),
            renderMainNews()
        ]);
        setupEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('حدث خطأ في تحميل الصفحة');
    } finally {
        hideLoading();
    }
};

// بدء التحميل بعد اكتمال DOM
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initPage, 100);
});
