// scripts/generate-matches.js

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// إعداد بيانات API
const API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556';
const API_URL = 'https://api-football-v1.p.rapidapi.com/v3/fixtures?date=' + new Date().toISOString().split('T')[0];

const allowedLeagues = [
    39,   // الدوري الإنجليزي الممتاز
    140,  // الدوري الإسباني
    78,   // الدوري الألماني
    135,  // الدوري الإيطالي
    61,   // الدوري الفرنسي
    200,  // دوري أبطال أوروبا
    253,  // الدوري المغربي
    307,  // الدوري السعودي
    203,  // دوري أبطال أفريقيا
    212,  // دوري أبطال آسيا
];

async function fetchMatches() {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
                'x-rapidapi-key': API_KEY
            }
        });

        const allMatches = response.data.response || [];

        const filteredMatches = allMatches.filter(match =>
            allowedLeagues.includes(match.league.id)
        );

        const outputPath = path.join(__dirname, '../data/matches.json');
        fs.writeFileSync(outputPath, JSON.stringify(filteredMatches, null, 2), 'utf8');

        console.log(`✅ تم تحديث ${filteredMatches.length} مباراة بنجاح!`);
    } catch (error) {
        console.error('❌ خطأ أثناء جلب المباريات:', error.message);
    }
}

fetchMatches();
