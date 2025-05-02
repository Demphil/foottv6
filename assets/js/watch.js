// assets/js/watch.js

/**
 * =============================================
 *               إعدادات النظام
 * =============================================
 */
const CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000,
    STREAM_TIMEOUT: 10000,
    HEALTH_CHECK_INTERVAL: 30000
};

/**
 * =============================================
 *               حالة النظام
 * =============================================
 */
let systemState = {
    currentMatch: null,
    currentStream: null,
    retryCount: 0,
    isFullscreen: false,
    streamHealth: 'loading',
    quality: 'auto'
};

/**
 * =============================================
 *             تهيئة الصفحة الرئيسية
 * =============================================
 */
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 1. الحصول على معرف المباراة من URL
        const matchId = getMatchIdFromURL();
        if (!matchId) throw new Error('لم يتم تحديد مباراة للمشاهدة');
        
        // 2. تحميل بيانات المباراة
        systemState.currentMatch = await loadMatchData(matchId);
        if (!systemState.currentMatch) throw new Error('تعذر تحميل بيانات المباراة');
        
        // 3. عرض بيانات المباراة
        displayMatchInfo(systemState.currentMatch);
        
        // 4. تهيئة مشغل الفيديو
        await initializeVideoPlayer();
        
        // 5. إعداد واجهة المستخدم
        setupUI();
        
        console.log('تم تهيئة الصفحة بنجاح');
    } catch (error) {
        console.error('خطأ في التهيئة:', error);
        showErrorPage(error.message);
    }
});

/**
 * =============================================
 *             إدارة بيانات المباراة
 * =============================================
 */
function getMatchIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadMatchData(matchId) {
    try {
        // 1. المحاولة الأولى: جلب البيانات من API
        const response = await fetch(`/api/matches/${matchId}`);
        if (!response.ok) throw new Error('فشل في جلب البيانات');
        
        const data = await response.json();
        if (!data.broadcast?.channel) throw new Error('لا يوجد معلومات بث لهذه المباراة');
        
        return data;
        
    } catch (error) {
        console.error('Error loading match data:', error);
        throw error;
    }
}

function displayMatchInfo(match) {
    // عرض معلومات الفريقين
    document.getElementById('home-team-name').textContent = match.home_team.name;
    document.getElementById('away-team-name').textContent = match.away_team.name;
    document.getElementById('home-team-logo').src = match.home_team.logo || 'assets/images/default-team.png';
    document.getElementById('away-team-logo').src = match.away_team.logo || 'assets/images/default-team.png';
    
    // عرض معلومات المباراة
    document.getElementById('match-league').textContent = match.league.name;
    document.getElementById('match-time').textContent = formatMatchTime(match.time);
    document.getElementById('channel-name').textContent = getChannelName(match.broadcast.channel);
}

function formatMatchTime(time) {
    return time || '--:--';
}

function getChannelName(channelId) {
    const channels = {
        'bein-sports-hd1': 'بي إن سبورت HD1',
        'bein-sports-hd2': 'بي إن سبورت HD2',
        'ssc-1': 'SSC 1'
    };
    return channels[channelId] || channelId;
}

/**
 * =============================================
 *             إدارة مشغل الفيديو
 * =============================================
 */
async function initializeVideoPlayer() {
    try {
        // 1. الحصول على مصدر البث
        const streamSource = getStreamSource();
        
        // 2. إنشاء عنصر الفيديو
        createVideoElement(streamSource);
        
        // 3. بدء مراقبة حالة البث
        startStreamHealthCheck();
        
    } catch (error) {
        console.error('خطأ في تهيئة مشغل الفيديو:', error);
        throw error;
    }
}

function getStreamSource() {
    const channel = systemState.currentMatch.broadcast.channel;
    const streamFile = `assets/streams/${channel}.html`;
    
    return {
        type: 'iframe',
        url: `${streamFile}?match=${systemState.currentMatch.id}`,
        backup: systemState.currentMatch.broadcast.backup_sources || []
    };
}

function createVideoElement(streamSource) {
    const videoContainer = document.getElementById('video-container');
    videoContainer.innerHTML = '';
    
    const iframe = document.createElement('iframe');
    iframe.src = streamSource.url;
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allow', 'autoplay; encrypted-media');
    iframe.onload = () => onStreamLoaded();
    iframe.onerror = () => handleStreamError(streamSource.backup);
    
    videoContainer.appendChild(iframe);
    systemState.currentStream = iframe;
}

