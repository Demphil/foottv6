const API_URL = 'https://api.football-data.org/v2/matches';
const API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556'; // ← ضع مفتاح API الخاص بك من موقع football-data.org

export const fetchMatches = async () => {
    try {
        const response = await fetch(API_URL, {
            headers: {
                'X-Auth-Token': API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`فشل في تحميل البيانات: ${response.status}`);
        }

        const data = await response.json();

        // التأكد من أن البيانات تحتوي على matches
        if (!data.matches || !Array.isArray(data.matches)) {
            throw new Error('البيانات غير صالحة أو لا تحتوي على مباريات');
        }

        return data.matches;
    } catch (error) {
        console.error('خطأ أثناء جلب المباريات:', error);
        return []; // نُعيد مصفوفة فارغة في حال وجود خطأ لتفادي تعطل الصفحة
    }
};
