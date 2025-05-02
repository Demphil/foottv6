// assets/js/watch.js

/**
 * =============================================
 *                  تهيئة النظام
 * =============================================
 */

// إعدادات النظام
const STREAM_CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000,
    QUALITY_CHECK_INTERVAL: 30000,
    AUTO_REFRESH_INTERVAL: 3600000 // كل ساعة
};

// حالة النظام
let systemState = {
    currentStream: null,
    retryCount: 0,
    connectionSpeed: null,
    userCountry: null,
    isFullscreen: false,
    activeQuality: 'auto'
};

/**
 * =============================================
 *              الوظائف الأساسية
 * =============================================
 */

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing Watch Page...');
    
    try {
        // 1. كشف بلد المستخدم
        systemState.userCountry = await detectUserCountry();
        
        // 2. تحميل بيانات المباراة
        const matchId = getMatchIdFromURL();
        if (!matchId) throw new Error('No match ID provided');
        
        const matchData = await loadMatchData(matchId);
        if (!matchData) throw new Error('Failed to load match data');
        
        // 3. تهيئة مشغل الفيديو
        await initializeVideoPlayer(matchData);
        
        // 4. بدء مراقبة الجودة
        startQualityMonitor();
        
        // 5. إعداد واجهة المستخدم
        setupUI();
        
        console.log('System initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showFatalError(error.message);
    }
});

/**
 * =============================================
 *             إدارة بيانات المباراة
 * =============================================
 */

async function loadMatchData(matchId) {
    console.log(`Loading data for match: ${matchId}`);
    
    try {
        // 1. المحاولة الأولى: جلب البيانات من API
        let matchData = await fetchMatchData(matchId);
        
        // 2. المحاولة الثانية: البيانات المحلية
        if (!matchData) {
            matchData = findLocalMatchData(matchId);
        }
        
        if (!matchData) {
            throw new Error('Match data not available');
        }
        
        // 3. تحديث واجهة المستخدم
        updateMatchUI(matchData);
        
        return matchData;
    } catch (error) {
        console.error('Error loading match data:', error);
        throw error;
    }
}

async function fetchMatchData(matchId) {
    try {
        const response = await fetch(`/api/matches/${matchId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('Failed to fetch match data:', error);
        return null;
    }
}

function findLocalMatchData(matchId) {
    if (!window.matchesData) return null;
    return window.matchesData.find(match => match.id === matchId);
}

function updateMatchUI(matchData) {
    // تحديث معلومات الفريقين
    document.getElementById('home-team-name').textContent = matchData.home_team.name;
    document.getElementById('away-team-name').textContent = matchData.away_team.name;
    
    // تحديث الشعارات
    document.getElementById('home-team-logo').src = matchData.home_team.logo || 'assets/images/default-team.png';
    document.getElementById('away-team-logo').src = matchData.away_team.logo || 'assets/images/default-team.png';
    
    // تحديث معلومات المباراة
    document.getElementById('match-league').textContent = matchData.league.name;
    document.getElementById('match-time').textContent = formatMatchTime(matchData.time);
}

/**
 * =============================================
 *             إدارة مشغل الفيديو
 * =============================================
 */

async function initializeVideoPlayer(matchData) {
    console.log('Initializing video player...');
    
    try {
        // 1. تحديد قناة البث
        const broadcastChannel = matchData.broadcast.channel;
        const streamType = matchData.broadcast.type; // 'official', 'backup', 'restricted'
        
        // 2. الحصول على مصادر البث
        const streamSources = getStreamSources(broadcastChannel, streamType);
        if (!streamSources.length) throw new Error('No available stream sources');
        
        // 3. بدء تشغيل البث
        systemState.currentStream = {
            channel: broadcastChannel,
            sources: streamSources,
            currentSourceIndex: 0
        };
        
        await playCurrentStream();
        
        // 4. إعداد التحديث التلقائي
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                refreshStream();
            }
        }, STREAM_CONFIG.AUTO_REFRESH_INTERVAL);
        
    } catch (error) {
        console.error('Failed to initialize video player:', error);
        throw error;
    }
}

async function playCurrentStream() {
    const currentSource = systemState.currentStream.sources[systemState.currentStream.currentSourceIndex];
    
    try {
        // 1. التحقق من توفر المصدر
        await checkStreamAvailability(currentSource.url);
        
        // 2. تحميل مشغل الفيديو المناسب
        loadVideoPlayer(currentSource);
        
        // 3. تحديث واجهة المستخدم
        updateStreamInfo(currentSource);
        
        // 4. إعادة تعيين عداد المحاولات
        systemState.retryCount = 0;
        
    } catch (error) {
        console.error('Stream error:', error);
        handleStreamError();
    }
}

function loadVideoPlayer(source) {
    const videoContainer = document.getElementById('video-container');
    
    // مسح أي مشغل سابق
    videoContainer.innerHTML = '';
    
    // تحديد نوع المشغل المناسب
    if (source.type === 'embed') {
        videoContainer.innerHTML = `
            <iframe src="${source.url}" 
                    frameborder="0" 
                    allowfullscreen
                    allow="autoplay; encrypted-media">
            </iframe>`;
    } 
    else if (source.type === 'hls') {
        videoContainer.innerHTML = `
            <video id="hls-player" controls autoplay>
                <source src="${source.url}" type="application/x-mpegURL">
            </video>`;
        initializeHLSPlayer(source.url);
    }
    else {
        videoContainer.innerHTML = `
            <video controls autoplay>
                <source src="${source.url}" type="video/mp4">
            </video>`;
    }
}

function initializeHLSPlayer(url) {
    if (typeof Hls === 'undefined') return;
    
    const video = document.getElementById('hls-player');
    const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5
    });
    
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, function(event, data) {
        if (data.fatal) {
            handleStreamError();
        }
    });
}

/**
 * =============================================
 *             إدارة مصادر البث
 * =============================================
 */

function getStreamSources(channel, streamType) {
    // مصادر البث الافتراضية
    const defaultSources = [
        {
            type: 'embed',
            url: `/assets/streams/${channel}.html`,
            quality: 'auto',
            isOfficial: true
        },
        {
            type: 'hls',
            url: `https://cdn.example.com/streams/${channel}/index.m3u8`,
            quality: '1080p',
            isOfficial: false
        }
    ];
    
    // تصفية المصادر حسب النوع والجودة
    return defaultSources.filter(source => {
        // إذا كان البث رسميًا وتم طلب نوع رسمي
        if (streamType === 'official' && !source.isOfficial) return false;
        
        // إذا كان البث مقيدًا جغرافيًا
        if (source.geoRestricted && !source.allowedCountries.includes(systemState.userCountry)) {
            return false;
        }
        
        return true;
    });
}

