// js/highlights-api.js
const fetchHighlights = async (league = '') => {
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-host': 'football-highlights-api.p.rapidapi.com',
            'x-rapidapi-key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438'
        }
    };

    try {
        let url = 'https://football-highlights-api.p.rapidapi.com/highlights?limit=50&timezone=Etc/UTC';
        if (league) {
            url += `&leagueName=${encodeURIComponent(league)}`;
        }

        const response = await fetch(url, options);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching highlights:', error);
        return [];
    }
};

export { fetchHighlights };
