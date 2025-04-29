// تعريف المتغيرات للرؤوس (Headers)
const API_HEADERS = {
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    'x-rapidapi-key': '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556'
};

// الدالة التي تجلب البيانات من الـ API
async function fetchOdds(leagueId, bookmakerId, page = 1) {
    const API_URL = `https://api-football-v1.p.rapidapi.com/v2/odds/league/${leagueId}/bookmaker/${bookmakerId}?page=${page}`;

    try {
        // إرسال طلب إلى API
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: API_HEADERS
        });

        // التحقق من حالة الاستجابة
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // تحويل البيانات إلى JSON
        const data = await response.json();
        return data; // إرجاع البيانات
    } catch (error) {
        console.error('خطأ أثناء جلب البيانات:', error);
        throw error; // إعادة رمي الخطأ
    }
}

// مثال على كيفية استخدام الدالة
fetchOdds(865927, 5, 2)
    .then(data => {
        console.log(data); // طباعة البيانات المستلمة
    })
    .catch(error => {
        console.error('حدث خطأ:', error); // طباعة الأخطاء إذا حدثت
    });
