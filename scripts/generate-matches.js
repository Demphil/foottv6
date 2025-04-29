// scripts/generate-matches.js

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556'; // مفتاحك
const API_URL = 'https://api-football-v1.p.rapidapi.com/v2/fixtures/date/'; // API الأساسي
const TODAY = new Date().toISOString().split('T')[0]; // تاريخ اليوم YYYY-MM-DD
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'matches.json');

// إعداد الدوريات التي نريدها فقط
const allowedLeagues = [
    39,   // الدوري الإنجليزي
    140,  // الدوري الإسباني
    135,  // الدوري الإيطالي
    78,   // الدوري الألماني
    61,   // الدوري الفرنسي
    258,  // الدوري المغربي
    307,  // الدوري السعودي
    100,  // دوري أبطال أفريقيا
    255,  // دوري أبطال آسيا
];

async function fetchMatches() {
    try {
        const response = await axios.get(`${API_URL}${TODAY}`, {
            headers: {
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
                'x-rapidapi-key': API_KEY,
            }
        });

        const matches = response.data.api.fixtures.filter(fixture =>
            allowedLeagues.includes(fixture.league_id)
        );

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(matches, null, 2), 'utf-8');
        console.log(`تم حفظ ${matches.length} مباراة في matches.json`);
    } catch (error) {
        console.error('حدث خطأ أثناء جلب المباريات:', error.message);
    }
}

fetchMatches();
