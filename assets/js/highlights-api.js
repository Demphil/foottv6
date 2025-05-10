const fetchHighlights = async (date = '2025-05-8') => {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
            'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
        }
    };

    try {
        // بناء URL صحيح بدون معلمة league
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        url.searchParams.append('date', date);
        url.searchParams.append('limit', '20');
        url.searchParams.append('timezone', 'Africa/Casablanca');

        console.log('Request URL:', url.toString());
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        
        // التحقق من هيكل البيانات
        if (!data || !Array.isArray(data)) {
            console.warn('Unexpected API response structure:', data);
            return getFallbackData();
        }

        return data;

    } catch (error) {
        console.error('API Error:', error);
        return getFallbackData();
    }
};

// بيانات وهمية للطوارئ
const getFallbackData = () => {
    return [
        {
            id: 'mock-1',
            homeTeam: 'الرجاء الرياضي',
            awayTeam: 'الوداد البيضاوي',
            competition: 'البطولة المغربية',
            date: '2025-05-10T19:00:00Z',
            embed: 'https://www.youtube.com/embed/example1'
        },
        {
            id: 'mock-2',
            homeTeam: 'النصر',
            awayTeam: 'الهلال',
            competition: 'الدوري السعودي',
            date: '2025-05-10T21:00:00Z',
            embed: 'https://www.youtube.com/embed/example2'
        }
    ];
};

export { fetchHighlights };
