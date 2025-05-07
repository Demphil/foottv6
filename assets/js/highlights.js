import { fetchHighlights, getMockHighlights } from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        container: document.getElementById('highlights-container'),
        filter: document.getElementById('league-filter'),
        loading: document.getElementById('loading-indicator'),
        error: document.getElementById('error-display')
    };

    const showLoading = (show) => {
        if (elements.loading) elements.loading.style.display = show ? 'block' : 'none';
    };

    const showError = (message) => {
        if (elements.error) {
            elements.error.innerHTML = `
                <div class="error-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>حدث خطأ</h3>
                    <p>${message}</p>
                    <button class="retry-btn">إعادة المحاولة</button>
                </div>
            `;
            elements.error.style.display = 'block';
            
            elements.error.querySelector('.retry-btn').addEventListener('click', () => {
                loadHighlights(elements.filter?.value || '');
            });
        }
    };

    const displayHighlights = (highlights) => {
        if (!elements.container) return;

        if (!highlights || highlights.length === 0) {
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
                    <h3>${match.homeTeam} vs ${match.awayTeam}</h3>
                    <div class="match-meta">
                        <span class="league">${match.competition}</span>
                        <span class="date">${new Date(match.date).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="video-container">
                    <iframe src="${match.embed}" 
                            frameborder="0" 
                            allowfullscreen></iframe>
                </div>
                ${match.title ? `<div class="match-title">${match.title}</div>` : ''}
            </div>
        `).join('');
    };

    const loadHighlights = async (league = '') => {
        showLoading(true);
        if (elements.error) elements.error.style.display = 'none';

        try {
            // محاولة جلب البيانات الحقيقية أولاً
            const highlights = await fetchHighlights(league);
            displayHighlights(highlights);
        } catch (error) {
            console.warn('Using mock data due to:', error.message);
            // استخدام البيانات الوهمية عند الفشل
            displayHighlights(getMockHighlights(league));
            showError('لا يمكن الاتصال بالخادم. يتم عرض بيانات تجريبية.');
        } finally {
            showLoading(false);
        }
    };

    // معالجة تغيير الفلتر
    if (elements.filter) {
        elements.filter.addEventListener('change', (e) => {
            loadHighlights(e.target.value);
        });
    }

    // التحميل الأولي
    await loadHighlights();
});
