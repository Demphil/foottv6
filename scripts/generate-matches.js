// scripts/generate-matches.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const RAPID_API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556';

const leagues = [
    { id: 2, name: "الدوري المغربي" },
    { id: 39, name: "الدوري الإنجليزي" },
    { id: 140, name: "الدوري الإسباني" },
    { id: 61, name: "الدوري السعودي" },
    { id: 5, name: "دوري أبطال أوروبا" },
    { id: 274, name: "دوري أبطال أفريقيا" },
    { id: 275, name: "دوري أبطال آسيا" }
];

async function fetchMatches() {
    try {
        const today = new Date();
        const from = today.toISOString().split('T')[0];
        const to = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // اليوم + غدا

        const matches = [];

        for (const league of leagues) {
            const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${league.id}&season=2024&from=${from}&to=${to}`;
            const response = await axios.get(url, {
                headers: {
                    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
                    'x-rapidapi-key': RAPID_API_KEY
                }
            });

            const leagueMatches = response.data.response.map(match => ({
                fixture: {
                    id: match.fixture.id,
                    date: match.fixture.date,
                    venue: {
                        name: match.fixture.venue.name || 'غير معروف',
                        city: match.fixture.venue.city || ''
                    },
                    status: {
                        short: match.fixture.status.short
                    }
                },
                league: {
                    id: match.league.id,
                    name: match.league.name
                },
                teams: {
                    home: {
                        name: match.teams.home.name,
                        logo: match.teams.home.logo
                    },
                    away: {
                        name: match.teams.away.name,
                        logo: match.teams.away.logo
                    }
                },
                goals: {
                    home: match.goals.home,
                    away: match.goals.away
                }
            }));

            matches.push(...leagueMatches);
        }

        const filePath = path.join(__dirname, '..', 'data', 'matches.json');
        fs.writeFileSync(filePath, JSON.stringify(matches, null, 2), 'utf-8');

        console.log('✅ matches.json تم تحديثه بنجاح!');
    } catch (error) {
        console.error('❌ فشل في تحميل المباريات:', error.message);
    }
}

fetchMatches();

