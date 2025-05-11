// استيراد الدالة بشكل صحيح
import fetchHighlights from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        container: document.getElementById('highlights-container'),
        filter: document.getElementById('league-filter') || document.createElement('select'),
        loading: document.getElementById('loading-indicator') || document.createElement('div'),
        error: document.getElementById('error-display') || document.createElement('div')
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
                    <h3>${match.homeTeam || 'فريق 1'} vs ${match.awayTeam || 'فريق 2'}</h3>
                    <div class="match-meta">
                        <span>${match.competition || 'دوري غير معروف'}</span>
                        <span>${new Date(match.date).toLocaleString('ar-MA')}</span>
                    </div>
                </div>
                <div class="video-container">
                    <iframe src="${match.embed}" 
                            frameborder="0" 
                            allowfullscreen></iframe>
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
                    <button onclick="window.location.reload()">إعادة المحاولة</button>
                </div>
            `;
            elements.error.style.display = 'block';
        } finally {
            elements.loading.style.display = 'none';
        }
    };

    // التحميل الأولي
    await loadHighlights();
});
