const fetchHighlights = async (league = '') => {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
            'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
        }
    };

    try {
        // بناء URL حسب الوثائق الرسمية للAPI
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        
        // المعلمات الأساسية المطلوبة
        const params = {
            date: new Date().toISOString().split('T')[0], // تاريخ اليوم
            limit: '10',
            timezone: 'Europe/London'
        };

        // إضافة المعلمات
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        // المعلمة الصحيحة حسب الوثائق (قد تكون league_name بدلاً من competition)
        if (league) {
            url.searchParams.append('league_name', league); // جرب أيضاً competition_name أو league
        }

        console.log('Request URL:', url.toString());
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Details:', errorData);
            throw new Error(`API Error: ${errorData.message || response.status}`);
        }

        const data = await response.json();
        
        // التحقق من هيكل البيانات المتوقع
        if (!data || !Array.isArray(data)) {
            console.warn('Unexpected API response structure:', data);
            return getFallbackData(league);
        }

        return data;

    } catch (error) {
        console.error('API Request Failed:', error);
        return getFallbackData(league);
    }
};

// بيانات احتياطية
const getFallbackData = (league) => {
    const leagues = {
        'Champions League': {
            homeTeam: 'ريال مدريد',
            awayTeam: 'مانشستر سيتي',
            competition: 'دوري الأبطال'
        },
        'La Liga': {
            homeTeam: 'برشلونة',
            awayTeam: 'ريال مدريد',
            competition: 'لاليغا'
        },
        'default': {
            homeTeam: 'النصر',
            awayTeam: 'الهلال',
            competition: 'الدوري السعودي'
        }
    };
    
    const match = leagues[league] || leagues['default'];
    
    return [{
        id: 'fallback-' + Math.random().toString(36).substr(2, 9),
        ...match,
        date: new Date().toISOString(),
        embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    }];
};

export { fetchHighlights };
