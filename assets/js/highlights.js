// js/highlights.js
import { fetchHighlights } from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get DOM elements with null checks
        const highlightsContainer = document.getElementById('highlights-container');
        const leagueFilter = document.getElementById('league-filter');
        const loadingIndicator = document.getElementById('loading-indicator');

        if (!highlightsContainer || !leagueFilter || !loadingIndicator) {
            throw new Error('Required DOM elements not found');
        }

        const showLoadingState = (show) => {
            loadingIndicator.style.display = show ? 'block' : 'none';
            if (show) {
                highlightsContainer.innerHTML = '';
            }
        };

        const displayHighlights = (highlights) => {
            if (!highlights || !Array.isArray(highlights)) {
                highlightsContainer.innerHTML = '<p class="no-highlights">Error loading highlights. Please try again later.</p>';
                return;
            }

            highlightsContainer.innerHTML = '';
            
            if (highlights.length === 0) {
                highlightsContainer.innerHTML = '<p class="no-highlights">No highlights available for this league.</p>';
                return;
            }

            highlights.forEach(match => {
                if (!match || !match.embed) return; // Skip invalid matches
                
                const matchElement = document.createElement('div');
                matchElement.className = 'highlight-card';
                
                matchElement.innerHTML = `
                    <div class="match-info">
                        <h3>${match.homeTeamName || 'Home'} vs ${match.awayTeamName || 'Away'}</h3>
                        <p class="league">${match.leagueName || 'League'} - ${match.countryName || 'Country'}</p>
                        <p class="date">${match.date ? new Date(match.date).toLocaleDateString() : 'Date not available'}</p>
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
            try {
                showLoadingState(true);
                const highlights = await fetchHighlights(league);
                displayHighlights(highlights);
            } catch (error) {
                console.error('Error loading highlights:', error);
                highlightsContainer.innerHTML = '<p class="no-highlights">Failed to load highlights. Please refresh the page.</p>';
            } finally {
                showLoadingState(false);
            }
        };

        // Initial load
        await loadHighlights();

        // Filter by league
        leagueFilter.addEventListener('change', async (e) => {
            await loadHighlights(e.target.value);
        });

    } catch (error) {
        console.error('Initialization error:', error);
        // Fallback error display if even the container is missing
        const fallbackContainer = document.createElement('div');
        fallbackContainer.style.padding = '20px';
        fallbackContainer.style.color = 'red';
        fallbackContainer.textContent = 'Failed to initialize highlights. Please check the console for details.';
        document.body.prepend(fallbackContainer);
    }
});
