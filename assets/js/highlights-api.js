const fetchHighlights = async () => {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
            'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
        }
    };

    try {
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        url.searchParams.append('date', '2025-05-10');
        url.searchParams.append('limit', '10');
        url.searchParams.append('timezone', 'Africa/Casablanca');

        console.log('Sending request to:', url.toString());
        
        const response = await fetch(url, options);
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('API Response Data:', data); // <-- هذا السطر سيظهر البيانات المستلمة
        
        if (!data || !Array.isArray(data)) {
            console.warn('Unexpected data structure:', data);
            return [];
        }

        return data;

    } catch (error) {
        console.error('Full API Error:', error);
        return [];
    }
};

export default fetchHighlights;
