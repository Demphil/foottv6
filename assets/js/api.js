const API_HEADERS = {
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    'x-rapidapi-key': '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556' // تأكد من أن هذا المفتاح صالح
};

async function fetchMatches(leagueId) {
    const API_URL = `https://api-football-v1.p.rapidapi.com/v2/odds/league/${leagueId}/bookmaker/5?page=2`;

    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: API_HEADERS
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // تحويل البيانات إلى JSON
        const data = await response.json();
        return data.response; // إرجاع البيانات المستلمة من API
    } catch (error) {
        console.error('خطأ أثناء جلب البيانات:', error);
        throw error; // إعادة رمي الخطأ
    }
}

// يمكن استدعاء هذه الدالة في ملفات أخرى لاستخدامها
export { fetchMatches };
