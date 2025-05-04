const API_URL = 'https://api-football-v1.p.rapidapi.com/v3/fixtures';
const API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556'; // ⚠️ استخدم .env في بيئة الإنتاج
const API_HOST = 'api-football-v1.p.rapidapi.com';

const leagues = [
    { id: 2, name: 'دوري أبطال أوروبا' },
    { id: 39, name: 'الدوري الإنجليزي' },
    { id: 140, name: 'الدوري الإسباني' },
    { id: 135, name: 'الدوري الإيطالي' },
    { id: 61, name: 'الدوري الفرنسي' },
    { id: 78, name: 'الدوري الألماني' },
    { id: 307, name: 'الدوري المغربي' },
    { id: 308, name: 'دوري أبطال إفريقيا' },
    { id: 309, name: 'الدوري المغربي' }
];

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

export const fetchMatches = async () => {
    try {
        const today = new Date();
        const season = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const from = today.toISOString().split('T')[0];
        const to = nextWeek.toISOString().split('T')[0];

        console.log(`📅 جلب المباريات من ${from} إلى ${to} لموسم ${season}`);

        const requests = leagues.map(async (league) => {
            let retries = 0;
            let lastError = null;

            while (retries < MAX_RETRIES) {
                try {
                    const response = await fetch(
                        `${API_URL}?league=${league.id}&season=${season}&from=${from}&to=${to}&timezone=Africa/Casablanca`, 
                        {
                            method: 'GET',
                            headers: {
                                'X-RapidAPI-Key': API_KEY,
                                'X-RapidAPI-Host': API_HOST,
                            },
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`❌ خطأ في الشبكة: ${response.status} لبطولة ${league.name}`);
                    }

                    const data = await response.json();

                    if (!Array.isArray(data.response) || data.response.length === 0) {
                        console.warn(`⚠️ لا توجد مباريات لبطولة ${league.name}`);
                        return [];
                    }

                    return data.response.map(match => ({
                        ...match,
                        league: {
                            ...match.league,
                            name_ar: league.name // 🔁 فقط نضيف الاسم العربي هنا
                        }
                    }));
                } catch (error) {
                    lastError = error;
                    retries++;
                    console.warn(`🔁 محاولة ${retries} فشلت لبطولة ${league.name}:`, error.message);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
            }

            throw lastError;
        });

        const results = await Promise.all(requests);
        const allMatches = results.flat();

        console.log(`✅ تم جلب ${allMatches.length} مباراة بنجاح`);
        return allMatches;
    } catch (error) {
        console.error('🚨 فشل جلب المباريات:', error);
        throw new Error('تعذر جلب بيانات المباريات. الرجاء المحاولة لاحقاً.');
    }
};
