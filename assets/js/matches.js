const options = {
  method: 'GET',
  headers: {
    'X-RapidAPI-Key': '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556',
    'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
  }
};

// ✅ البطولات المطلوبة
const allowedLeagues = [
  2,   // دوري الأبطال
  39,  // الدوري الإنجليزي
  140, // الدوري الإسباني
  135, // الدوري الإيطالي
  61,  // الدوري الفرنسي
  78,  // الدوري الألماني
  307, // الدوري المغربي
  307, // الدوري المغربي
  307, // الدوري المغربي
  308, // دوري أبطال أفريقيا
  3,   // كأس الاتحاد الإفريقي
  307, // الدوري المغربي
  307, // الدوري المغربي
  307, // الدوري المغربي
  307, // الدوري المغربي
  307, // الدوري المغربي
  308, // دوري أبطال إفريقيا
  152 // الدوري السعودي
];

// ✅ قائمة ID للمباريات المنقولة
const manuallySelectedMatches = [
  123456, // استبدل بـ fixture ID الفعلي
  234567, 
  345678
];

function getFormattedDate(date) {
  return date.toISOString().split('T')[0];
}

function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getFormattedDate(tomorrow);
}

function isSelectedMatch(fixtureId) {
  return manuallySelectedMatches.includes(fixtureId);
}

function displayMatches(matches, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const groupedMatches = {};

  matches.forEach(match => {
    const leagueName = match.league.name;
    if (!groupedMatches[leagueName]) {
      groupedMatches[leagueName] = [];
    }
    groupedMatches[leagueName].push(match);
  });

  for (const leagueName in groupedMatches) {
    const leagueMatches = groupedMatches[leagueName];

    const leagueSection = document.createElement('div');
    leagueSection.classList.add('league-section');

    const leagueTitle = document.createElement('h2');
    leagueTitle.textContent = leagueName;
    leagueTitle.classList.add('league-title');
    leagueSection.appendChild(leagueTitle);

    leagueMatches.forEach(match => {
      const matchCard = document.createElement('div');
      matchCard.classList.add('match-card');

      if (isSelectedMatch(match.fixture.id)) {
        matchCard.classList.add('selected-match'); // لتمييز المباراة المنقولة
      }

      matchCard.innerHTML = `
        <div class="teams">
          <span class="team-name">${match.teams.home.name}</span>
          <span class="vs">vs</span>
          <span class="team-name">${match.teams.away.name}</span>
        </div>
        <div class="match-info">
          <span class="match-time">${new Date(match.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          ${isSelectedMatch(match.fixture.id) ? '<span class="live-badge">مباشر</span>' : ''}
        </div>
      `;

      leagueSection.appendChild(matchCard);
    });

    container.appendChild(leagueSection);
  }
}

function fetchMatches(date, containerId) {
  const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${date}`;
  fetch(url, options)
    .then(response => response.json())
    .then(data => {
      const filteredMatches = data.response.filter(match =>
        allowedLeagues.includes(match.league.id)
      );
      displayMatches(filteredMatches, containerId);
    })
    .catch(error => console.error('Error fetching matches:', error));
}

document.addEventListener('DOMContentLoaded', () => {
  const today = getFormattedDate(new Date());
  const tomorrow = getTomorrowDate();

  fetchMatches(today, 'today-matches');
  fetchMatches(tomorrow, 'tomorrow-matches');
});
