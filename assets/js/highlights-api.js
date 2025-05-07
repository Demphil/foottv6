// js/highlights-api.js
const fetchHighlights = async (league = '') => {
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-host': 'football-highlights-api.p.rapidapi.com',
            'x-rapidapi-key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
            'Content-Type': 'application/json'
        }
    };

    try {
        // Base URL with required parameters
        let url = new URL('https://football-highlights-api.p.rapidapi.com/highlights');
        url.searchParams.append('limit', '50');
        url.searchParams.append('timezone', 'Etc/UTC');
        
        // Add league filter if specified
        if (league) {
            url.searchParams.append('leagueName', league);
        }

        const response = await fetch(url, options);
        
        // Check if response is OK
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // Check if data is valid
        if (!data || !Array.isArray(data)) {
            throw new Error('Invalid data received from API');
        }

        return data;
    } catch (error) {
        console.error('Error fetching highlights:', error);
        throw error; // Re-throw to be handled by the calling function
    }
};

export { fetchHighlights };
