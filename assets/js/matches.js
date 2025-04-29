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

            // نستخدم match.utcDate بدلاً من match.date
            const todayMatches = matches.filter(match => this.isToday(match.utcDate));
            const tomorrowMatches = matches.filter(match => this.isTomorrow(match.utcDate));

            this.renderMatchesByDate(todayMatches, 'today');
            this.renderMatchesByDate(tomorrowMatches, 'tomorrow');
        } catch (error) {
            this.showError(error);
        } finally {
            this.hideLoading();
        }
    },

    isToday: function(dateString) {
        const today = new Date();
        const matchDate = new Date(dateString);
        return today.toDateString() === matchDate.toDateString();
    },

    isTomorrow: function(dateString) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const matchDate = new Date(dateString);
        return tomorrow.toDateString() === matchDate.toDateString();
    },

    renderMatchesByDate: function(matches, type) {
        const container = type === 'today' ? this.elements.todayContainer : this.elements.tomorrowContainer;
        if (!container) return;

        if (matches.length === 0) {
            container.innerHTML = `<p>لا توجد مباريات</p>`;
            return;
        }

        container.innerHTML = matches.map(match => `
            <div class="match-card">
                <h3>${match.homeTeam.name} ضد ${match.awayTeam.name}</h3>
                <p>${new Date(match.utcDate).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}</p>
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
                <p>حدث خطأ أثناء تحميل المباريات: ${error.message}</p>
            `;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    MatchRenderer.init();
});
