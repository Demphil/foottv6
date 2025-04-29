import { fetchMatches } from './api.js';  // تأكد من استيراد دالة fetchMatches

const MatchRenderer = {
    elements: {
        todayContainer: null,
        tomorrowContainer: null,
        loadingIndicator: null,
        errorContainer: null,
        dateFilter: null,
        leagueFilter: null
    },

    init: async function() {
        this.cacheElements();
        await this.loadMatches();
        this.setupEventListeners();
    },

    cacheElements: function() {
        this.elements = {
            todayContainer: document.getElementById('today-matches'),
            tomorrowContainer: document.getElementById('tomorrow-matches'),
            loadingIndicator: document.getElementById('loading-indicator'),
            errorContainer: document.getElementById('error-container'),
            dateFilter: document.getElementById('date-filter'),
            leagueFilter: document.getElementById('league-filter')
        };
    },

    setupEventListeners: function() {
        if (this.elements.dateFilter) {
            this.elements.dateFilter.addEventListener('change', (e) => this.handleDateFilter(e));
        }

        if (this.elements.leagueFilter) {
            this.elements.leagueFilter.addEventListener('change', (e) => this.handleLeagueFilter(e));
        }
    },

    handleDateFilter: async function(e) {
        const date = e.target.value;
        await this.renderMatches(date);
    },

    handleLeagueFilter: async function(e) {
        const leagueId = e.target.value;
        await this.renderMatches(null, leagueId);
    },

    loadMatches: async function() {
        try {
            this.showLoading();

            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // استدعاء دالة fetchMatches هنا
            const [todayMatches, tomorrowMatches] = await Promise.all([
                fetchMatches(1), // استبدل 1 بمعرف الدوري المطلوب
                fetchMatches(1) // استبدل 1 بمعرف الدوري المطلوب
            ]);

            this.renderMatchesByDate(todayMatches, 'today');
            this.renderMatchesByDate(tomorrowMatches, 'tomorrow');

        } catch (error) {
            console.error('Failed to load matches:', error);
            this.showError(error);
        } finally {
            this.hideLoading();
        }
    },

    renderMatchesByDate: function(matches, type) {
        const container = type === 'today'
            ? this.elements.todayContainer
            : this.elements.tomorrowContainer;

        if (!container) {
            console.error(`Container not found for ${type}`);
            return;
        }

        if (!matches || matches.length === 0) {
            container.innerHTML = this.getNoMatchesHTML();
            return;
        }

        container.innerHTML = matches.map(match => this.getMatchHTML(match)).join('');
    },

    // باقي الكود كما هو...
};

export { MatchRenderer };

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', () => {
    MatchRenderer.init();
});
