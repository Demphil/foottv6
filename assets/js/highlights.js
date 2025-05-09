import { fetchHighlights } from './highlights-api.js';

const CACHE_KEY = 'cachedHighlights';
const CACHE_TIME_KEY = 'cachedHighlightsTime';
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 ساعات

const LEAGUES = [
    'Premier League',
    'La Liga',
    'Serie A',
    'Ligue 1',
    'Champions League',
    'UEFA Europa Conference League',
];

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
    if (!container) {
        console.error("❌ لم يتم العثور على العنصر #highlightsContainer");
        return;
    }

    container.innerHTML = '...جاري التحميل';

    let allMatches = getCachedData();

    if (!allMatches) {
        allMatches = [];

        for (const league of LEAGUES) {
            try {
                const matches = await fetchHighlights(league);
                console.log(`✅ بيانات ${league}:`, matches);
                allMatches = allMatches.concat(matches);
            } catch (error) {
                console.error(`❌ خطأ في جلب ملخصات ${league}:`, error);
            }
        }

        setCachedData(allMatches);
    }

    if (!allMatches || !allMatches.length) {
        container.innerHTML = '<p>⚠️ لا توجد ملخصات متوفرة حالياً.</p>';
        return;
    }

    container.innerHTML = '';

    allMatches.forEach(match => {
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
