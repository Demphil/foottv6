// 1. تهيئة الصفحة
if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(channelData.streamUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, function(event, data) {
        if (data.fatal) {
            showStreamError();
        }
    });
}
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // تحليل معلمات URL
        const params = new URLSearchParams(window.location.search);
        const matchId = params.get('id');
        const channelKey = params.get('channel');

        // التحقق من وجود المعلمات المطلوبة
        if (!matchId || !channelKey) {
            showError('رابط غير صحيح', 'لم يتم توفير معرّف المباراة أو القناة');
            return;
        }

        // تحميل بيانات المباراة من التخزين المحلي أو API
        const matchData = await getMatchData(matchId);
        if (!matchData) {
            showError('بيانات غير متوفرة', 'تعذر تحميل بيانات المباراة');
            return;
        }

        // تحميل بيانات القناة من التخزين المحلي
        const channelData = getChannelData(channelKey);
        if (!channelData) {
            showError('قناة غير متوفرة', 'تعذر العثور على بيانات القناة');
            return;
        }

        // عرض البيانات
        renderMatchInfo(matchData);
        renderChannelInfo(channelData);
        loadStream(channelData);

    } catch (error) {
        console.error('Error:', error);
        showError('حدث خطأ', 'تعذر تحميل الصفحة بشكل كامل');
    }
});

// 2. دالة لجلب بيانات المباراة
async function getMatchData(matchId) {
    try {
        // جلب من التخزين المحلي أولاً
        const cached = localStorage.getItem(`match_${matchId}`);
        if (cached) return JSON.parse(cached);
        
        // أو جلب من API إذا لزم الأمر
        const response = await fetch(`https://api.example.com/matches/${matchId}`);
        if (!response.ok) throw new Error('Failed to fetch match data');
        const data = await response.json();
        localStorage.setItem(`match_${matchId}`, JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('Error loading match data:', error);
        return null;
    }
}

// 3. دالة لجلب بيانات القناة
function getChannelData(channelKey) {
    const CHANNELS = {
        'bein-sports-hd1': {
            name: 'bein SPORTS HD1',
            logo: 'assets/images/channels/bein1.png',
            streamUrl: 'https://stream.sainaertebat.com/hls2/bein1.m3u8'
        },
        'bein-sports-hd2': {
            name: 'bein SPORTS HD2',
            logo: 'assets/images/channels/bein2.png',
            streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
        },
        // ... أضف بقية القنوات بنفس الهيكل
    };
    return CHANNELS[channelKey] || null;
}

// 4. عرض معلومات المباراة
function renderMatchInfo(match) {
    document.getElementById('match-title').textContent = 
        `${match.teams.home.name} vs ${match.teams.away.name}`;
    document.getElementById('home-name').textContent = match.teams.home.name;
    document.getElementById('away-name').textContent = match.teams.away.name;
    document.getElementById('league-name').textContent = match.league.name;
    document.getElementById('match-time').textContent = 
        new Date(match.fixture.date).toLocaleString('ar-SA');
}

// 5. عرض معلومات القناة
function renderChannelInfo(channel) {
    document.getElementById('channel-name').textContent = channel.name;
    const logo = document.getElementById('channel-logo');
    logo.src = channel.logo;
    logo.onerror = () => logo.src = 'assets/images/default-channel.png';
}

// 6. تحميل البث المباشر
function loadStream(channelData) {
    const playerContainer = document.getElementById('player-container');
    const loadingIndicator = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');

    // إخفاء الرسائل وإظهار التحميل
    errorContainer.style.display = 'none';
    loadingIndicator.style.display = 'block';
    playerContainer.innerHTML = '';

    // إنشاء مشغل الفيديو
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.style.width = '100%';
    
    const source = document.createElement('source');
    source.src = channelData.streamUrl;
    source.type = 'application/x-mpegURL';
    
    video.appendChild(source);
    playerContainer.appendChild(video);

    // معالجة الأحداث
    video.onloadeddata = () => {
        loadingIndicator.style.display = 'none';
    };
    
    video.onerror = () => {
        loadingIndicator.style.display = 'none';
        errorContainer.style.display = 'block';
        errorContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i>
                <span>تعذر تحميل البث المباشر</span>
                <button class="btn-retry" onclick="retryStream()">إعادة المحاولة</button>
            </div>
        `;
    };
}

// 7. إعادة تحميل البث
window.retryStream = function() {
    const params = new URLSearchParams(window.location.search);
    const channelKey = params.get('channel');
    const channelData = getChannelData(channelKey);
    if (channelData) loadStream(channelData);
};

// 8. إدارة الأخطاء
function showError(title, message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `
        <div class="alert alert-danger">
            <h4>${title}</h4>
            <p>${message}</p>
            <a href="matches.html" class="btn-back">العودة إلى المباريات</a>
        </div>
    `;
    errorContainer.style.display = 'block';
    document.getElementById('loading').style.display = 'none';
}
