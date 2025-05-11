const fetchHighlights = async () => {
    const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
    url.searchParams.append('date', '2025-05-10');
    url.searchParams.append('limit', '10');
    url.searchParams.append('timezone', 'Africa/Casablanca');

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
                'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`خطأ في السيرفر: ${response.status}`);
        }

        const data = await response.json();
        return data.data || data.matches || [];
        
    } catch (error) {
        console.error('فشل جلب البيانات:', error);
        // بيانات تجريبية للطوارئ
        return [{
            homeTeam: 'النصر',
            awayTeam: 'الهلال',
            competition: 'الدوري السعودي',
            embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
        }];
    }
};

export default fetchHighlights;
