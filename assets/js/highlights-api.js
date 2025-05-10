const fetchHighlights = async (date = '2025-05-10') => {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
            'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
        }
    };

    try {
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        url.searchParams.append('date', date);
        url.searchParams.append('limit', '20');
        url.searchParams.append('timezone', 'Africa/Casablanca');

        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP Error: ${response.status}`);
        }

        const result = await response.json();
        
        // التعامل مع الهيكل الجديد للبيانات
        const matches = result.data || result.matches || result;
        
        if (!matches || !Array.isArray(matches)) {
            console.warn('Unexpected API response structure:', result);
            return getFallbackData();
        }

        return matches.map(match => ({
            id: match.id || match.matchId,
            homeTeam: match.homeTeam || match.home_team,
            awayTeam: match.awayTeam || match.away_team,
            competition: match.competition || match.league,
            date: match.date || match.matchDate,
            embed: match.embed || match.videoUrl
        }));

    } catch (error) {
        console.error('API Error:', error);
        return getFallbackData();
    }
};
