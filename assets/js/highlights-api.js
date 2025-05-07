const fetchHighlights = async (league = '') => {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
            'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
        }
    };

    try {
        // بناء URL مع معلمات إلزامية
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        
        // المعلمات الإلزامية حسب وثائق API
        const mandatoryParams = {
            date: new Date().toISOString().split('T')[0], // تاريخ اليوم
            limit: '10'
        };

        // إضافة المعلمات الإلزامية
        Object.keys(mandatoryParams).forEach(key => {
            url.searchParams.append(key, mandatoryParams[key]);
        });

        // إضافة فلتر الدوري إذا كان موجوداً
        if (league && league.trim() !== '') {
            url.searchParams.append('competition_name', league.trim());
        }

        console.log('Request URL:', url.toString());
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        return data.matches || [];

    } catch (error) {
        console.error('API Error:', error.message);
        throw error;
    }
};

// دالة للحصول على بيانات وهمية
const getMockHighlights = (league = '') => {
    const mockData = {
        'Champions League': [
            {
                id: 'mock-1',
                title: 'Champions League Highlights',
                embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                date: new Date().toISOString(),
                competition: 'UEFA Champions League',
                homeTeam: 'Real Madrid',
                awayTeam: 'Manchester City'
            }
        ],
        'La Liga': [
            {
                id: 'mock-2',
                title: 'La Liga Highlights',
                embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                date: new Date().toISOString(),
                competition: 'La Liga',
                homeTeam: 'Barcelona',
                awayTeam: 'Real Madrid'
            }
        ],
        'default': [
            {
                id: 'mock-3',
                title: 'Latest Football Highlights',
                embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                date: new Date().toISOString(),
                competition: 'Premier League',
                homeTeam: 'Liverpool',
                awayTeam: 'Chelsea'
            }
        ]
    };

    return league ? mockData[league] || mockData.default : mockData.default;
};

export { fetchHighlights, getMockHighlights };
