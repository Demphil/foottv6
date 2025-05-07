const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const router = express.Router();

// تكوين API
const API_CONFIG = {
    KEY: '348a4368-8fcb-4e3e-ac4a-7fb6c214e22f',
    HOST: 'https://football-highlights-api.p.rapidapi.com/highlights',
    BASE_URL: 'https://football-highlights-api.p.rapidapi.com',
};

// تهيئة التخزين المؤقت (12 ساعة صلاحية)
const cache = new NodeCache({
    stdTTL: 43200,
    checkperiod: 600,
    useClones: false
});

// Middleware للتحقق من المصادقة
const authenticateRequest = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_SECRET) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح بالوصول',
            code: 'AUTH_REQUIRED'
        });
    }
    next();
};

// معالج الأخطاء المركزي
const errorHandler = (err, req, res, next) => {
    console.error('API Error:', err.stack);
    
    const statusCode = err.statusCode || 500;
    const errorCode = err.code || 'INTERNAL_ERROR';
    
    res.status(statusCode).json({
        status: 'error',
        message: err.message || 'حدث خطأ غير متوقع',
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

// مسار لجلب جميع الملخصات
router.get('/', async (req, res, next) => {
    try {
        const cacheKey = 'all_highlights';
        const cachedData = cache.get(cacheKey);
        
        if (cachedData) {
            console.log('[CACHE] Returning cached highlights');
            return res.json({
                status: 'success',
                data: cachedData,
                cached: true,
                timestamp: new Date()
            });
        }
        
        console.log('[API] Fetching fresh highlights data');
        const response = await axios.get(`${API_CONFIG.BASE_URL}/highlights`, {
            headers: {
                'X-RapidAPI-Key': API_CONFIG.KEY,
                'X-RapidAPI-Host': API_CONFIG.HOST,
                'Accept': 'application/json'
            },
            timeout: 5000
        });
        
        if (!response.data || !Array.isArray(response.data)) {
            throw new Error('Invalid API response structure');
        }
        
        // معالجة البيانات قبل التخزين
        const processedData = processHighlightsData(response.data);
        
        cache.set(cacheKey, processedData);
        console.log(`[CACHE] Stored ${processedData.length} highlights`);
        
        res.json({
            status: 'success',
            data: processedData,
            cached: false,
            timestamp: new Date()
        });
        
    } catch (error) {
        error.apiEndpoint = '/highlights';
        next(error);
    }
});

// مسار لجلب ملخصات دوري معين
router.get('/league/:leagueId', async (req, res, next) => {
    try {
        const { leagueId } = req.params;
        const cacheKey = `league_${leagueId}`;
        const cachedData = cache.get(cacheKey);
        
        if (cachedData) {
            return res.json({
                status: 'success',
                data: cachedData,
                cached: true,
                timestamp: new Date()
            });
        }
        
        const validLeagues = {
            'champions': 'Champions League',
            'premier': 'Premier League',
            'laliga': 'La Liga',
            'bundesliga': 'Bundesliga',
            'seriea': 'Serie A',
            'ligue1': 'Ligue 1',
            'saudi': 'Saudi League',
            'egypt': 'Egyptian League',
            'morocco': 'Moroccan League'
        };
        
        if (!validLeagues[leagueId]) {
            return res.status(400).json({
                status: 'error',
                message: 'الدوري المطلوب غير صحيح',
                validLeagues: Object.keys(validLeagues)
            });
        }
        
        const response = await axios.get(`${API_CONFIG.BASE_URL}/highlights/${leagueId}`, {
            headers: {
                'X-RapidAPI-Key': API_CONFIG.KEY,
                'X-RapidAPI-Host': API_CONFIG.HOST
            },
            timeout: 5000
        });
        
        const processedData = processHighlightsData(response.data);
        cache.set(cacheKey, processedData);
        
        res.json({
            status: 'success',
            data: processedData,
            cached: false,
            timestamp: new Date()
        });
        
    } catch (error) {
        error.apiEndpoint = `/highlights/league/${req.params.leagueId}`;
        next(error);
    }
});

// مسار لإحصاءات الاستخدام
router.get('/stats', authenticateRequest, (req, res) => {
    const stats = cache.getStats();
    res.json({
        status: 'success',
        data: {
            hits: stats.hits,
            misses: stats.misses,
            keys: stats.keys,
            cacheSize: cache.keys().length
        }
    });
});

// مسار لإعادة تحميل الذاكرة المؤقتة
router.post('/refresh-cache', authenticateRequest, (req, res) => {
    cache.flushAll();
    console.log('[CACHE] Cache cleared manually');
    res.json({
        status: 'success',
        message: 'تم تحديث الذاكرة المؤقتة بنجاح'
    });
});

// معالجة بيانات الملخصات
function processHighlightsData(data) {
    return data.map(item => ({
        id: item.id || generateId(),
        league: item.league || 'غير معروف',
        date: item.date || new Date().toISOString(),
        homeTeam: item.home_team || 'فريق غير معروف',
        awayTeam: item.away_team || 'فريق غير معروف',
        homeScore: item.home_score ?? 0,
        awayScore: item.away_score ?? 0,
        videoUrl: validateVideoUrl(item.video_url),
        thumbnail: item.thumbnail || getDefaultThumbnail(item.league),
        duration: formatDuration(item.duration),
        importance: calculateImportance(item)
    })).filter(item => item.videoUrl); // إزالة العناصر بدون رابط فيديو صالح
}

// دوال مساعدة
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function validateVideoUrl(url) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtube.com') || 
            parsed.hostname.includes('dailymotion.com') ||
            parsed.hostname.includes('vimeo.com')) {
            return url;
        }
        return null;
    } catch {
        return null;
    }
}

function formatDuration(duration) {
    if (!duration) return '00:00';
    if (typeof duration === 'number') {
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return duration;
}

function getDefaultThumbnail(league) {
    const leagueThumbnails = {
        'Champions League': '/assets/images/champions.jpg',
        'Premier League': '/assets/thumbnails/premier.jpg',
        'La Liga': '/assets/images/laliga.jpg',
        'Bundesliga': '/assets/images/bundesliga.jpg',
        'Serie A': '/assets/images/seriea.jpg',
        'Ligue 1': '/assets/images/ligue1.jpg'
    };
    return leagueThumbnails[league] || '/assets/images/default.jpg';
}

function calculateImportance(match) {
    let importance = 0;
    
    // زيادة الأهمية حسب الدوري
    if (match.league.includes('Champions')) importance += 3;
    else if (match.league.includes('Premier')) importance += 2;
    else importance += 1;
    
    // زيادة الأهمية حسب عدد الأهداف
    const totalGoals = (match.home_score || 0) + (match.away_score || 0);
    importance += Math.min(totalGoals, 5);
    
    return importance;
}

// تسجيل معالج الأخطاء
router.use(errorHandler);

module.exports = router;
