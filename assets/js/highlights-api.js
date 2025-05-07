import { fetchHighlights } from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        container: document.getElementById('highlights-container'),
        filter: document.getElementById('league-filter'),
        loading: document.getElementById('loading-indicator'),
        error: document.getElementById('error-display')
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
                <h3>${match.homeTeam} vs ${match.awayTeam}</h3>
                <p class="match-meta">
                    <span>${match.competition}</span>
                    <span>${new Date(match.date).toLocaleDateString()}</span>
                </p>
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
            const data = await fetchHighlights(league);
            displayHighlights(data);
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

    // معالجة أحداث الفلتر
    elements.filter?.addEventListener('change', (e) => {
        loadHighlights(e.target.value);
    });

    // التحميل الأولي
    await loadHighlights();
});
