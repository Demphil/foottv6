// scripts/generate-matches.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const RAPID_API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556';

const leagues = [
    { id: 2, name: "الدوري المغربي" }, // ضع ID المناسب لكل دوري
    { id: 39, name: "الدوري الإنجليزي" },
    { id: 140, name: "الدوري الإسباني" },
    { id: 61, name: "الدوري السعودي" },
    { id: 5, name: "دوري أبطال أوروبا" },
    { id: 274, name: "دوري أبطال أفريقيا" },
    { id: 275, name: "دوري أبطال آسيا" }
];

async function fetchMatches() {
    try {
        const matches = [];

        for (const league of leagues) {
            const response = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${league.id}&season=2024`, {
                headers: {
                    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
                    'x-rapidapi-key': RAPID_API_KEY
                }
            });

            const leagueMatches = response.data.response.map(match => ({
                league: league.name,
                date: match.fixture.date,
                homeTeam: match.teams.home.name,
                awayTeam: match.teams.away.name,
                status: match.fixture.status.short,
                goalsHome: match.goals.home,
                goalsAway: match.goals.away
            }));

            matches.push(...leagueMatches);
        }

        const filePath = path.join(__dirname, '..', 'data', 'matches.json');
        fs.writeFileSync(filePath, JSON.stringify(matches, null, 2));

        console.log('✅ Matches data updated successfully!');
    } catch (error) {
        console.error('❌ Error fetching matches:', error.message);
    }
}

fetchMatches();
