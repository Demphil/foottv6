const fetchHighlights = async (league = '') => {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
            'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
        }
    };

    try {
        // استخدام النقطة النهائية الصحيحة حسب وثائق API
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        url.searchParams.append('limit', '50');
        url.searchParams.append('timezone', 'Europe/London');
        
        if (league) {
            url.searchParams.append('competition', league);
        }

        console.log('Requesting URL:', url.toString());
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Details:', errorData);
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('API Response Data:', data);
        
        // تعديل هذا حسب هيكل الاستجابة الفعلي للAPI
        if (!data || !Array.isArray(data)) {
            throw new Error('Invalid data structure received from API');
        }

        return data;
    } catch (error) {
        console.error('Full API Error:', error);
        throw new Error(`Failed to fetch highlights: ${error.message}`);
    }
};

export { fetchHighlights };
