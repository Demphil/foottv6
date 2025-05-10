const API_URL = 'https://football-highlights-api.p.rapidapi.com/matches';
const API_KEY = '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf43'; // ضع مفتاحك هنا
const API_HOST = 'football-highlights-api.p.rapidapi.com';

export async function fetchHighlights(startDate, endDate) {
  const url = `${API_URL}?from=${startDate}&to=${endDate}&limit=100&timezone=Europe/London`;

  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': API_KEY,
      'X-RapidAPI-Host': API_HOST,
    }
  };

  const res = await fetch(url, options);
  if (!res.ok) throw new Error('API request failed');

  return await res.json();
}
