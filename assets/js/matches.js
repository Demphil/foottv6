// assets/js/matches.js

document.addEventListener('DOMContentLoaded', async () => {
    const matchesContainer = document.getElementById('matches-list');
    const matches = await fetchMatches();

    if (!matches || matches.length === 0) {
        matchesContainer.innerHTML = '<p>لا توجد مباريات متاحة حالياً.</p>';
        return;
    }

    matches.forEach(match => {
        const matchCard = document.createElement('div');
        matchCard.classList.add('match-card');

        // تأكد من هيكل البيانات بناءً على استجابة الـ API
        const homeTeam = match.teams.home.team_name;
        const awayTeam = match.teams.away.team_name;
        const matchTime = match.fixture.date;
        const leagueName = match.league.name;

        matchCard.innerHTML = `
            <h3>${homeTeam} vs ${awayTeam}</h3>
            <p>الساعة: ${new Date(matchTime).toLocaleTimeString()}</p>
            <p>الدوري: ${leagueName}</p>
        `;
        matchesContainer.appendChild(matchCard);
    });
});
// assets/js/main.js
console.log("موقع مباريات مباشرة جاهز!");
