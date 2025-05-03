// watch.js - الإصدار الكامل المتكامل
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. جلب معلمات URL سواء في الصفحة الرئيسية أو iframe
        const getUrlParams = () => {
            try {
                const parentUrl = window.parent !== window ? window.parent.location.href : null;
                const currentUrl = window.location.href;
                return new URL(parentUrl || currentUrl).searchParams;
            } catch (e) {
                return new URLSearchParams(window.location.search);
            }
        };

        const params = getUrlParams();
        const matchId = params.get('id');
        const channelKey = params.get('channel');

        // 2. التحقق من وجود المعلمات المطلوبة
        if (!matchId || !channelKey) {
            showError('رابط غير صحيح', 'يجب الدخول عبر رابط المباراة الصحيح');
            return;
        }

        // 3. جلب بيانات المباراة من matches.js
        const matchData = await getMatchData(matchId);
        if (!matchData) {
            showError('بيانات غير متوفرة', 'تعذر تحميل بيانات المباراة');
            return;
        }

        // 4. جلب بيانات القناة
        const channelData = getChannelData(channelKey);
        if (!channelData) {
            showError('قناة غير متوفرة', 'تعذر العثور على القناة المطلوبة');
            return;
        }

        // 5. عرض البيانات
        renderMatchInfo(matchData);
        renderChannelInfo(channelData);
        setupVideoPlayer(channelData);

        // 6. إعداد الاتصال مع الصفحة الرئيسية إذا كنا في iframe
        if (window.self !== window.top) {
            window.parent.postMessage({
                type: 'iframe-loaded',
                matchId,
                status: 'ready'
            }, '*');
        }

    } catch (error) {
        console.error('حدث خطأ:', error);
        showError('خطأ فني', 'حدث خطأ غير متوقع');
    }
});

// دالة لجلب بيانات المباراة من matches.js
async function getMatchData(matchId) {
    try {
        // البحث في localStorage أولاً
        const cachedMatches = localStorage.getItem('cached_matches');
        if (cachedMatches) {
            const matches = JSON.parse(cachedMatches);
            const foundMatch = matches.find(m => m.id == matchId);
            if (foundMatch) return foundMatch;
        }

        // إذا لم توجد في الذاكرة، نبحث في matches.js
        if (typeof window.matchesData !== 'undefined') {
            const foundMatch = window.matchesData.find(m => m.id == matchId);
            if (foundMatch) {
                // نحفظها في localStorage لاستخدامها لاحقًا
                const currentCache = JSON.parse(localStorage.getItem('cached_matches') || []);
                localStorage.setItem('cached_matches', JSON.stringify([...currentCache, foundMatch]));
                return foundMatch;
            }
        }

        // إذا لم توجد في أي مكان
        return null;

    } catch (error) {
        console.error('خطأ في جلب بيانات المباراة:', error);
        return null;
    }
}

// دالة لجلب بيانات القناة
function getChannelData(channelKey) {
    const CHANNELS = {
        'bein-sports-hd1': {
            name: 'bein SPORTS HD1',
            logo: 'assets/images/channels/bein1.png',
            streamUrl: 'https://stream.sainaertebat.com/hls2/bein1.m3u8'
        },
        // يمكنك إضافة المزيد من القنوات هنا
    };
    return CHANNELS[channelKey] || null;
}

// دالة لعرض معلومات المباراة
function renderMatchInfo(match) {
    document.getElementById('match-title').textContent = `${match.homeTeam} vs ${match.awayTeam}`;
    document.getElementById('home-name').textContent = match.homeTeam;
    document.getElementById('away-name').textContent = match.awayTeam;
    document.getElementById('league-name').textContent = match.league;
    document.getElementById('match-time').textContent = new Date(match.date).toLocaleString('ar-SA');
}

// دالة لعرض معلومات القناة
function renderChannelInfo(channel) {
    const logo = document.getElementById('channel-logo');
    logo.src = channel.logo;
    logo.alt = channel.name;
    document.getElementById('channel-name').textContent = channel.name;
}

// دالة لإعداد مشغل الفيديو
function setupVideoPlayer(channelData) {
    const playerContainer = document.getElementById('player-container');
    playerContainer.innerHTML = '';

    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.width = '100%';

    // إعداد مصدر الفيديو
    const source = document.createElement('source');
    source.src = channelData.streamUrl;
    source.type = 'application/x-mpegURL';

    video.appendChild(source);
    playerContainer.appendChild(video);

    // دعم HLS.js للمتصفحات التي تحتاجه
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(channelData.streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                showError('خطأ في البث', 'تعذر تشغيل البث المباشر');
            }
        });
    }

    video.addEventListener('error', () => {
        showError('خطأ في التشغيل', 'تعذر تحميل الفيديو');
    });
}

// دالة لعرض الأخطاء
function showError(title, message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `
        <div class="error-message">
            <h3>${title}</h3>
            <p>${message}</p>
            <button onclick="window.location.reload()">إعادة المحاولة</button>
            <a href="matches.html" class="back-btn">العودة للمباريات</a>
        </div>
    `;
    errorContainer.style.display = 'block';
}

// جعل الدوال متاحة globally للاتصال بين الصفحات
window.getMatchData = getMatchData;
window.loadStream = setupVideoPlayer;
