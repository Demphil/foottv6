const API_HEADERS = {
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    'x-rapidapi-key': '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556'
};

async function fetchMatches(leagueId) {
    try {
        const response = await fetch(`${API_BASE_URL}fixtures?league=${leagueId}&season=2025`, {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.response;

    } catch (error) {
        console.error('خطأ أثناء جلب المباريات:', error);
        throw error; // نعيد رمي الخطأ لكي نعالجه في الملف الآخر
    }
}
