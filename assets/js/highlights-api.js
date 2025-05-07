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
        url.searchParams.append('date', new Date().toISOString().split('T')[0]);
        url.searchParams.append('limit', '10');
        
        // التعديل هنا - استخدام المعلمة الصحيحة
        if (league) {
            url.searchParams.append('competition', league); // لاحظ التهجئة الصحيحة
        }

        console.log('Request URL:', url.toString());
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Details:', errorData);
            throw new Error(`API Error: ${response.status}`);
        }

        return await response.json();
        
    } catch (error) {
        console.error('API Request Failed:', error);
        // بيانات وهمية للطوارئ
        return [{
            id: 'fallback1',
            homeTeam: 'النصر',
            awayTeam: 'الهلال',
            competition: 'الدوري السعودي',
            date: new Date().toISOString(),
            embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
        }];
    }
};

export { fetchHighlights };
