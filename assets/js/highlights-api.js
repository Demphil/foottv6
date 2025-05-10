import { fetchHighlights } from './highlights-api.js';

const allowedCompetitions = {
    'Premier League': 'الدوري الإنجليزي',
    'La Liga': 'الدوري الإسباني',
    'Serie A': 'الدوري الإيطالي',
    'Ligue 1': 'الدوري الفرنسي',
    'UEFA Champions League': 'دوري أبطال أوروبا',
    'UEFA Europa Conference League': 'دوري المؤتمر الأوروبي'
};

function createMatchCard(match) {
    return `
        <div class="highlight-card">
            <h3>${match.title}</h3>
            <p>${match.competition}</p>
            <a href="${match.url}" target="_blank">مشاهدة الملخص</a>
        </div>
    `;
}

function createLeagueSection(competitionName, matches) {
    const section = document.createElement('section');
    section.className = 'league-section';
    section.innerHTML = `
        <h2>${allowedCompetitions[competitionName]}</h2>
        <div class="highlights-wrapper">
            ${matches.map(createMatchCard).join('')}
        </div>
    `;
    return section;
}

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('leagues');
    const today = new Date().toISOString().split('T')[0];

    try {
        const allHighlights = await fetchHighlights(today);
        const filteredByLeague = {};

        for (const league in allowedCompetitions) {
            filteredByLeague[league] = allHighlights.filter(
                match => match.competition === league
            );
        }

        for (const league in filteredByLeague) {
            if (filteredByLeague[league].length > 0) {
                const section = createLeagueSection(league, filteredByLeague[league]);
                container.appendChild(section);
            }
        }

        if (container.innerHTML.trim() === '') {
            container.innerHTML = `<p style="text-align: center;">لا توجد ملخصات متوفرة حالياً.</p>`;
        }
    } catch (error) {
        console.error('API Error:', error);
        container.innerHTML = `<p style="text-align: center;">حدث خطأ أثناء جلب البيانات.</p>`;
    }
});
