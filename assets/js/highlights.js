import { fetchHighlights } from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // عناصر DOM مع قيمة افتراضية إذا لم توجد
    const highlightsContainer = document.getElementById('highlights-container') || document.createElement('div');
    const leagueFilter = document.getElementById('league-filter') || document.createElement('select');
    const loadingIndicator = document.getElementById('loading-indicator') || document.createElement('div');

    // دالة مساعدة لعرض حالة التحميل
    const setLoading = (isLoading) => {
        if (loadingIndicator) {
            loadingIndicator.style.display = isLoading ? 'block' : 'none';
        }
        if (highlightsContainer && !isLoading) {
            highlightsContainer.style.display = 'grid';
        }
    };

    // دالة لعرض البطاقات
    const displayHighlights = (highlights) => {
        if (!highlights || highlights.length === 0) {
            highlightsContainer.innerHTML = `
                <div class="no-highlights">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No highlights available. Try another league or check back later.</p>
                </div>
            `;
            return;
        }

        highlightsContainer.innerHTML = highlights.map(match => `
            <div class="highlight-card">
                <div class="match-info">
                    <h3>${match.homeTeam?.name || 'N/A'} vs ${match.awayTeam?.name || 'N/A'}</h3>
                    <div class="match-meta">
                        <span class="league">${match.competition?.name || 'Unknown League'}</span>
                        <span class="date">${new Date(match.date).toLocaleDateString() || 'Unknown Date'}</span>
                    </div>
                </div>
                <div class="highlight-video">
                    ${match.videos?.length ? `
                        <iframe src="${match.videos[0].embed}" 
                                frameborder="0" 
                                allowfullscreen></iframe>
                    ` : '<p class="no-video">Video not available</p>'}
                </div>
            </div>
        `).join('');
    };

    // دالة جلب البيانات
    const loadHighlights = async (league = '') => {
        try {
            setLoading(true);
            const data = await fetchHighlights(league);
            displayHighlights(data);
        } catch (error) {
            console.error('Load Error:', error);
            highlightsContainer.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-times-circle"></i>
                    <h3>Failed to load highlights</h3>
                    <p>${error.message}</p>
                    <button onclick="window.location.reload()">Retry</button>
                </div>
            `;
        } finally {
            setLoading(false);
        }
    };

    // معالجة الأحداث
    leagueFilter.addEventListener('change', (e) => {
        loadHighlights(e.target.value);
    });

    // التحميل الأولي
    await loadHighlights();
});
