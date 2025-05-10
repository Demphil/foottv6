const CACHE_KEY = "highlightsCache";
const CACHE_EXPIRY = 6 * 60 * 60 * 1000;

export async function fetchHighlightsByLeague(leagueId) {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  const now = Date.now();

  if (cache[leagueId] && now - cache[leagueId].timestamp < CACHE_EXPIRY) {
    return cache[leagueId].data;
  }

  const url = `https://football-highlights-api.p.rapidapi.com/highlights?league=${leagueId}`;

  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',  // استبدله بمفتاحك الخاص
      'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
    }
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    cache[leagueId] = {
      data,
      timestamp: now
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

    return data;
  } catch (error) {
    console.error("API Error:", error);
    return [];
  }
}
