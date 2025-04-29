// api.js

const API_URL = 'https://api-football-v1.p.rapidapi.com/v3/fixtures';
const API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556'; // ← غيّر هذا السطر بمفتاحك الحقيقي
const API_HOST = 'api-football-v1.p.rapidapi.com';

const leagueIds = [2, 39, 140, 135, 61, 78, 307, 200]; // الدوريات المطلوبة
const season = 2023;
const timezone = 'Africa/Casablanca';

export const fetchMatches = async () => {
    try {
        const requests = leagueIds.map(id =>
            fetch(`${API_URL}?league=${id}&season=${season}&timezone=${timezone}`, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': API_KEY,
                    'X-RapidAPI-Host': API_HOST,
                },
            }).then(res => res.json())
        );

        const results = await Promise.all(requests);

        const allMatches = results.flatMap(result => result.response || []);

        return allMatches;
    } catch (error) {
        console.error('خطأ أثناء جلب المباريات:', error);
        return [];
    }
};
