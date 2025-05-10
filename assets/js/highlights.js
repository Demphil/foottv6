import { fetchHighlightsByLeague } from './highlights-api.js';

const leagues = [
    { id: 2, name: 'دوري أبطال أوروبا' },
    { id: 39, name: 'الدوري الإنجليزي' },
    { id: 140, name: 'الدوري الإسباني' },
    { id: 135, name: 'الدوري الإيطالي' },
    { id: 61, name: 'الدوري الفرنسي' },
    { id: 78, name: 'الدوري الألماني' },
    { id: 200, name: 'البطولة المغربية الإحترافية إنوي القسم الأول' },
    { id: 233, name: 'الدوري المصري الممتاز' },
    { id: 307, name: 'دوري روشن السعودي' },
    { id: 3, name: 'الدوري الأوروبي' },
    { id: 848, name: 'UEFA Conference League' },
    

];

const container = document.getElementById("highlights-container");

function createHighlightCard(highlight) {
  return `
    <div class="highlight-card">
      <h4>${highlight.title}</h4>
      <video controls src="${highlight.video_url}" preload="metadata"></video>
    </div>
  `;
}

function createLeagueSection(leagueName, highlights) {
  return `
    <section class="league-section">
      <h2>${leagueName}</h2>
      <div class="highlights-grid">
        ${highlights.map(createHighlightCard).join('')}
      </div>
    </section>
  `;
}

async function displayAllHighlights() {
  for (const league of leagues) {
    const highlights = await fetchHighlightsByLeague(league.id);
    if (highlights && highlights.length > 0) {
      const html = createLeagueSection(league.name, highlights);
      container.innerHTML += html;
    }
  }
}

displayAllHighlights();
