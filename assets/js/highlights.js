import { fetchHighlights } from './highlights-api.js';

// حالة Fallback للبيانات
const FALLBACK_HIGHLIGHTS = [
    {
        id: 'fallback-1',
        title: 'Sample Highlight',
        embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        date: new Date().toISOString(),
        competition: 'Premier League',
        homeTeam: 'Home Team',
        awayTeam: 'Away Team'
    }
];

document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        container: document.querySelector('#highlights-container'),
        filter: document.querySelector('#league-filter'),
        loading: document.querySelector('#loading-indicator'),
        error: document.querySelector('#error-display')
    };

    // وظائف مساعدة
    const showElement = (el) => el && (el.style.display = 'block');
    const hideElement = (el) => el && (el.style.display = 'none');

    const displayHighlights = (highlights = []) => {
        if (!elements.container) return;

        if (!highlights.length) {
            elements.container.innerHTML = `
                <div class="no-highlights">
                    <i class="fas fa-info-circle"></i>
                    <p>No highlights available at the moment.</p>
                </div>
            `;
            return;
        }

        elements.container.innerHTML = highlights.map(highlight => `
            <div class="highlight-card" data-id="${highlight.id}">
                <div class="card-header">
                    <h3>${highlight.homeTeam || 'Team 1'} vs ${highlight.awayTeam || 'Team 2'}</h3>
                    <div class="match-meta">
                        <span class="competition">${highlight.competition || 'Unknown Competition'}</span>
                        <span class="date">${new Date(highlight.date).toLocaleDateString() || 'N/A'}</span>
                    </div>
                </div>
                <div class="video-wrapper">
                    <iframe src="${highlight.embed || ''}"
                            title="${highlight.title || 'Football Highlight'}"
                            frameborder="0"
                            allowfullscreen></iframe>
                </div>
                ${highlight.title ? `<div class="card-footer">${highlight.title}</div>` : ''}
            </div>
        `).join('');
    };

    const loadHighlights = async (league = '') => {
        showElement(elements.loading);
        hideElement(elements.error);

        try {
            let highlights = await fetchHighlights(league);
            
            // إذا كانت البيانات فارغة، استخدم Fallback
            if (!highlights || !highlights.length) {
                console.warn('Using fallback data');
                highlights = FALLBACK_HIGHLIGHTS;
            }
            
            displayHighlights(highlights);
        } catch (error) {
            console.error('Loading failed, using fallback:', error);
            displayHighlights(FALLBACK_HIGHLIGHTS);
            
            if (elements.error) {
                elements.error.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Connection Issue</h4>
                        <p>${error.message}</p>
                        <small>Showing sample data</small>
                    </div>
                `;
                showElement(elements.error);
            }
        } finally {
            hideElement(elements.loading);
        }
    };

    // معالجة أحداث الفلتر
    if (elements.filter) {
        elements.filter.addEventListener('change', (e) => {
            loadHighlights(e.target.value);
        });
    }

    // التحميل الأولي
    await loadHighlights();
});
