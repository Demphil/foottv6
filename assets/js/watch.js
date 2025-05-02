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
 *             تهيئة الصفحة الرئيسية
 * =============================================
 */
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const matchId = getMatchIdFromURL();
        if (!matchId) throw new Error('لم يتم تحديد مباراة للمشاهدة');
        
        systemState.currentMatch = await loadMatchData(matchId);
        if (!systemState.currentMatch) throw new Error('تعذر تحميل بيانات المباراة');
        
        displayMatchInfo(systemState.currentMatch);
        await initializeVideoPlayer();
        setupUI();
        
    } catch (error) {
        console.error('خطأ في التهيئة:', error);
        showErrorPage(error.message);
    }
});

// ... [بقية الدوال تبقى كما هي] ...

function displayMatchInfo(match) {
    // تحديث مسارات الصور
    document.getElementById('home-team-logo').src = match.teams.home.logo || CONFIG.DEFAULT_IMAGES.TEAM;
    document.getElementById('away-team-logo').src = match.teams.away.logo || CONFIG.DEFAULT_IMAGES.TEAM;
    document.getElementById('league-logo').src = match.league.logo || CONFIG.DEFAULT_IMAGES.LEAGUE;
    
    // ... بقية الكود
}

function getStreamSource() {
    const channelName = systemState.currentMatch.tv_channels[0];
    const channelKey = CONFIG.CHANNEL_MAP[channelName] || 'default';
    
    return {
        type: 'iframe',
        url: `../streams/${channelKey}.html?match=${systemState.currentMatch.fixture.id}`,
        backup: systemState.currentMatch.tv_channels.slice(1)
    };
}

function showNoStreamAvailable() {
    const videoContainer = document.getElementById('video-container');
    videoContainer.innerHTML = `
        <div class="no-stream">
            <img src="${CONFIG.DEFAULT_IMAGES.VIDEO}" alt="بديل الفيديو">
            <!-- بقية المحتوى -->
        </div>
    `;
}
