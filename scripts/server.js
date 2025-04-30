const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const CACHE_FILE = path.join(__dirname, '../data/matches.json');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 ساعة

// تحميل الكاش من الملف
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  }
  return { data: null, timestamp: 0 };
}

// حفظ الكاش في الملف
function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// تحميل الكاش عند بداية التشغيل
let cache = loadCache();

app.get('/top-matches', async (req, res) => {
  const now = Date.now();

  // رجع الكاش إذا مازال صالح
  if (cache.data && (now - cache.timestamp < CACHE_DURATION)) {
    console.log('✅ من الكاش');
    return res.json(cache.data);
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd

    const response = await axios.get(`https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}`, {
      headers: { 'X-Auth-Token': 'YOUR_API_TOKEN' } // ← ضع توكينك هنا
    });

    // الدوريات المهمة (أضف أو حدف حسب حاجتك)
    const topLeagues = [
      2001, // UEFA Champions League
      2021, // Premier League
      2014, // La Liga
      2019, // Serie A
      2015, // Ligue 1
      2002, // Bundesliga
      253,  // الدوري السعودي
      2000, // دوري أبطال إفريقيا
      2125  // الدوري المغربي
    ];

    const filteredMatches = response.data.matches.filter(match =>
      topLeagues.includes(match.competition.id)
    );

    cache = {
      data: { matches: filteredMatches },
      timestamp: now
    };

    saveCache(cache);
    console.log('📥 تم التحديث من API');
    res.json(cache.data);
  } catch (err) {
    console.error('❌ خطأ في جلب البيانات:', err.message);
    res.status(500).send('خطأ في جلب البيانات من API');
  }
});

app.listen(PORT, () => {
  console.log(`✅ الخادم شغال على http://localhost:${PORT}`);
});
