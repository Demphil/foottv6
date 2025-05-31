const API_BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = '05d80048cd36476dab51f63b97a91bc7'; // ⚠️ استخدم .env في بيئة الإنتاج
const CACHE_EXPIRY_HOURS = 12; // صلاحية الكاش 12 ساعة

const leagues = [
    { id: 2000, name: 'دوري أبطال أوروبا' },
    { id: 2021, name: 'الدوري الإنجليزي' },
    { id: 2014, name: 'الدوري الإسباني' },
    { id: 2019, name: 'الدوري الإيطالي' },
    { id: 2015, name: 'الدوري الفرنسي' },
    { id: 2002, name: 'الدوري الألماني' },
    { id: 503, name: 'البطولة المغربية' },
    { id: 521, name: 'الدوري المصري' },
    { id: 632, name: 'دوري روشن السعودي' },
    { id: 2001, name: 'الدوري الأوروبي' },
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

// حل CORS باستخدام Proxy شخصي أو خادم خلفي
const fetchWithProxy = async (url) => {
    // اختر أحد الخيارات التالية:
    
    // 1. استخدام خادمك الخلفي (الأفضل للإنتاج)
    // const PROXY_URL = 'https://your-backend.com/proxy/';
    
    // 2. استخدام proxy بديل (للاختبار فقط)
    const PROXY_URL = 'https://api.allorigins.win/raw?url=';
    
    try {
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`, {
            headers: {
                'X-Auth-Token': API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error(`طلب API فاشل: ${response.status}`);
        return response;
    } catch (error) {
        console.error('خطأ في طلب الـ Proxy:', error);
        throw error;
    }
};

// توليد مفتاح فريد للتخزين المؤقت
const generateCacheKey = (leagueId, from, to) => 
    `matches_${leagueId}_${from}_${to}`;

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
            const cacheKey = generateCacheKey(league.id, from, to);
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
                    const response = await fetchWithProxy(url);
                    const data = await response.json();

                    if (!data.matches || data.matches.length === 0) {
                        console.warn(`⚠️ لا توجد مباريات لبطولة ${league.name}`);
                        return [];
                    }

                    const matchesWithArabicName = data.matches.map(match => ({
                        ...match,
                        competition: {
                            ...match.competition,
                            name_ar: league.name
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
        if (from && to) { // التحقق من وجود المتغيرات
            leagues.forEach(league => {
                const cacheKey = generateCacheKey(league.id, from, to);
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
