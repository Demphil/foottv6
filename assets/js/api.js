const API_BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = '05d80048cd36476dab51f63b97a91bc7'; // ⚠️ استخدم .env في بيئة الإنتاج

const competitions = [
    { id: 2000, name: 'دوري أبطال أوروبا' }, // UCL
    { id: 2021, name: 'الدوري الإنجليزي' }, // Premier League
    { id: 2014, name: 'الدوري الإسباني' }, // La Liga
    { id: 2019, name: 'الدوري الإيطالي' }, // Serie A
    { id: 2015, name: 'الدوري الفرنسي' }, // Ligue 1
    { id: 2002, name: 'الدوري الألماني' }, // Bundesliga
    { id: 503, name: 'البطولة المغربية' }, // Botola Pro
    { id: 521, name: 'الدوري المصري' }, // Egyptian Premier League
    { id: 632, name: 'دوري روشن السعودي' }, // Saudi Pro League
    { id: 2001, name: 'الدوري الأوروبي' }, // Europa League
    { id: 2003, name: 'UEFA Conference League' },
    { id: 2004, name: 'CAF Champions League' },
    { id: 2005, name: 'CAF Confederations Cup' },
];

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

/**
 * جلب المباريات القادمة للبطولات المحددة
 * @param {number} days - عدد الأيام القادمة لجلب المباريات
 * @returns {Promise<Array>} - مصفوفة من المباريات
 */
export const fetchMatches = async (days = 7) => {
    try {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + days);

        const dateFrom = today.toISOString().split('T')[0];
        const dateTo = endDate.toISOString().split('T')[0];

        console.log(`📅 جلب المباريات من ${dateFrom} إلى ${dateTo}`);

        const requests = competitions.map(async (comp) => {
            let retries = 0;
            let lastError = null;

            while (retries < MAX_RETRIES) {
                try {
                    const response = await fetch(
                        `${API_BASE_URL}/competitions/${comp.id}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
                        {
                            method: 'GET',
                            headers: {
                                'X-Auth-Token': API_KEY,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`❌ خطأ في الشبكة: ${response.status} لبطولة ${comp.name}`);
                    }

                    const data = await response.json();

                    if (!data.matches || data.matches.length === 0) {
                        console.warn(`⚠️ لا توجد مباريات لبطولة ${comp.name}`);
                        return [];
                    }

                    // إضافة اسم البولة بالعربية لكل مباراة
                    return data.matches.map(match => ({
                        ...match,
                        competition: {
                            ...match.competition,
                            name_ar: comp.name
                        }
                    }));
                } catch (error) {
                    lastError = error;
                    retries++;
                    console.warn(`🔁 محاولة ${retries} فشلت لبطولة ${comp.name}:`, error.message);
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

/**
 * جلب معلومات فريق معين
 * @param {number} teamId - معرف الفريق
 * @returns {Promise<Object>} - بيانات الفريق
 */
export const fetchTeam = async (teamId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
            headers: {
                'X-Auth-Token': API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`خطأ في جلب بيانات الفريق: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('🚨 فشل جلب بيانات الفريق:', error);
        throw error;
    }
};

/**
 * جلب ترتيب الفرق في بطولة معينة
 * @param {number} competitionId - معرف البطولة
 * @returns {Promise<Array>} - ترتيب الفرق
 */
export const fetchStandings = async (competitionId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/standings`, {
            headers: {
                'X-Auth-Token': API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`خطأ في جلب الترتيب: ${response.status}`);
        }
        
        const data = await response.json();
        return data.standings?.[0]?.table || [];
    } catch (error) {
        console.error('🚨 فشل جلب الترتيب:', error);
        throw error;
    }
};