async function checkStreamAvailability(url) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject('Timeout'), 5000);
        
        fetch(url, { method: 'HEAD' })
            .then(response => {
                clearTimeout(timeout);
                response.ok ? resolve() : reject('Stream not available');
            })
            .catch(() => {
                clearTimeout(timeout);
                reject('Connection failed');
            });
    });
}

function handleStreamError() {
    systemState.retryCount++;
    
    if (systemState.retryCount <= STREAM_CONFIG.MAX_RETRIES) {
        // الانتقال إلى المصدر التالي
        systemState.currentStream.currentSourceIndex = 
            (systemState.currentStream.currentSourceIndex + 1) % systemState.currentStream.sources.length;
        
        // إعادة المحاولة بعد تأخير
        setTimeout(() => playCurrentStream(), STREAM_CONFIG.RETRY_DELAY);
    } else {
        showStreamError('تعذر الاتصال بمصادر البث المتاحة');
    }
}

function refreshStream() {
    console.log('Refreshing stream...');
    systemState.currentStream.currentSourceIndex = 0;
    playCurrentStream();
}

/**
 * =============================================
 *             إدارة جودة البث
 * =============================================
 */

function startQualityMonitor() {
    // 1. كشف سرعة الاتصال
    detectConnectionSpeed()
        .then(speed => {
            systemState.connectionSpeed = speed;
            adjustQualityBasedOnSpeed(speed);
        });
    
    // 2. مراقبة الجودة بشكل دوري
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            checkCurrentQuality();
        }
    }, STREAM_CONFIG.QUALITY_CHECK_INTERVAL);
}

async function detectConnectionSpeed() {
    return new Promise(resolve => {
        const testUrl = 'https://example.com/speed-test?size=100';
        const startTime = Date.now();
        
        fetch(testUrl)
            .then(() => {
                const duration = (Date.now() - startTime) / 1000;
                const speed = 100 / duration; // KB/s
                resolve(speed);
            })
            .catch(() => resolve(1)); // سرعة افتراضية إذا فشل الاختبار
    });
}

function adjustQualityBasedOnSpeed(speed) {
    let quality;
    
    if (speed > 5) quality = '1080p';
    else if (speed > 2) quality = '720p';
    else quality = '480p';
    
    if (quality !== systemState.activeQuality) {
        systemState.activeQuality = quality;
        applyQualitySettings(quality);
    }
}

function applyQualitySettings(quality) {
    console.log(`Applying quality settings: ${quality}`);
    // هنا يمكنك تطبيق إعدادات الجودة على مشغل الفيديو
    // مثلاً تغيير رابط البث أو تعديل إعدادات HLS
}

