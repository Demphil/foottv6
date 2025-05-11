const fetchHighlights = async () => {
    try {
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        url.searchParams.append('date', new Date().toISOString().split('T')[0]);
        url.searchParams.append('limit', '10');
        url.searchParams.append('timezone', 'Africa/Casablanca');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
                'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
            },
            credentials: 'same-origin' // أو 'omit' إذا لم تكن بحاجة إلى cookies
        });

        if (!response.ok) {
            throw new Error(`خطأ في السيرفر: ${response.status}`);
        }

        const data = await response.json();
        return data.data || data.matches || [];
        
    } catch (error) {
        console.error('فشل في جلب البيانات:', error);
        return [];
    }
};

export default fetchHighlights;
