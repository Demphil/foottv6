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

// دالة لتحديد القنوات الافتراضية حسب الدوري
function getDefaultChannels(leagueId) {
    const channelsMap = {
        2: ['bein SPORTS HD1', 'bein SPORTS HD2'],       // دوري أبطال أوروبا
        39: ['bein SPORTS HD3', 'SSC 1'],               // الدوري الإنجليزي
        140: ['bein SPORTS HD1', 'Abu Dhabi Sports'],    // الدوري الإسباني
        135: ['bein SPORTS HD2', 'SSC 2'],              // الدوري الإيطالي
        61: ['bein SPORTS HD3', 'On Time Sports'],      // الدوري الفرنسي
        78: ['bein SPORTS HD1', 'ZDF'],                 // الدوري الألماني
        307: ['Arryadia', 'Al Aoula'],                 // الدوري المغربي
        308: ['bein SPORTS HD4', 'Arryadia'],          // دوري أبطال إفريقيا
        309: ['Al Aoula', 'Arryadia']                  // الدوري المغربي
    };
    return channelsMap[leagueId] || ['غير معروف'];
}

export const fetchMatches = async () => {
    try {
        const today = new Date();
        const dayKey = today.toISOString().split('T')[0]; // مثل: "2025-05-01"
        const cachedData = localStorage.getItem('matches');
        const cachedDate = localStorage.getItem('matchesDate');

        // ✅ إذا كانت البيانات مخزنة لنفس اليوم، نعيدها مباشرة بدون أي طلب جديد
        if (cachedData && cachedDate === dayKey) {
            console.log('📦 تم تحميل المباريات من التخزين المحلي');
            return JSON.parse(cachedData);
        }

        const season = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const from = dayKey;
        const to = nextWeek.toISOString().split('T')[0];

        console.log(`📅 جلب المباريات من API من ${from} إلى ${to} لموسم ${season}`);

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
                            name_ar: league.name
                        },
                        tv_channels: getDefaultChannels(league.id)
                    }));

                } catch (error) {
                    lastError = error;
                    retries++;
                    console.warn(`🔁 محاولة ${retries} فشلت لبطولة ${league.name}:`, error.message);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
            }

            console.error(`❌ فشل جلب بيانات ${league.name} بعد ${MAX_RETRIES} محاولات`);
            return [];
        });

        const results = await Promise.all(requests);
        const allMatches = results.flat();

        console.log(`✅ تم جلب ${allMatches.length} مباراة بنجاح من API`);

        // ✅ تخزين النتائج في localStorage
        localStorage.setItem('matches', JSON.stringify(allMatches));
        localStorage.setItem('matchesDate', dayKey);

        return allMatches;

    } catch (error) {
        console.error('🚨 فشل جلب المباريات:', error);
        throw new Error('تعذر جلب بيانات المباريات. الرجاء المحاولة لاحقاً.');
    }
};
