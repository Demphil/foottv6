const fetchHighlights = async () => {
    try {
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        url.searchParams.append('date', new Date().toISOString().split('T')[0]);
        url.searchParams.append('limit', '10');
        url.searchParams.append('timezone', 'Africa/Casablanca');

        const response = await fetch(url, {
            headers: {
                'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
                'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
            }
        });

        const data = await response.json();
        
        // معالجة البيانات لضمان هيكل صحيح
        return (data.data || data.matches || []).map(item => ({
            homeTeam: item.homeTeam || item.home_team || 'فريق 1',
            awayTeam: item.awayTeam || item.away_team || 'فريق 2',
            embed: item.embed || item.videoUrl || '',
            competition: item.competition || item.league || ''
        }));

    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
};

export default fetchHighlights;
