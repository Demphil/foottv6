document.addEventListener('DOMContentLoaded', async () => {
    try {
        // تحليل معلمات URL بشكل أكثر دقة
        const urlParams = new URL(window.location.href).searchParams;
        const matchId = urlParams.get('id');
        const channelKey = urlParams.get('channel');

        // تحقق أكثر شمولاً من المعلمات
        if (!matchId || !channelKey || isNaN(matchId)) {
            showError('رابط غير صحيح', 'لم يتم توفير معرّف المباراة أو القناة بشكل صحيح');
            return;
        }

        // بيانات تجريبية للمباراة (للاختبار)
        const mockMatchData = {
            teams: {
                home: { name: "النادي الأهلي" },
                away: { name: "النادي الهلال" }
            },
            league: { name: "الدوري السعودي للمحترفين" },
            fixture: { date: new Date().toISOString() }
        };

        // بيانات القناة (استخدم البيانات الحقيقية هنا)
        const channelData = getChannelData(channelKey);
        if (!channelData) {
            showError('قناة غير متوفرة', 'تعذر العثور على بيانات القناة المطلوبة');
            return;
        }

        // عرض البيانات (استخدم mockMatchData للاختبار)
        renderMatchInfo(mockMatchData);
        renderChannelInfo(channelData);
        loadStream(channelData);

    } catch (error) {
        console.error('حدث خطأ:', error);
        showError('خطأ في النظام', 'تعذر تحميل الصفحة بشكل كامل');
    }
});

// باقي الدوال تبقى كما هي...

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
            streamUrl: 'https://demphil.github.io/beinsports1/'
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
    const matchTitle = document.getElementById('match-title');
    const homeName = document.getElementById('home-name');
    const awayName = document.getElementById('away-name');
    const leagueName = document.getElementById('league-name');
    const matchTime = document.getElementById('match-time');

    if (matchTitle) matchTitle.textContent = `${match.teams.home.name} vs ${match.teams.away.name}`;
    if (homeName) homeName.textContent = match.teams.home.name;
    if (awayName) awayName.textContent = match.teams.away.name;
    if (leagueName) leagueName.textContent = match.league.name;
    if (matchTime) matchTime.textContent = new Date(match.fixture.date).toLocaleString('ar-SA');
}

// 5. عرض معلومات القناة
function renderChannelInfo(channel) {
    const channelName = document.getElementById('channel-name');
    const channelLogo = document.getElementById('channel-logo');

    if (channelName) channelName.textContent = channel.name;
    if (channelLogo) {
        channelLogo.src = channel.logo;
        channelLogo.onerror = () => channelLogo.src = 'assets/images/default-channel.png';
    }
}

// 6. تحميل البث المباشر
function loadStream(channelData) {
    const playerContainer = document.getElementById('player-container');
    const loadingIndicator = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');

    // إخفاء الرسائل وإظهار التحميل
    if (errorContainer) errorContainer.style.display = 'none';
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (playerContainer) playerContainer.innerHTML = '';

    // إنشاء مشغل الفيديو
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.style.width = '100%';
    
    const source = document.createElement('source');
    source.src = channelData.streamUrl;
    source.type = 'application/x-mpegURL';
    
    video.appendChild(source);
    if (playerContainer) playerContainer.appendChild(video);

    // معالجة الأحداث
    video.onloadeddata = () => {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    };
    
    video.onerror = () => {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (errorContainer) {
            errorContainer.style.display = 'block';
            errorContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>تعذر تحميل البث المباشر</span>
                    <button class="btn-retry" onclick="retryStream()">إعادة المحاولة</button>
                </div>
            `;
        }
    };

    // دعم HLS.js لمتصفحات غير Chrome
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(channelData.streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, function(event, data) {
            if (data.fatal) {
                if (errorContainer) {
                    errorContainer.style.display = 'block';
                    errorContainer.innerHTML = `
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>خطأ في تشغيل البث</span>
                            <button class="btn-retry" onclick="retryStream()">إعادة المحاولة</button>
                        </div>
                    `;
                }
            }
        });
    }
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
    const loadingIndicator = document.getElementById('loading');

    if (errorContainer) {
        errorContainer.innerHTML = `
            <div class="alert alert-danger">
                <h4>${title}</h4>
                <p>${message}</p>
                <a href="matches.html" class="btn-back">العودة إلى المباريات</a>
            </div>
        `;
        errorContainer.style.display = 'block';
    }
    
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}
