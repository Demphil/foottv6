const API_URL = 'https://football-highlights-api.p.rapidapi.com/matches';
const API_KEY = '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438'; // ضع مفتاحك هنا

export async function fetchHighlights(date) {
    const response = await fetch(`${API_URL}?date=${date}&limit=100&timezone=Europe/London`, {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': API_KEY,
            'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
        }
    });

    if (!response.ok) {
        throw new Error('API request failed');
    }

    const data = await response.json();
    return data.results;
}
