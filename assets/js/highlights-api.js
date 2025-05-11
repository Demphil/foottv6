const fetchHighlights = async () => {
    const API_URL = 'https://football-highlights-api.p.rapidapi.com/matches';
    
    try {
        const response = await fetch(`${API_URL}?date=2025-05-10&limit=10&timezone=Africa/Casablanca`, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
                'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
            },
            mode: 'cors' // تأكد من تمكين CORS
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data || data.matches || []; // التعامل مع هياكل مختلفة للبيانات

    } catch (error) {
        console.error('Failed to fetch highlights:', error);
        // بيانات وهمية للطوارئ
        return [
            {
                id: 'fallback-1',
                homeTeam: 'النصر',
                awayTeam: 'الهلال',
                competition: 'الدوري السعودي',
                date: new Date().toISOString(),
                embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
            }
        ];
    }
};

export default fetchHighlights;
