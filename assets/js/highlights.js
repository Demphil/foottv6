import { fetchHighlights } from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // عناصر DOM
    const container = document.getElementById('highlights-container');
    const leagueFilter = document.getElementById('league-filter');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorDisplay = document.getElementById('error-display');

    // دالة العرض
    const displayHighlights = (highlights) => {
        if (!container) return;

        if (!highlights || highlights.length === 0) {
            container.innerHTML = `
                <div class="no-highlights">
                    <i class="fas fa-info-circle"></i>
                    <p>لا توجد ملخصات متاحة حالياً</p>
                </div>
            `;
            return;
        }

        container.innerHTML = highlights.map(match => `
            <div class="highlight-card">
                <div class="match-header">
                    <h3>${match.homeTeam} vs ${match.awayTeam}</h3>
                    <div class="match-meta">
                        <span>${match.competition}</span>
                        <span>${new Date(match.date).toLocaleDateString('ar-EG')}</span>
                    </div>
                </div>
                <div class="video-container">
                    <iframe src="${match.embed}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen></iframe>
                </div>
            </div>
        `).join('');
    };

    // دالة التحميل
    const loadHighlights = async (league = '') => {
        try {
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (errorDisplay) errorDisplay.style.display = 'none';
            
            const highlights = await fetchHighlights(league);
            displayHighlights(highlights);
            
        } catch (error) {
            console.error('Error:', error);
            if (errorDisplay) {
                errorDisplay.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>حدث خطأ في جلب البيانات</p>
                        <small>${error.message}</small>
                        <button onclick="window.location.reload()">إعادة المحاولة</button>
                    </div>
                `;
                errorDisplay.style.display = 'block';
            }
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    };

    // أحداث الفلتر
    if (leagueFilter) {
        leagueFilter.addEventListener('change', (e) => {
            loadHighlights(e.target.value);
        });
    }

    // التحميل الأولي
    await loadHighlights();
});
