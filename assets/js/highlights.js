import { fetchHighlightsByLeague } from './highlights-api.js';

const leagues = [
  { id: 2, name: 'UEFA Champions League' },  // Example ID
  { id: 140, name: 'La Liga' },
  { id: 39, name: 'Premier League' },
  { id: 135, name: 'Serie A (Italy)' },
  { id: 61, name: 'Ligue 1 (France)' },
  { id: 307, name: 'Botola (Morocco)' },
  { id: 307, name: 'Saudi Pro League' } // Use real ID
];

const container = document.getElementById("highlights-container");

function createHighlightCard(highlight) {
  return `
    <div class="highlight-card">
      <h4>${highlight.title}</h4>
      <iframe
        width="100%"
        height="200"
        src="${highlight.embedUrl}"
        frameborder="0"
        allowfullscreen
      ></iframe>
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
