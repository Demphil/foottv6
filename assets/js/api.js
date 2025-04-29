const API_URL = 'https://api-football-v1.p.rapidapi.com/v3/fixtures'; // ← رابط حسب الوثائق الرسمية لـ RapidAPI
const API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556';
const API_HOST = 'api-football-v1.p.rapidapi.com'; // ← تأكد من أنه نفس اسم الـ Host الموجود في وثائق RapidAPI

export const fetchMatches = async () => {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': API_KEY,
                'X-RapidAPI-Host': API_HOST,
            }
        });

        if (!response.ok) {
            throw new Error(`فشل في تحميل البيانات: ${response.status}`);
        }

        const data = await response.json();

        // على حسب شكل البيانات — تأكد أن المسار صحيح
        if (!data.response || !Array.isArray(data.response)) {
            throw new Error('البيانات غير صالحة أو لا تحتوي على مباريات');
        }

        return data.response;
    } catch (error) {
        console.error('خطأ أثناء جلب المباريات:', error);
        return [];
    }
};
