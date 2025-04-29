
document.addEventListener('DOMContentLoaded', async () => {
    const matchesContainer = document.getElementById('matches-container');

    try {
        const response = await fetch('data/matches.json');
        const matches = await response.json();

        if (matches.length === 0) {
            matchesContainer.innerHTML = '<p class="no-matches">لا توجد مباريات اليوم</p>';
            return;
        }

        matches.forEach(match => {
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';

            matchCard.innerHTML = `
                <div class="league-name">${match.league.name}</div>
                <div class="teams">
                    <span class="team">${match.homeTeam.team_name}</span>
                    <span class="vs">vs</span>
                    <span class="team">${match.awayTeam.team_name}</span>
                </div>
                <div class="match-time">${new Date(match.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            `;

            matchesContainer.appendChild(matchCard);
        });

    } catch (error) {
        matchesContainer.innerHTML = '<p class="error">فشل في تحميل المباريات</p>';
        console.error('Error loading matches:', error);
    }
});
