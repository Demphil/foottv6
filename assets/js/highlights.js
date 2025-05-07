// js/highlights.js
import { fetchHighlights } from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const highlightsContainer = document.getElementById('highlights-container');
    const leagueFilter = document.getElementById('league-filter');
    const loadingIndicator = document.getElementById('loading-indicator');

    const displayHighlights = (highlights) => {
        highlightsContainer.innerHTML = '';
        
        if (highlights.length === 0) {
            highlightsContainer.innerHTML = '<p class="no-highlights">No highlights available for this league.</p>';
            return;
        }

        highlights.forEach(match => {
            const matchElement = document.createElement('div');
            matchElement.className = 'highlight-card';
            
            matchElement.innerHTML = `
                <div class="match-info">
                    <h3>${match.homeTeamName} vs ${match.awayTeamName}</h3>
                    <p class="league">${match.leagueName} - ${match.countryName}</p>
                    <p class="date">${new Date(match.date).toLocaleDateString()}</p>
                </div>
                <div class="highlight-video">
                    <iframe src="${match.embed}" frameborder="0" allowfullscreen></iframe>
                </div>
                <div class="match-details">
                    <p>${match.title || 'Match Highlights'}</p>
                </div>
            `;
            
            highlightsContainer.appendChild(matchElement);
        });
    };

    const loadHighlights = async (league = '') => {
        loadingIndicator.style.display = 'block';
        highlightsContainer.innerHTML = '';
        
        const highlights = await fetchHighlights(league);
        displayHighlights(highlights);
        
        loadingIndicator.style.display = 'none';
    };

    // Initial load
    await loadHighlights();

    // Filter by league
    leagueFilter.addEventListener('change', async (e) => {
        await loadHighlights(e.target.value);
    });
});
