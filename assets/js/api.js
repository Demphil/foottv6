// assets/js/api.js

const API_BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3/';
const API_HEADERS = {
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    'x-rapidapi-key': '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556'
};

async function fetchMatches(leagueId) {
    const response = await fetch(`${API_BASE_URL}fixtures?league=${leagueId}&season=2025`, {
        method: 'GET',
        headers: API_HEADERS
    });

    const data = await response.json();
    return data.response;
}
