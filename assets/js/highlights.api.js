const express = require('express');
const axios = require('axios');
const router = express.Router();
const NodeCache = require('node-cache');

const API_KEY = '348a4368-8fcb-4e3e-ac4a-7fb6c214e22f';
const API_HOST = 'football-highlights-api.p.rapidapi.com';

// إنشاء مخزن مؤقت مع صلاحية 12 ساعة (تحديث مرتين يوميًا)
const cache = new NodeCache({ stdTTL: 43200, checkperiod: 3600 });

// مسار لجلب جميع الملخصات مع التخزين المؤقت
router.get('/highlights', async (req, res) => {
    try {
        const cacheKey = 'all_highlights';
        const cachedData = cache.get(cacheKey);
        
        // إذا كانت البيانات موجودة في الذاكرة المؤقتة
        if (cachedData) {
            console.log('Returning cached data for all highlights');
            return res.json(cachedData);
        }
        
        // جلب البيانات من API الخارجية
        const response = await axios.get(`https://${API_HOST}/highlights`, {
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': API_HOST
            }
        });
        
        // تخزين البيانات في الذاكرة المؤقتة
        cache.set(cacheKey, response.data);
        console.log('Fetched fresh data for all highlights');
        
        res.json(response.data);
    } catch (error) {
        console.error('API Error:', error);
        
        // محاولة إرجاع بيانات قديمة إذا كانت متاحة
        const cachedData = cache.get('all_highlights');
        if (cachedData) {
            console.log('Returning stale cached data due to API error');
            return res.json(cachedData);
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch highlights',
            details: error.message
        });
    }
});

// مسار لجلب ملخصات دوري معين مع التخزين المؤقت
router.get('/highlights/:league', async (req, res) => {
    try {
        const league = req.params.league;
        const cacheKey = `league_${league}`;
        const cachedData = cache.get(cacheKey);
        
        // إذا كانت البيانات موجودة في الذاكرة المؤقتة
        if (cachedData) {
            console.log(`Returning cached data for ${league} league`);
            return res.json(cachedData);
        }
        
        // جلب البيانات من API الخارجية
        const response = await axios.get(`https://${API_HOST}/highlights/${league}`, {
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': API_HOST
            }
        });
        
        // تخزين البيانات في الذاكرة المؤقتة
        cache.set(cacheKey, response.data);
        console.log(`Fetched fresh data for ${league} league`);
        
        res.json(response.data);
    } catch (error) {
        console.error('API Error:', error);
        
        // محاولة إرجاع بيانات قديمة إذا كانت متاحة
        const cachedData = cache.get(`league_${req.params.league}`);
        if (cachedData) {
            console.log('Returning stale cached data due to API error');
            return res.json(cachedData);
        }
        
        res.status(500).json({ 
            error: `Failed to fetch ${req.params.league} highlights`,
            details: error.message
        });
    }
});

// مسار لإعادة تحميل البيانات يدويًا (للاستخدام الداخلي فقط)
router.post('/refresh-cache', (req, res) => {
    if (req.headers['x-admin-key'] !== 'YOUR_SECRET_ADMIN_KEY') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    cache.flushAll();
    console.log('Cache has been cleared manually');
    res.json({ message: 'Cache refreshed successfully' });
});

module.exports = router;
