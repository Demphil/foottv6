// watch.js - الإصدار الكامل النهائي
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. تهيئة العناصر الأساسية
        initEssentialElements();
        
        // 2. جلب معلمات URL
        const { matchId, channelKey } = getUrlParams();
        
        // 3. التحقق من المعلمات
        if (!validateParams(matchId, channelKey)) return;
        
        // 4. جلب وعرض البيانات
        const [matchData, channelData] = await Promise.all([
            getMatchData(matchId),
            getChannelData(channelKey)
        ]);
        
        if (!validateData(matchData, channelData)) return;
        
        renderAllContent(matchData, channelData);
        
        // 5. إعلام الصفحة الرئيسية إذا كنا في iframe
        notifyParentIfFrame(matchId);

    } catch (error) {
        handleInitializationError(error);
    }
});

// ============== الدوال الأساسية ============== //

function initEssentialElements() {
    const elements = {
        'watch-container': '<div class="watch-content"></div>',
        'error-container': '<div class="error-message"></div>',
        'player-container': '',
        'loading': '<div class="spinner"></div><p>جارٍ التحميل...</p>',
        'match-info': `
            <div class="match-header">
                <h1 id="match-title"></h1>
                <div class="teams">
                    <span id="home-name"></span> vs <span id="away-name"></span>
                </div>
                <div class="match-details">
                    <span id="league-name"></span> | <span id="match-time"></span>
                </div>
            </div>
        `,
        'channel-info': `
            <div class="channel-header">
                <img id="channel-logo" alt="شعار القناة">
                <span id="channel-name"></span>
            </div>
        `
    };

    Object.entries(elements).forEach(([id, html]) => {
        if (!document.getElementById(id)) {
            const el = document.createElement('div');
            el.id = id;
            el.innerHTML = html;
            document.body.appendChild(el);
        }
    });
}

function getUrlParams() {
    try {
        const url = window.self !== window.top ? 
            document.referrer || window.parent.location.href : 
            window.location.href;
        
        const params = new URL(url).searchParams;
        return {
            matchId: params.get('id'),
            channelKey: params.get('channel')
        };
    } catch (e) {
        return {
            matchId: new URLSearchParams(window.location.search).get('id'),
            channelKey: new URLSearchParams(window.location.search).get('channel')
        };
    }
}

function validateParams(matchId, channelKey) {
    if (!matchId || !channelKey) {
        showError('رابط غير صحيح', 'يجب أن يحتوي الرابط على معرّف المباراة والقناة');
        return false;
    }
    return true;
}

async function getMatchData(matchId) {
    try {
        // البحث في التخزين المحلي أولاً
        const cached = localStorage.getItem(`match_${matchId}`);
        if (cached) return JSON.parse(cached);
        
        // البحث في matches.js
        if (typeof window.matchesData !== 'undefined') {
            const match = window.matchesData.find(m => m.fixture.id == matchId);
            if (match) {
                localStorage.setItem(`match_${matchId}`, JSON.stringify(match));
                return match;
            }
        }
        
        // جلب من API إذا لزم الأمر (يمكن إضافته لاحقًا)
        return null;
    } catch (error) {
        console.error('خطأ في جلب بيانات المباراة:', error);
        return null;
    }
}

function getChannelData(channelKey) {
    const CHANNELS = {
        'bein-sports-hd1': {
            name: 'bein SPORTS HD1',
            logo: 'assets/images/channels/bein1.png',
            streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
        },
        'bein-sports-hd2': {
            name: 'bein SPORTS HD2',
            logo: 'assets/images/channels/bein2.png',
            streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
        },
        'bein-sports-hd3': {
            name: 'bein SPORTS HD3',
            logo: 'assets/images/channels/bein3.png',
            streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
        },
        'ssc-1': {
            name: 'SSC 1',
            logo: 'assets/images/channels/ssc1.png',
            streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
        },
        'ssc-2': {
            name: 'SSC 2',
            logo: 'assets/images/channels/ssc2.png',
            streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
        },
        'on-time-sports': {
            name: 'On Time Sports',
            logo: 'assets/images/channels/ontime.png',
            streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
        },
        'al-kass': {
            name: 'Alkass',
            logo: 'assets/images/channels/alkass.png',
            streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
        }
    };
    return CHANNELS[channelKey] || null;
}

