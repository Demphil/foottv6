/**
 * =============================================
 *               إعدادات النظام
 * =============================================
 */
const CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000,
    STREAM_TIMEOUT: 10000,
    HEALTH_CHECK_INTERVAL: 30000,
    CHANNEL_MAP: {
        'bein SPORTS HD1': 'bein-sports-hd1',
        'bein SPORTS HD2': 'bein-sports-hd2',
        'bein SPORTS HD3': 'bein-sports-hd3',
        'SSC 1': 'ssc-1',
        'Abu Dhabi Sports': 'abu-dhabi-sports',
        'Arryadia': 'arryadia',
        'Al Aoula': 'al-aoula'
    }
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
        
        // 2. تحميل بيانات المباراة من localStorage أو API
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
        // 1. جلب البيانات من localStorage أولاً
        const cachedMatches = JSON.parse(localStorage.getItem('matches-cache') || '[]');
        const cachedMatch = cachedMatches.find(m => m.fixture.id == matchId);
        
        if (cachedMatch) {
            console.log('تم تحميل بيانات المباراة من الذاكرة المؤقتة');
            return cachedMatch;
        }
        
        // 2. إذا لم توجد في الذاكرة، جلب من API
        const response = await fetch(`/api/matches/${matchId}`);
        if (!response.ok) throw new Error('فشل في جلب البيانات');
        
        const data = await response.json();
        if (!data.tv_channels) throw new Error('لا يوجد معلومات بث لهذه المباراة');
        
        return data;
        
    } catch (error) {
        console.error('Error loading match data:', error);
        throw error;
    }
}

function displayMatchInfo(match) {
    // عرض معلومات الفريقين
    document.getElementById('home-team-name').textContent = match.teams.home.name;
    document.getElementById('away-team-name').textContent = match.teams.away.name;
    document.getElementById('home-team-logo').src = match.teams.home.logo || 'assets/images/default-team.png';
    document.getElementById('away-team-logo').src = match.teams.away.logo || 'assets/images/default-team.png';
    
    // عرض معلومات المباراة
    document.getElementById('match-league').textContent = match.league.name_ar || match.league.name;
    document.getElementById('match-time').textContent = formatMatchTime(match.fixture.date);
    document.getElementById('channel-name').textContent = match.tv_channels.join(' - ');
}

function formatMatchTime(dateString) {
    const options = { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Africa/Casablanca'
    };
    return new Date(dateString).toLocaleTimeString('ar-MA', options);
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
    const channelName = systemState.currentMatch.tv_channels[0];
    const channelKey = CONFIG.CHANNEL_MAP[channelName] || 'default';
    
    return {
        type: 'iframe',
        url: `assets/streams/${channelKey}.html?match=${systemState.currentMatch.fixture.id}`,
        backup: systemState.currentMatch.tv_channels.slice(1)
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

// ... (بقية الدوال تبقى كما هي بدون تغيير)

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
            <p>القنوات المتاحة: ${systemState.currentMatch.tv_channels.join(' - ')}</p>
            <button onclick="tryAlternativeStreams()" class="btn">
                <i class="fas fa-sync-alt"></i> تجربة قنوات أخرى
            </button>
        </div>
    `;
}

window.tryAlternativeStreams = function() {
    if (systemState.currentMatch.tv_channels.length > 1) {
        systemState.currentMatch.tv_channels = systemState.currentMatch.tv_channels.slice(1);
        initializeVideoPlayer();
    }
};

// ... (بقية الدوال تبقى كما هي)
