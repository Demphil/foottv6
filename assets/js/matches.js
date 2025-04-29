// matches.js
import { fetchMatches } from './api.js';

const MatchRenderer = {
    elements: {
        todayContainer: null,
        tomorrowContainer: null,
        loadingIndicator: null,
        errorContainer: null
    },

    init: async function() {
        this.cacheElements();
        await this.loadMatches();
    },

    cacheElements: function() {
        this.elements.todayContainer = document.getElementById('today-matches');
        this.elements.tomorrowContainer = document.getElementById('tomorrow-matches');
        this.elements.loadingIndicator = document.getElementById('loading-indicator');
        this.elements.errorContainer = document.getElementById('error-container');
    },

    loadMatches: async function() {
        try {
            this.showLoading();
            const matches = await fetchMatches();
            const todayMatches = matches.filter(match => this.isToday(match.date));
            const tomorrowMatches = matches.filter(match => this.isTomorrow(match.date));

            this.renderMatchesByDate(todayMatches, 'today');
            this.renderMatchesByDate(tomorrowMatches, 'tomorrow');
        } catch (error) {
            this.showError(error);
        } finally {
            this.hideLoading();
        }
    },

    isToday: function(date) {
        const today = new Date();
        const matchDate = new Date(date);
        return today.toDateString() === matchDate.toDateString();
    },

    isTomorrow: function(date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const matchDate = new Date(date);
        return tomorrow.toDateString() === matchDate.toDateString();
    },

    renderMatchesByDate: function(matches, type) {
        const container = type === 'today' ? this.elements.todayContainer : this.elements.tomorrowContainer;
        if (matches.length === 0) {
            container.innerHTML = `<p>لا توجد مباريات</p>`;
            return;
        }

        container.innerHTML = matches.map(match => `
            <div class="match-card">
                <h3>${match.homeTeam.name} ضد ${match.awayTeam.name}</h3>
                <p>${new Date(match.utcDate).toLocaleTimeString()}</p>
            </div>
        `).join('');
    },

    showLoading: function() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = 'block';
        }
    },

    hideLoading: function() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = 'none';
        }
    },

    showError: function(error) {
        if (this.elements.errorContainer) {
            this.elements.errorContainer.innerHTML = `
                <p>حدث خطأ: ${error.message}</p>
            `;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    MatchRenderer.init();
});