function validateData(matchData, channelData) {
    if (!matchData) {
        showError('بيانات غير متوفرة', 'تعذر تحميل بيانات المباراة');
        return false;
    }
    if (!channelData) {
        showError('قناة غير متوفرة', 'تعذر العثور على بيانات القناة');
        return false;
    }
    return true;
}

function renderAllContent(matchData, channelData) {
    renderMatchInfo(matchData);
    renderChannelInfo(channelData);
    setupVideoPlayer(channelData);
}

function renderMatchInfo(match) {
    safeSetContent('match-title', `${match.teams.home.name} vs ${match.teams.away.name}`);
    safeSetContent('home-name', match.teams.home.name);
    safeSetContent('away-name', match.teams.away.name);
    safeSetContent('league-name', match.league.name);
    safeSetContent('match-time', formatMatchDate(match.fixture.date));
}

function renderChannelInfo(channel) {
    const logo = document.getElementById('channel-logo');
    if (logo) {
        logo.src = channel.logo;
        logo.alt = channel.name;
        logo.onerror = () => logo.src = 'assets/images/default-channel.png';
    }
    safeSetContent('channel-name', channel.name);
}

function setupVideoPlayer(channelData) {
    const playerContainer = document.getElementById('player-container');
    if (!playerContainer) return;

    playerContainer.innerHTML = '';
    toggleLoading(true);

    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.width = '100%';

    const source = document.createElement('source');
    source.src = channelData.streamUrl;
    source.type = 'application/x-mpegURL';

    video.appendChild(source);
    playerContainer.appendChild(video);

    // دعم HLS.js
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(channelData.streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                showError('خطأ في البث', 'تعذر تشغيل البث المباشر');
                toggleLoading(false);
            }
        });
    }

    video.addEventListener('loadeddata', () => toggleLoading(false));
    video.addEventListener('error', () => {
        showError('خطأ في التشغيل', 'تعذر تحميل الفيديو');
        toggleLoading(false);
    });
}

function notifyParentIfFrame(matchId) {
    if (window.self !== window.top) {
        window.parent.postMessage({
            type: 'iframe-ready',
            matchId: matchId,
            status: 'loaded'
        }, '*');
    }
}

function handleInitializationError(error) {
    console.error('خطأ في التهيئة:', error);
    showError('خطأ فني', 'حدث خطأ أثناء تحميل الصفحة');
    toggleLoading(false);
}

// ============== الدوال المساعدة ============== //

function safeSetContent(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = content;
}

function formatMatchDate(dateString) {
    const options = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Africa/Casablanca'
    };
    return new Date(dateString).toLocaleDateString('ar-MA', options);
}

function toggleLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = show ? 'flex' : 'none';
}

function showError(title, message) {
    const errorContainer = document.getElementById('error-container') || createErrorContainer();
    
    errorContainer.innerHTML = `
        <div class="error-content">
            <h3>${title}</h3>
            <p>${message}</p>
            <button class="btn-retry" onclick="window.location.reload()">إعادة المحاولة</button>
            <a href="matches.html" class="btn-back">العودة للمباريات</a>
        </div>
    `;
    errorContainer.style.display = 'block';
    toggleLoading(false);
}

function createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'error-container';
    document.body.appendChild(container);
    return container;
}

// جعل الدوال متاحة للاستخدام من الخارج
window.retryStream = function() {
    const params = new URLSearchParams(window.location.search);
    const channelKey = params.get('channel');
    const channelData = getChannelData(channelKey);
    if (channelData) setupVideoPlayer(channelData);
};
