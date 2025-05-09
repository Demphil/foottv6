import { fetchHighlights } from './highlights-api.js';

const CACHE_KEY = 'cachedHighlights';
const CACHE_TIME_KEY = 'cachedHighlightsTime';
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 ساعات

const getCachedData = () => {
    const cached = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

    if (cached && cachedTime) {
        const now = Date.now();
        if (now - parseInt(cachedTime) < CACHE_DURATION_MS) {
            return JSON.parse(cached);
        }
    }
    return null;
};

const setCachedData = (data) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
};

const displayHighlights = async () => {
    const container = document.getElementById('highlightsContainer');
    container.innerHTML = '';

    let matches = getCachedData();
    if (!matches) {
        matches = await fetchHighlights();
        setCachedData(matches);
    }

    if (!matches.length) {
        container.innerHTML = '<p>لا توجد ملخصات متوفرة حالياً.</p>';
        return;
    }

    matches.forEach(match => {
        const card = document.createElement('div');
        card.className = 'highlight-card';

        card.innerHTML = `
            <h3>${match.homeTeam} vs ${match.awayTeam}</h3>
            <p>${match.competition} - ${new Date(match.date).toLocaleString('ar-MA')}</p>
            <div class="video-container">
                <iframe src="${match.embed}" frameborder="0" allowfullscreen></iframe>
            </div>
        `;

        container.appendChild(card);
    });
};

document.addEventListener('DOMContentLoaded', displayHighlights);
