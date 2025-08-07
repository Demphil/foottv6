const API_BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = '6a89b9abe46e4c7f82fa95ed979be20f'; // ⚠️ استخدم .env في بيئة الإنتاج
const CACHE_EXPIRY_HOURS = 12; // صلاحية الكاش 12 ساعة

// تم تحديث معرفات البطولات لتتوافق مع football-data.org
const leagues = [
    { id: 2000, name: 'دوري أبطال أوروبا' }, // UEFA Champions League
    { id: 2021, name: 'الدوري الإنجليزي' },  // Premier League
    { id: 2014, name: 'الدوري الإسباني' },   // La Liga
    { id: 2019, name: 'الدوري الإيطالي' },   // Serie A
    { id: 2015, name: 'الدوري الفرنسي' },    // Ligue 1
    { id: 2002, name: 'الدوري الألماني' },   // Bundesliga
    { id: 503, name: 'البطولة المغربية' },    // Botola Pro
    { id: 521, name: 'الدوري المصري' },      // Egyptian Premier League
    { id: 632, name: 'دوري روشن السعودي' },  // Saudi Pro League
    { id: 2001, name: 'الدوري الأوروبي' },   // Europa League
    { id: 2003, name: 'UEFA Conference League' },
    { id: 2004, name: 'CAF Champions League' },
    { id: 2005, name: 'CAF Confederations Cup' }
];

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

// نظام التخزين المؤقت المحلي
const cache = {
    get: (key) => {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        const { value, expiry } = JSON.parse(item);
        if (new Date().getTime() > expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return value;
    },
    set: (key, value, hours) => {
        const now = new Date();
        const expiry = now.getTime() + hours * 60 * 60 * 1000;
        localStorage.setItem(key, JSON.stringify({ value, expiry }));
    }
};

export const fetchMatches = async () => {
    let from, to; // تعريف المتغيرات في بداية الدالة
    
    try {
        const today = new Date();
        const season = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        from = today.toISOString().split('T')[0];
        to = nextWeek.toISOString().split('T')[0];

        console.log(`📅 جلب المباريات من ${from} إلى ${to}`);

        const requests = leagues.map(async (league) => {
            const cacheKey = `matches_${league.id}_${from}_${to}`;
            const cachedData = cache.get(cacheKey);
            
            if (cachedData) {
                console.log(`♻️ استخدام البيانات المخزنة لبطولة ${league.name}`);
                return cachedData;
            }

            let retries = 0;
            let lastError = null;

            while (retries < MAX_RETRIES) {
                try {
                    const url = `${API_BASE_URL}/competitions/${league.id}/matches?dateFrom=${from}&dateTo=${to}`;
                    const response = await fetch(url, {
                        headers: {
                            'X-Auth-Token': API_KEY
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`❌ خطأ في الشبكة: ${response.status} لبطولة ${league.name}`);
                    }

                    const data = await response.json();

                    if (!data.matches || data.matches.length === 0) {
                        console.warn(`⚠️ لا توجد مباريات لبطولة ${league.name}`);
                        return [];
                    }

                    const matchesWithArabicName = data.matches.map(match => ({
                        ...match,
                        competition: {
                            ...match.competition,
                            name_ar: league.name // إضافة الاسم العربي للبطولة
                        }
                    }));

                    cache.set(cacheKey, matchesWithArabicName, CACHE_EXPIRY_HOURS);
                    console.log(`✅ تم تحديث الكاش لبطولة ${league.name}`);
                    
                    return matchesWithArabicName;
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
        
        // محاولة استخدام آخر بيانات متاحة من الكاش في حالة الخطأ
        const fallbackData = [];
        if (from && to) {
            leagues.forEach(league => {
                const cacheKey = `matches_${league.id}_${from}_${to}`;
                const cached = cache.get(cacheKey);
                if (cached) fallbackData.push(...cached);
            });
        }
        
        if (fallbackData.length > 0) {
            console.warn('⚡ استخدام بيانات قديمة بسبب خطأ في الاتصال');
            return fallbackData;
        }
        
        throw new Error('تعذر جلب بيانات المباريات. الرجاء المحاولة لاحقاً.');
    }
};
