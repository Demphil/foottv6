const API_URL = 'https://api-football-v1.p.rapidapi.com/v3/fixtures';
const API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556'; // يجب استبداله بمفتاحك الخاص
const API_HOST = 'api-football-v1.p.rapidapi.com';

const leagueIds = [
    2, 39, 140, 135, 61, 78, 307, 308, 309
];

export const fetchMatches = async () => {
    try {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        
        const from = today.toISOString().split('T')[0];
        const to = nextWeek.toISOString().split('T')[0];

        const requests = leagueIds.map(id =>
            fetch(`${API_URL}?league=${id}&season=${today.getFullYear()}&from=${from}&to=${to}&timezone=Africa/Casablanca`, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': API_KEY,
                    'X-RapidAPI-Host': API_HOST,
                },
            }).then(res => {
                if (!res.ok) throw new Error(`Network response was not ok for league ${id}`);
                return res.json();
            })
        );

        const results = await Promise.all(requests);
        return results.flatMap(result => result.response || []);
    } catch (error) {
        console.error('Error fetching matches:', error);
        throw error; // لإدارة الخطأ في matches.js
    }
};