function checkCurrentQuality() {
    const videoElement = document.querySelector('video');
    if (!videoElement) return;
    
    // كشف معدل الإطارات الحالي
    const fps = calculateCurrentFPS(videoElement);
    
    // إذا كان معدل الإطارات منخفضاً، خفض الجودة
    if (fps < 24 && systemState.activeQuality !== '480p') {
        adjustQualityBasedOnSpeed(1); // فرض جودة منخفضة
    }
}

function calculateCurrentFPS(video) {
    let lastTime = performance.now();
    let lastFrame = video.currentTime;
    let fps = 0;
    
    function checkFPS() {
        const now = performance.now();
        const delta = (now - lastTime) / 1000;
        const frameDelta = video.currentTime - lastFrame;
        
        if (delta >= 0.5 && frameDelta > 0) {
            fps = frameDelta / delta;
            lastTime = now;
            lastFrame = video.currentTime;
        }
        
        return fps;
    }
    
    return checkFPS();
}

/**
 * =============================================
 *             إدارة واجهة المستخدم
 * =============================================
 */

function setupUI() {
    // أزرار التحكم
    document.getElementById('quality-btn').addEventListener('click', toggleQualityMenu);
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    document.getElementById('refresh-btn').addEventListener('click', refreshStream);
    
    // إدارة وضع ملء الشاشة
    document.addEventListener('fullscreenchange', () => {
        systemState.isFullscreen = !!document.fullscreenElement;
    });
}

function updateStreamInfo(source) {
    document.getElementById('channel-name').textContent = source.channelName || systemState.currentStream.channel;
    document.getElementById('stream-quality').textContent = systemState.activeQuality.toUpperCase();
    document.getElementById('stream-status').textContent = 'مباشر';
}

function toggleQualityMenu() {
    const menu = document.getElementById('quality-menu');
    menu.classList.toggle('active');
    
    if (menu.classList.contains('active')) {
        renderQualityOptions();
    }
}

function renderQualityOptions() {
    const qualities = ['auto', '1080p', '720p', '480p'];
    const container = document.getElementById('quality-options');
    
    container.innerHTML = qualities.map(quality => `
        <div class="quality-option ${quality === systemState.activeQuality ? 'active' : ''}" 
             data-quality="${quality}">
            ${quality.toUpperCase()}
        </div>
    `).join('');
    
    // إضافة مستمعي الأحداث
    document.querySelectorAll('.quality-option').forEach(option => {
        option.addEventListener('click', () => {
            systemState.activeQuality = option.dataset.quality;
            applyQualitySettings(systemState.activeQuality);
            document.getElementById('stream-quality').textContent = systemState.activeQuality.toUpperCase();
            document.getElementById('quality-menu').classList.remove('active');
        });
    });
}

function toggleFullscreen() {
    const videoContainer = document.getElementById('video-container');
    
    if (!systemState.isFullscreen) {
        videoContainer.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

/**
 * =============================================
 *             معالجة الأخطاء
 * =============================================
 */

function showStreamError(message) {
    const videoContainer = document.getElementById('video-container');
    videoContainer.innerHTML = `
        <div class="stream-error">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>خطأ في البث</h3>
            <p>${message}</p>
            <div class="error-actions">
                <button id="retry-stream" class="error-btn">
                    <i class="fas fa-sync-alt"></i> إعادة المحاولة
                </button>
                <button id="report-problem" class="error-btn">
                    <i class="fas fa-flag"></i> الإبلاغ عن مشكلة
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('retry-stream').addEventListener('click', refreshStream);
    document.getElementById('report-problem').addEventListener('click', reportProblem);
}

function showFatalError(message) {
    const mainContent = document.querySelector('main');
    mainContent.innerHTML = `
        <div class="fatal-error">
            <i class="fas fa-times-circle"></i>
            <h3>خطأ فادح</h3>
            <p>${message}</p>
            <a href="/matches.html" class="back-btn">
                <i class="fas fa-arrow-left"></i> العودة إلى المباريات
            </a>
        </div>
    `;
}

function reportProblem() {
    console.log('Problem reported');
    // هنا يمكنك إضافة كود الإبلاغ عن المشاكل
}

/**
 * =============================================
 *             أدوات مساعدة
 * =============================================
 */

function getMatchIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function formatMatchTime(time) {
    // تنسيق وقت المباراة
    return time || '--:--';
}

async function detectUserCountry() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return data.country_code || 'SA'; // Default to Saudi Arabia
    } catch (error) {
        console.error('Failed to detect country:', error);
        return 'SA';
    }
}

// كشف الأخطاء غير المعالجة
window.addEventListener('error', function(event) {
    console.error('Unhandled error:', event.error);
    showFatalError('حدث خطأ غير متوقع في النظام');
});
