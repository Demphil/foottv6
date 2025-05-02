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
        'bein SPORTS HD4': 'bein-sports-hd4',
        'SSC 1': 'ssc-1',
        'Arryadia': 'arryadia-sdhd',
        'Al Aoula': 'al-aoula'
    },
    DEFAULT_IMAGES: {
        TEAM: '../assets/images/default-team.png',
        LEAGUE: '../assets/images/default-league.png',
        VIDEO: '../assets/images/default-video.jpg'
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
        // 1. جلب البيانات من localStorage أولاً
        const cachedData = localStorage.getItem('matches-cache');
        if (cachedData) {
            const matches = JSON.parse(cachedData).data;
            const match = matches.find(m => m.fixture.id == matchId);
            if (match) return match;
        }

        // 2. جلب البيانات من API إذا لم توجد في الذاكرة
        const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures?id=${matchId}`, {
            headers: {
                'X-RapidAPI-Key': '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556',
                'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
            }
        });
        
        if (!response.ok) throw new Error('فشل في جلب البيانات');
        
        const data = await response.json();
        return data.response[0];
    } catch (error) {
        console.error('Error loading match data:', error);
        throw error;
    }
}

function displayMatchInfo(match) {
    // عرض معلومات الفريقين
    document.getElementById('home-team-name').textContent = match.teams.home.name;
    document.getElementById('away-team-name').textContent = match.teams.away.name;
    document.getElementById('home-team-logo').src = match.teams.home.logo || CONFIG.DEFAULT_IMAGES.TEAM;
    document.getElementById('away-team-logo').src = match.teams.away.logo || CONFIG.DEFAULT_IMAGES.TEAM;
    
    // عرض معلومات المباراة
    document.getElementById('match-league').textContent = match.league.name_ar || match.league.name;
    document.getElementById('league-logo').src = match.league.logo || CONFIG.DEFAULT_IMAGES.LEAGUE;
    document.getElementById('match-time').textContent = formatMatchTime(match.fixture.date);
    document.getElementById('match-venue').textContent = match.fixture.venue?.name || 'ملعب غير معروف';
    document.getElementById('channel-name').textContent = match.tv_channels?.join(' - ') || 'غير معروف';
}

function formatMatchTime(dateString) {
    const options = { 
        weekday: 'long',
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Africa/Casablanca'
    };
    return new Date(dateString).toLocaleDateString('ar-MA', options);
}

/**
 * =============================================
 *             إدارة مشغل الفيديو
 * =============================================
 */
async function initializeVideoPlayer() {
    try {
        if (!systemState.currentMatch.tv_channels || systemState.currentMatch.tv_channels.length === 0) {
            throw new Error('لا توجد قنوات ناقلة متاحة');
        }

        const streamSource = getStreamSource();
        createVideoElement(streamSource);
        startStreamHealthCheck();
    } catch (error) {
        console.error('خطأ في تهيئة مشغل الفيديو:', error);
        showNoStreamAvailable();
    }
}

function getStreamSource() {
    const channelName = systemState.currentMatch.tv_channels[0];
    const channelKey = CONFIG.CHANNEL_MAP[channelName] || Object.values(CONFIG.CHANNEL_MAP)[0];
    
    return {
        type: 'iframe',
        url: `../streams/${channelKey}.html?match=${systemState.currentMatch.fixture.id}&t=${Date.now()}`,
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
    iframe.classList.add('stream-iframe');
    
    iframe.onload = () => {
        systemState.streamHealth = 'active';
        updateStreamStatus('مباشر');
    };
    
    iframe.onerror = () => handleStreamError(streamSource.backup);
    
    videoContainer.appendChild(iframe);
    systemState.currentStream = iframe;
}

function handleStreamError(backupSources) {
    systemState.retryCount++;
    
    if (systemState.retryCount <= CONFIG.MAX_RETRIES && backupSources.length > 0) {
        console.log(`المحاولة ${systemState.retryCount}: تجربة قناة بديلة`);
        setTimeout(() => {
            systemState.currentMatch.tv_channels = backupSources;
            initializeVideoPlayer();
        }, CONFIG.RETRY_DELAY);
    } else {
        showNoStreamAvailable();
    }
}

function startStreamHealthCheck() {
    systemState.healthCheckInterval = setInterval(() => {
        if (systemState.streamHealth !== 'active') {
            console.warn('تحذير: البث غير نشط، إعادة المحاولة...');
            handleStreamError(systemState.currentMatch.tv_channels.slice(1));
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
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    document.getElementById('refresh-btn').addEventListener('click', refreshStream);
    document.getElementById('back-btn').addEventListener('click', () => window.history.back());
    
    // إدارة وضع ملء الشاشة
    document.addEventListener('fullscreenchange', updateFullscreenState);
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
    const icon = document.getElementById('fullscreen-icon');
    if (icon) {
        icon.className = systemState.isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
    }
}

function refreshStream() {
    systemState.retryCount = 0;
    clearInterval(systemState.healthCheckInterval);
    initializeVideoPlayer();
}

function updateStreamStatus(status) {
    const statusElement = document.getElementById('stream-status');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = status === 'مباشر' ? 'active' : 'inactive';
    }
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
            <img src="${CONFIG.DEFAULT_IMAGES.VIDEO}" alt="لا يوجد بث">
            <div class="message">
                <i class="fas fa-video-slash"></i>
                <h3>لا يتوفر بث مباشر حالياً</h3>
                <p>القنوات المتاحة: ${systemState.currentMatch.tv_channels?.join(' - ') || 'غير معروف'}</p>
                <button class="btn retry-btn">
                    <i class="fas fa-sync-alt"></i> إعادة المحاولة
                </button>
            </div>
        </div>
    `;
    
    document.querySelector('.retry-btn').addEventListener('click', refreshStream);
}

function showErrorPage(message) {
    document.querySelector('main').innerHTML = `
        <div class="error-page">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>حدث خطأ</h2>
            <p>${message}</p>
            <div class="actions">
                <a href="../matches.html" class="btn">
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

// دعم وضع ملء الشاشة لمتصفحات مختلفة
document.addEventListener('webkitfullscreenchange', updateFullscreenState);
document.addEventListener('mozfullscreenchange', updateFullscreenState);
document.addEventListener('MSFullscreenChange', updateFullscreenState);
