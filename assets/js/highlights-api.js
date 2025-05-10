const fetchHighlights = async (league = '2, 39, 140, 3, 200, 307, 61, 78, 135, 848, 233', date = '2025-05-09') => {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
            'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
        }
    };

    try {
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        
        // المعلمات الأساسية
        const params = {
            date: date || getCurrentWeekDates(), // تاريخ الأسبوع الحالي
            limit: '20', // زيادة العدد ليشمل أسبوع كامل
            timezone: 'Africa/Casablanca' // التوقيت المغربي
        };

        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        // المعلمة الصحيحة حسب وثائق API (جربت league_name بدلاً من league)
        if (league) {
            url.searchParams.append('league', league); // التعديل هنا
        }

        console.log('Request URL:', url.toString());
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP Error: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('API Error:', error);
        return getFallbackData(league);
    }
};

// دالة للحصول على تواريخ الأسبوع الحالي
function getCurrentWeekDates() {
    const now = new Date();
    const start = new Date(now.setDate(now.getDate() - now.getDay())); // بداية الأسبوع
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // نهاية الأسبوع
    
    return `${start.toISOString().split('T')[0]},${end.toISOString().split('T')[0]}`;
}

// بيانات وهمية للطوارئ
const getFallbackData = (league) => {
    const leagues = {
        'Champions League': [
            {
                id: 'fallback-1',
                homeTeam: 'الوداد البيضاوي',
                awayTeam: 'الرجاء الرياضي',
                competition: 'دوري الأبطال',
                date: '2025-05-10T19:00:00Z',
                embed: 'https://www.youtube.com/embed/example1'
            }
        ],
        'default': [
            {
                id: 'fallback-2',
                homeTeam: 'النصر',
                awayTeam: 'الهلال',
                competition: 'الدوري السعودي',
                date: '2025-05-10T21:00:00Z',
                embed: 'https://www.youtube.com/embed/example2'
            }
        ]
    };
    
    return leagues[league] || leagues['default'];
};

export { fetchHighlights };
