import { fetchHighlights } from './highlights-api.js';

const API_URL = 'https://football-highlights-api.p.rapidapi.com/matches';


const TARGET_COMPETITIONS = [
    'Premier League',
    'La Liga',
    'Serie A',
    'Ligue 1',
    'UEFA Champions League',
    'UEFA Europa Conference League'
];

export async function fetchHighlights() {
    const date = new Date().toISOString().split('T')[0]; // اليوم الحالي بصيغة yyyy-mm-dd
    const url = `${API_URL}?date=${date}&limit=50&timezone=Europe/London`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': API_KEY,
                'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }

        const data = await response.json();

        // فلترة البطولات المرغوبة فقط
        const filtered = data.matches.filter(match =>
            TARGET_COMPETITIONS.includes(match.competition)
        );

        // تحويل البيانات إلى الشكل المطلوب
        return filtered.map(match => ({
            homeTeam: match.home,
            awayTeam: match.away,
            competition: match.competition,
            date: match.date,
            embed: match.embed
        }));

    } catch (error) {
        console.error("API Error:", error);
        return [];
    }
}
