// assets/js/news.js

import { fetchFootballNews, fetchBreakingNews } from './news-api.js';

// حالة التطبيق
const state = {
    currentPage: 1,
    newsPerPage: 6,
    allNews: [],
    isLoading: false
};

// عناصر DOM
const elements = {
    breakingNews: document.getElementById('breaking-news'),
    mainNews: document.getElementById('main-news'),
    loading: document.getElementById('loading-indicator'),
    error: document.getElementById('error-container'),
    search: document.getElementById('news-search'),
    loadMore: document.getElementById('load-more'),
    categoryTabs: document.querySelectorAll('.category-btn')
};

// ========== دوال العرض ========== //

const createNewsCard = (article) => {
    return `
        <div class="news-card" data-id="${article.id}">
            <div class="news-image">
                <img src="${article.image}" alt="${article.title}" 
                     onerror="this.src='assets/images/default-news.jpg'">
                <span class="news-category">رياضة</span>
            </div>
            <div class="news-content">
                <h3 class="news-title">${article.title}</h3>
                <p class="news-excerpt">${article.excerpt}</p>
                <div class="news-meta">
                    <span><i class="fas fa-calendar-alt"></i> ${article.date}</span>
                    <span><i class="fas fa-user"></i> ${article.author}</span>
                </div>
                <a href="${article.url}" target="_blank" class="read-more">
                    اقرأ المزيد <i class="fas fa-arrow-left"></i>
                </a>
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
                <span class="breaking-tag">عاجل</span>
            </div>
            <div class="breaking-content">
                <h3 class="breaking-title">${article.title}</h3>
                <div class="breaking-meta">
                    <span><i class="fas fa-clock"></i> ${article.date}</span>
                    <span><i class="fas fa-newspaper"></i> ${article.source}</span>
                </div>
                <a href="${article.url}" target="_blank" class="read-now">
                    اقرأ الآن <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
        </div>
    `;
};

// ========== دوال جلب البيانات ========== //

const loadInitialData = async () => {
    try {
        setLoading(true);
        
        // جلب البيانات بالتوازي
        const [breakingNews, footballNews] = await Promise.all([
            fetchBreakingNews(),
            fetchFootballNews()
        ]);
        
        state.allNews = footballNews;
        renderBreakingNews(breakingNews);
        renderNews();
        
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
};

const loadMoreNews = async () => {
    try {
        setLoading(true);
        state.currentPage++;
        const newNews = await fetchFootballNews(state.currentPage);
        state.allNews = [...state.allNews, ...newNews];
        renderNews();
    } catch (error) {
        showError('فشل تحميل المزيد من الأخبار');
    } finally {
        setLoading(false);
    }
};

// ========== دوال العرض ========== //

const renderBreakingNews = (articles) => {
    if (!articles || articles.length === 0) {
        elements.breakingNews.innerHTML = `
            <div class="no-breaking-news">
                <i class="fas fa-info-circle"></i>
                <p>لا توجد أخبار عاجلة حالياً</p>
            </div>
        `;
        return;
    }
    
    elements.breakingNews.innerHTML = articles.map(createBreakingNewsCard).join('');
};

const renderNews = () => {
    const { currentPage, newsPerPage, allNews } = state;
    const startIdx = 0; // عرض كل الأخبار مع التحميل التدريجي
    const endIdx = currentPage * newsPerPage;
    const newsToShow = allNews.slice(startIdx, endIdx);
    
    if (newsToShow.length === 0 && currentPage === 1) {
        elements.mainNews.innerHTML = `
            <div class="no-news">
                <i class="far fa-newspaper"></i>
                <p>لا توجد أخبار متاحة حالياً</p>
            </div>
        `;
    } else {
        elements.mainNews.innerHTML = newsToShow.map(createNewsCard).join('');
    }
    
    // إظهار زر "تحميل المزيد" فقط إذا كان هناك المزيد من الأخبار
    elements.loadMore.style.display = 
        allNews.length > endIdx ? 'block' : 'none';
};

// ========== دوال المساعدة ========== //

const setLoading = (isLoading) => {
    state.isLoading = isLoading;
    elements.loading.style.display = isLoading ? 'block' : 'none';
    elements.loadMore.disabled = isLoading;
};

const showError = (message) => {
    elements.error.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
            <button id="retry-btn" class="retry-btn">
                <i class="fas fa-sync-alt"></i> إعادة المحاولة
            </button>
        </div>
    `;
    elements.error.style.display = 'block';
    
    document.getElementById('retry-btn')?.addEventListener('click', loadInitialData);
};

const filterNewsBySearch = (searchTerm) => {
    const filtered = state.allNews.filter(news => 
        news.title.toLowerCase().includes(searchTerm) || 
        news.excerpt.toLowerCase().includes(searchTerm)
    );
    
    elements.mainNews.innerHTML = filtered.length > 0
        ? filtered.map(createNewsCard).join('')
        : `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>لا توجد نتائج مطابقة للبحث</p>
            </div>
        `;
};

// ========== إعداد مستمعي الأحداث ========== //

const setupEventListeners = () => {
    // زر تحميل المزيد
    elements.loadMore?.addEventListener('click', loadMoreNews);
    
    // حقل البحث
    elements.search?.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        if (term.length > 2) {
            filterNewsBySearch(term);
        } else if (term.length === 0) {
            state.currentPage = 1;
            renderNews();
        }
    });
    
    // تبويبات التصنيفات
    elements.categoryTabs?.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // يمكنك إضافة فلترة حسب التصنيف هنا
        });
    });
};

// ========== تهيئة التطبيق ========== //

const initApp = () => {
    setupEventListeners();
    loadInitialData();
};

// بدء التطبيق بعد اكتمال تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);
