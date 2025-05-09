const fetchHighlights = async (league = '') => {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
            'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
        }
    };

    try {
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        
        // المعلمات الأساسية المطلوبة
        const params = {
            date: new Date().toISOString().split('T')[0],
            limit: '10',
            timezone: 'Europe/London'
        };

        // إضافة المعلمات
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        // جرب هذه المعلمات البديلة حسب وثائق API
        if (league) {
            // جرب أحد هذه الخيارات:
         url.searchParams.append('league', league); // الخيار الأول
           // url.searchParams.append('competition', league); // الخيار الثاني
            // url.searchParams.append('comp_name', league); // الخيار الثالث
        }

        console.log('Request URL:', url.toString());
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ محتوى البيانات:", data);

        return data.matches || data || [];

    } catch (error) {
        console.error('API Error:', error);
        // بيانات وهمية للطوارئ
        return getFallbackData(league);
    }
};

// بيانات احتياطية
const getFallbackData = (league) => {
    const fallbackMatches = {
        'Champions League': [
            {
                id: 'fallback-1',
                homeTeam: 'ريال مدريد',
                awayTeam: 'مانشستر سيتي',
                competition: 'دوري الأبطال',
                date: new Date().toISOString(),
                embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
            }
        ],
        'Premier League': [
            {
                id: 'fallback-2',
                homeTeam: 'ليفربول',
                awayTeam: 'مانشستر يونايتد',
                competition: 'الدوري الإنجليزي',
                date: new Date().toISOString(),
                embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
            }
        ],
        'default': [
            {
                id: 'fallback-3',
                homeTeam: 'النصر',
                awayTeam: 'الهلال',
                competition: 'الدوري السعودي',
                date: new Date().toISOString(),
                embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
            }
        ]
    };

    return fallbackMatches[league] || fallbackMatches['default'];
};

export { fetchHighlights };
