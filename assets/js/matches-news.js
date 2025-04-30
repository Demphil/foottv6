import { fetchBreakingNews } from './news-api.js';

// عناصر DOM مع التحقق من وجودها
const importantNewsContainer = document.getElementById('important-news');

if (!importantNewsContainer) {
    console.error('العنصر "important-news" غير موجود في الصفحة');
}

// عدد الأخبار المطلوبة
const IMPORTANT_NEWS_COUNT = 4;

/**
 * عرض الأخبار المهمة
 */
async function loadImportantNews() {
    try {
        // عرض الهيكل العظمي أثناء التحميل
        importantNewsContainer.innerHTML = Array(IMPORTANT_NEWS_COUNT).fill('<div class="skeleton-loader news-skeleton"></div>').join('');
        
        // جلب الأخبار العاجلة (يمكن تغييرها لأي نوع آخر)
        const news = await fetchBreakingNews('sa', IMPORTANT_NEWS_COUNT);
        
        // عرض الأخبار
        displayImportantNews(news);
    } catch (error) {
        console.error('فشل تحميل الأخبار المهمة:', error);
        importantNewsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>تعذر تحميل الأخبار المهمة</p>
            </div>
        `;
    }
}

/**
 * عرض الأخبار في الواجهة
 */
function displayImportantNews(articles) {
    if (!articles || articles.length === 0) {
        importantNewsContainer.innerHTML = `
            <div class="no-news-message">
                <i class="fas fa-newspaper"></i>
                <p>لا توجد أخبار مهمة حالياً</p>
            </div>
        `;
        return;
    }

    importantNewsContainer.innerHTML = articles.map(article => `
        <div class="important-news-card">
            <div class="news-image">
                ${article.image ? 
                    `<img src="${article.image}" alt="${article.title}" loading="lazy">` : 
                    `<div class="no-image"><i class="fas fa-image"></i></div>`
                }
            </div>
            <div class="news-content">
                <h3 class="news-title">${article.title}</h3>
                <div class="news-meta">
                    <span class="news-date" dir="ltr">${article.publishedAt}</span>
                </div>
                <a href="${article.url}" target="_blank" class="read-more">قراءة الخبر</a>
            </div>
        </div>
    `).join('');
}

// بدء التحميل عند جاهزية الصفحة
document.addEventListener('DOMContentLoaded', loadImportantNews);
