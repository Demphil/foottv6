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

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("leagues");
  if (!container) {
    console.error("عنصر العرض غير موجود");
    return;
  }

  try {
    const data = await fetchHighlights();
    const highlights = data?.response || [];

    if (!highlights.length) {
      container.innerHTML = "<p>لا توجد ملخصات حالياً.</p>";
      return;
    }

    const filteredByLeague = idleagues.map((league) => {
      return {
        league,
        matches: highlights.filter(match =>
          match.competition?.toLowerCase().includes(league.toLowerCase())
        )
      };
    });

    container.innerHTML = ""; // نبدأ فارغاً

    filteredByLeague.forEach(({ league, matches }) => {
      if (!matches.length) return;

      const section = document.createElement("section");
      section.className = "league-section";

      section.innerHTML = `
        <h2>${league}</h2>
        <div class="highlights-wrapper">
          ${matches.map(match => `
            <div class="highlight-card">
              <h3>${match.title || "بدون عنوان"}</h3>
              <p>${match.date || ""}</p>
              <a href="${match.url}" target="_blank">شاهد الملخص</a>
            </div>
          `).join("")}
        </div>
      `;

      container.appendChild(section);
    });
  } catch (error) {
    console.error("API Error:", error);
    container.innerHTML = "<p>فشل في تحميل الملخصات.</p>";
  }
});
