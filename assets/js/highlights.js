import { fetchHighlights } from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        container: document.getElementById('highlights-container'),
        filter: document.getElementById('league-filter'),
        loading: document.getElementById('loading-indicator'),
        error: document.getElementById('error-display')
    };

    // دالة مساعدة لعرض/إخفاء العناصر
    const setDisplay = (element, show) => {
        if (element) element.style.display = show ? 'block' : 'none';
    };

    const displayHighlights = (highlights) => {
        if (!highlights || highlights.length === 0) {
            elements.container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-info-circle"></i>
                    <p>No highlights found. Try another league or check back later.</p>
                </div>
            `;
            return;
        }

        elements.container.innerHTML = highlights.map(match => `
            <div class="highlight-card">
                <div class="match-header">
                    <h3>${match.homeTeam || 'Team 1'} vs ${match.awayTeam || 'Team 2'}</h3>
                    <div class="match-details">
                        <span class="competition">${match.competition || 'Unknown'}</span>
                        <span class="date">${match.date ? new Date(match.date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>
                <div class="video-container">
                    ${match.embed ? `
                        <iframe src="${match.embed}" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen></iframe>
                    ` : '<p class="no-video">Video not available</p>'}
                </div>
            </div>
        `).join('');
    };

    const loadHighlights = async (league = '') => {
        try {
            setDisplay(elements.loading, true);
            setDisplay(elements.error, false);
            
            const data = await fetchHighlights(league);
            displayHighlights(data);
        } catch (error) {
            console.error('Loading Error:', error);
            if (elements.error) {
                elements.error.innerHTML = `
                    <div class="error-content">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error Loading Highlights</h3>
                        <p>${error.message}</p>
                        <button class="retry-btn">Try Again</button>
                    </div>
                `;
                setDisplay(elements.error, true);
                
                // إضافة معالج حدث للزر
                elements.error.querySelector('.retry-btn')?.addEventListener('click', () => {
                    loadHighlights(league);
                });
            }
        } finally {
            setDisplay(elements.loading, false);
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
