import { fetchSportsNews, fetchBreakingNews, fetchVideo } from './news-api.js';

// عناصر DOM مع التحقق من وجودها
const getElement = (id) => {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Element with ID '${id}' not found`);
  }
  return element;
};

// العناصر المطلوبة
const elements = {
  sportsNewsContainer: getElement('sports-news'),
  breakingNewsContainer: getElement('breaking-news'),
  videosContainer: getElement('news-videos'),
  loadingIndicator: getElement('loading'),
  errorContainer: getElement('error-container'),
  loadMoreBtn: getElement('load-more')
};

// حالة التطبيق
const appState = {
  currentSportsPage: 1,
  isLoading: false
};

/**
 * التحقق من العناصر الأساسية
 */
function checkRequiredElements() {
  const requiredElements = [
    'sportsNewsContainer',
    'breakingNewsContainer',
    'videosContainer',
    'loadingIndicator'
  ];

  return requiredElements.every(el => {
    if (!elements[el]) {
      console.error(`العنصر المطلوب غير موجود: ${el}`);
      return false;
    }
    return true;
  });
}

/**
 * عرض الهيكل العظمي أثناء التحميل
 */
function showSkeletonLoaders(container, count, type = 'news') {
  if (!container) return;
  
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = `skeleton-loader ${type}-skeleton`;
    container.appendChild(skeleton);
  }
}

/**
 * عرض الأخبار في واجهة المستخدم
 */
function displayNews(articles, container, append = false) {
  if (!container) return;

  if (!append) {
    container.innerHTML = '';
  }

  if (!articles || articles.length === 0) {
    if (!append) {
      container.innerHTML = `
        <div class="no-news-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>لا توجد أخبار متاحة حالياً</p>
        </div>
      `;
    }
    return;
  }

  // ترتيب المقالات حسب التاريخ (الأحدث أولاً)
  const sortedArticles = [...articles].sort((a, b) => {
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });

  sortedArticles.forEach(article => {
    const newsCard = document.createElement('div');
    newsCard.className = 'news-card';
    
    newsCard.innerHTML = `
      <div class="news-image">
        ${article.image ? `<img src="${article.image}" alt="${article.title}" loading="lazy">` : 
          `<div class="no-image"><i class="fas fa-image"></i></div>`}
      </div>
      <div class="news-content">
        <h3 class="news-title">${article.title}</h3>
        <p class="news-description">${article.description || 'لا يوجد وصف متاح'}</p>
        <div class="news-meta">
          <span class="news-source">${article.source?.name || 'مصدر غير معروف'}</span>
          <span class="news-date">${article.publishedAt || 'تاريخ غير معروف'}</span>
        </div>
        <a href="${article.url}" target="_blank" class="read-more">قراءة المزيد</a>
      </div>
    `;
    
    container.appendChild(newsCard);
  });
}

/**
 * عرض الفيديوهات في واجهة المستخدم
 */
function displayVideos(videos, container) {
  if (!container) return;

  container.innerHTML = '';

  if (!videos || videos.length === 0) {
    container.innerHTML = `
      <div class="no-videos-message">
        <i class="fas fa-video-slash"></i>
        <p>لا توجد فيديوهات متاحة حالياً</p>
      </div>
    `;
    return;
  }

  videos.forEach(video => {
    const videoCard = document.createElement('div');
    videoCard.className = 'video-card';
    
    videoCard.innerHTML = `
      <div class="video-thumbnail">
        ${video.thumbnail ? `<img src="${video.thumbnail}" alt="${video.title}">` : 
          `<div class="no-image"><i class="fas fa-video"></i></div>`}
        <div class="play-icon">
          <i class="fas fa-play"></i>
        </div>
        ${video.duration ? `<span class="video-duration">${video.duration}</span>` : ''}
      </div>
      <div class="video-info">
        <h3 class="video-title">${video.title}</h3>
        <div class="video-meta">
          <span>${video.views || 0} مشاهدة</span>
          <span>${video.publishedAt || 'تاريخ غير معروف'}</span>
        </div>
      </div>
    `;
    
    container.appendChild(videoCard);
  });
}

/**
 * عرض رسالة خطأ
 */
function showError(message) {
  if (!elements.errorContainer) return;
  
  elements.errorContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${message}</p>
      <button class="retry-btn" id="retry-btn">
        <i class="fas fa-sync-alt"></i> إعادة المحاولة
      </button>
    </div>
  `;

  document.getElementById('retry-btn')?.addEventListener('click', loadInitialData);
}

/**
 * جلب المزيد من الأخبار
 */
async function loadMoreNews() {
  if (appState.isLoading) return;
  
  appState.isLoading = true;
  appState.currentSportsPage++;
  
  try {
    if (elements.loadMoreBtn) {
      elements.loadMoreBtn.disabled = true;
      elements.loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
    }
    
    const moreNews = await fetchSportsNews('sa', 6);
    displayNews(moreNews, elements.sportsNewsContainer, true);
    
  } catch (error) {
    console.error('حدث خطأ أثناء جلب المزيد من الأخبار:', error);
    showError('تعذر تحميل المزيد من الأخبار');
    appState.currentSportsPage--;
    
  } finally {
    appState.isLoading = false;
    if (elements.loadMoreBtn) {
      elements.loadMoreBtn.disabled = false;
      elements.loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> تحميل المزيد';
    }
  }
}

/**
 * جلب وعرض البيانات الأولية
 */
async function loadInitialData() {
  try {
    if (elements.loadingIndicator) {
      elements.loadingIndicator.style.display = 'flex';
    }
    
    if (elements.errorContainer) {
      elements.errorContainer.innerHTML = '';
    }

    // عرض الهياكل العظمية أثناء التحميل
    showSkeletonLoaders(elements.sportsNewsContainer, 3, 'news');
    showSkeletonLoaders(elements.breakingNewsContainer, 3, 'news');
    showSkeletonLoaders(elements.videosContainer, 3, 'video');

    // جلب وعرض البيانات
    const [sportsNews, breakingNews, videos] = await Promise.all([
      fetchSportsNews('sa', 6),
      fetchBreakingNews('sa', 3),
      fetchVideo('sa', 3)
    ]);
    
    displayNews(sportsNews, elements.sportsNewsContainer);
    displayNews(breakingNews, elements.breakingNewsContainer);
    displayVideos(videos, elements.videosContainer);
    
  } catch (error) {
    console.error('حدث خطأ أثناء جلب البيانات:', error);
    showError('تعذر تحميل المحتوى. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
    
  } finally {
    if (elements.loadingIndicator) {
      elements.loadingIndicator.style.display = 'none';
    }
  }
}

/**
 * تهيئة التطبيق
 */
function initApp() {
  // التحقق من وجود العناصر الأساسية
  if (!checkRequiredElements()) {
    showError('حدث خطأ في تحميل واجهة المستخدم');
    return;
  }

  // جلب البيانات الأولية
  loadInitialData();

  // إضافة مستمع حدث لزر تحميل المزيد
  if (elements.loadMoreBtn) {
    elements.loadMoreBtn.addEventListener('click', loadMoreNews);
  }
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);
