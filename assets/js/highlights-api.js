const fetchHighlights = async () => {
    try {
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        
        url.searchParams.append('date', formattedDate);
        url.searchParams.append('limit', '10');
        url.searchParams.append('timezone', 'Africa/Casablanca');

        const response = await fetch(url, {
            headers: {
                'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
                'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // تحسين معالجة البيانات مع تسجيل أكثر تفصيلاً
        console.log('API Response:', data);
        
        const matches = data.data || data.matches || [];
        
        return matches.map(item => {
            const processedItem = {
                homeTeam: item.homeTeam || item.home_team || 'فريق 1',
                awayTeam: item.awayTeam || item.away_team || 'فريق 2',
                embed: item.embed || item.videoUrl || '',
                competition: item.competition || item.league || ''
            };
            
            console.log('Processed Match:', processedItem);
            return processedItem;
        });

    } catch (error) {
        console.error('API Error Details:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        return [];
    }
};

export default fetchHighlights;
