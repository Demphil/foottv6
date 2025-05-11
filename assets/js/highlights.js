// highlights.js
import { fetchHighlights } from './highlights-api.js';

// إنشاء العناصر الديناميكية المطلوبة
function createRequiredElements() {
    const container = document.querySelector('.container');
    
    // إنشاء مؤشر التحميل
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.className = 'loading-state';
    loadingIndicator.innerHTML = `
        <div class="spinner"></div>
        <p>جاري تحميل الملخصات...</p>
    `;
    
    // إنشاء عرض الأخطاء
    const errorDisplay = document.createElement('div');
    errorDisplay.id = 'error-display';
    errorDisplay.className = 'error-state';
    
    // إنشاء فلتر الدوريات
    const filterDiv = document.createElement('div');
    filterDiv.className = 'filter-section';
    filterDiv.innerHTML = `
        <select id="league-filter" class="league-filter">
            <option value="">كل الدوريات</option>
            <option value="Champions League">دوري الأبطال</option>
            <option value="Premier League">الدوري الإنجليزي</option>
            <option value="La Liga">الدوري الإسباني</option>
        </select>
    `;
    
    // إضافة العناصر إلى الصفحة
    container.insertBefore(filterDiv, container.firstChild.nextSibling);
    container.appendChild(loadingIndicator);
    container.appendChild(errorDisplay);
}

document.addEventListener('DOMContentLoaded', async () => {
    // إنشاء العناصر المطلوبة
    createRequiredElements();
    
    const elements = {
        container: document.getElementById('highlights-container'),
        filter: document.getElementById('league-filter'),
        loading: document.getElementById('loading-indicator'),
        error: document.getElementById('error-display')
    };

    const formatDate = (dateString) => {
        const options = {
            timeZone: 'Africa/Casablanca',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleString('ar-MA', options);
    };

    const displayHighlights = (highlights) => {
        if (!highlights || !highlights.length) {
            elements.container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-info-circle"></i>
                    <p>لا توجد ملخصات متاحة حالياً</p>
                </div>
            `;
            return;
        }

        elements.container.innerHTML = highlights.map(match => `
            <div class="highlight-card">
                <div class="match-header">
                    <h3>${match.homeTeam || 'فريق 1'} vs ${match.awayTeam || 'فريق 2'}</h3>
                    <div class="match-meta">
                        <span>${match.competition || 'دوري غير معروف'}</span>
                        <span>${formatDate(match.date)}</span>
                    </div>
                </div>
                <div class="video-container">
                    <iframe src="${match.embed}" 
                            frameborder="0" 
                            allowfullscreen
                            loading="lazy"></iframe>
                </div>
            </div>
        `).join('');
    };

    const loadHighlights = async (league = '') => {
        try {
            elements.loading.style.display = 'block';
            elements.error.style.display = 'none';
            
            const highlights = await fetchHighlights(league);
            displayHighlights(highlights);
            
        } catch (error) {
            console.error('Error:', error);
            elements.error.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>حدث خطأ في جلب البيانات</p>
                    <small>${error.message}</small>
                </div>
            `;
            elements.error.style.display = 'block';
        } finally {
            elements.loading.style.display = 'none';
        }
    };

    // معالجة تغيير الفلتر
    elements.filter.addEventListener('change', (e) => {
        loadHighlights(e.target.value);
    });

    // التحميل الأولي
    await loadHighlights();
});
