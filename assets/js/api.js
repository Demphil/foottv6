// assets/js/api.js

const API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556';
const API_HOST = 'api-football-v1.p.rapidapi.com';
const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v2';

async function fetchMatches() {
    try {
        const response = await fetch(`${BASE_URL}/odds/league/865927/bookmaker/5?page=2`, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': API_HOST,
                'x-rapidapi-key': API_KEY
            }
        });

        const data = await response.json();
        return data.api.odds; // تأكد من هيكل البيانات بناءً على استجابة الـ API
    } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        return [];
    }
}