function onStreamLoaded() {
    systemState.streamHealth = 'active';
    updateStreamStatus('مباشر');
}

function handleStreamError(backupSources) {
    systemState.retryCount++;
    
    if (systemState.retryCount <= CONFIG.MAX_RETRIES && backupSources.length > 0) {
        const nextSource = backupSources[0];
        console.log('جرب مصدر احتياطي:', nextSource);
        
        setTimeout(() => {
            createVideoElement({
                type: nextSource.type,
                url: nextSource.url,
                backup: backupSources.slice(1)
            });
        }, CONFIG.RETRY_DELAY);
    } else {
        showNoStreamAvailable();
    }
}

function startStreamHealthCheck() {
    const interval = setInterval(() => {
        if (systemState.streamHealth === 'active') {
            // يمكنك إضافة اختبارات أكثر تطوراً هنا
            console.log('البث يعمل بشكل طبيعي');
        } else {
            console.warn('تحذير: البث غير نشط');
            handleStreamError(systemState.currentMatch.broadcast.backup_sources || []);
        }
    }, CONFIG.HEALTH_CHECK_INTERVAL);
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
    document.addEventListener('fullscreenchange', updateFullscreenState);
}

function toggleQualityMenu() {
    const menu = document.getElementById('quality-menu');
    menu.classList.toggle('active');
    
    if (menu.classList.contains('active')) {
        renderQualityOptions();
    }
}

function renderQualityOptions() {
    const qualities = ['auto', 'hd', 'sd'];
    const container = document.getElementById('quality-options');
    
    container.innerHTML = qualities.map(q => `
        <div class="quality-option ${q === systemState.quality ? 'active' : ''}" 
             data-quality="${q}">
            ${q.toUpperCase()}
        </div>
    `).join('');
    
    document.querySelectorAll('.quality-option').forEach(option => {
        option.addEventListener('click', () => {
            systemState.quality = option.dataset.quality;
            applyQualitySettings();
            document.getElementById('quality-menu').classList.remove('active');
        });
    });
}

function applyQualitySettings() {
    console.log('تم تغيير الجودة إلى:', systemState.quality);
    // هنا يمكنك تطبيق إعدادات الجودة على البث
}

function toggleFullscreen() {
    const videoContainer = document.getElementById('video-container');
    
    if (!systemState.isFullscreen) {
        videoContainer.requestFullscreen().catch(err => {
            console.error('خطأ في تفعيل ملء الشاشة:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

function updateFullscreenState() {
    systemState.isFullscreen = !!document.fullscreenElement;
}

function refreshStream() {
    systemState.retryCount = 0;
    initializeVideoPlayer();
}

function updateStreamStatus(status) {
    document.getElementById('stream-status').textContent = status;
}

/**
 * =============================================
 *             معالجة الأخطاء والرسائل
 * =============================================
 */
function showNoStreamAvailable() {
    const videoContainer = document.getElementById('video-container');
    videoContainer.innerHTML = `
        <div class="no-stream">
            <i class="fas fa-video-slash"></i>
            <h3>لا يتوفر بث مباشر حالياً</h3>
            <p>سيتم عرض تسجيل المباراة فور انتهائها</p>
            <img src="assets/images/default-video.jpg" alt="صورة بديلة">
        </div>
    `;
}

function showErrorPage(message) {
    const main = document.querySelector('main');
    main.innerHTML = `
        <div class="error-page">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>حدث خطأ</h2>
            <p>${message}</p>
            <div class="actions">
                <a href="matches.html" class="btn">
                    <i class="fas fa-arrow-left"></i> العودة إلى المباريات
                </a>
                <button onclick="location.reload()" class="btn">
                    <i class="fas fa-sync-alt"></i> إعادة تحميل
                </button>
            </div>
        </div>
    `;
}

/**
 * =============================================
 *               الأحداث العامة
 * =============================================
 */
window.addEventListener('error', function(event) {
    console.error('خطأ غير معالج:', event.error);
    showErrorPage('حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.');
});

// دعم HLS.js إذا كان متاحاً
if (typeof Hls !== 'undefined') {
    Hls.DefaultConfig.maxBufferLength = 30;
    Hls.DefaultConfig.maxMaxBufferLength = 600;
    Hls.DefaultConfig.maxBufferSize = 60 * 1000 * 1000;
    Hls.DefaultConfig.maxBufferHole = 0.5;
}
