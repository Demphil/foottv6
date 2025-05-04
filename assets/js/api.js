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

// دالة لتحديد القنوات الافتراضية حسب الدوري
function getDefaultChannels(leagueId) {
    const channelsMap = {
        2: ['bein SPORTS HD1', 'bein SPORTS HD2'],
        39: ['bein SPORTS HD3', 'SSC 1'],
        140: ['bein SPORTS HD1', 'Abu Dhabi Sports'],
        135: ['bein SPORTS HD2', 'SSC 2'],
        61: ['bein SPORTS HD3', 'On Time Sports'],
        78: ['bein SPORTS HD1', 'ZDF'],
        307: ['Arryadia', 'Al Aoula'],
        308: ['bein SPORTS HD4', 'Arryadia'],
        309: ['Al Aoula', 'Arryadia']
    };
    return channelsMap[leagueId] || ['غير معروف'];
}

export const fetchMatches = async () => {
    try {
        const today = new Date();
        const dayKey = today.toISOString().split('T')[0];
        const cachedData = localStorage.getItem('matches');
        const cachedDate = localStorage.getItem('matchesDate');

        // ✅ إذا كانت البيانات مخزنة لنفس اليوم، نعيدها مباشرة
        if (cachedData && cachedDate === dayKey) {
            console.log('📦 تم تحميل المباريات من التخزين المحلي');
            return JSON.parse(cachedData);
        }

        // ⬇️ تحميل البيانات من الملف الثابت
        const response = await fetch('/data/matches.json');
        if (!response.ok) throw new Error('فشل تحميل البيانات من matches.json');

        const rawData = await response.json();

        // ✅ تنسيق البيانات بنفس الشكل القديم
        const allMatches = rawData.map(match => {
            const league = leagues.find(l => l.id === match.league.id);
            return {
                ...match,
                league: {
                    ...match.league,
                    name_ar: league ? league.name : match.league.name
                },
                tv_channels: getDefaultChannels(match.league.id)
            };
        });

        console.log(`✅ تم تحميل ${allMatches.length} مباراة من matches.json`);

        // ✅ حفظ في التخزين المحلي
        localStorage.setItem('matches', JSON.stringify(allMatches));
        localStorage.setItem('matchesDate', dayKey);

        return allMatches;

    } catch (error) {
        console.error('🚨 فشل تحميل المباريات:', error);
        throw new Error('تعذر تحميل المباريات حالياً، المرجو المحاولة لاحقاً.');
    }
};
