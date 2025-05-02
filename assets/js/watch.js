// 1. تهيئة الصفحة
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

        // تحميل بيانات المباراة
        const matchData = await loadMatchData(matchId);
        if (!matchData) {
            showError('بيانات غير متوفرة', 'تعذر تحميل بيانات المباراة');
            return;
        }

        // تحميل بيانات القناة
        const channelData = getChannelData(channelKey);
        if (!channelData) {
            showError('قناة غير متوفرة', 'تعذر العثور على بيانات القناة');
            return;
        }

        // عرض البيانات
        renderMatchInfo(matchData);
        renderChannelInfo(channelData);
        loadStream(channelKey);

        // تحميل القنوات البديلة
        renderAlternativeChannels(matchData, channelKey);

        // تسجيل المشاهدة
        logView(matchId, channelData.name);

    } catch (error) {
        console.error('Error:', error);
        showError('حدث خطأ', 'تعذر تحميل الصفحة بشكل كامل');
    }
});

// 2. تحميل بيانات المباراة
async function loadMatchData(matchId) {
    try {
        // التحقق من الذاكرة المؤقتة أولاً
        const cachedData = getCachedMatchData(matchId);
        if (cachedData) return cachedData;

        // إذا لم توجد في الذاكرة، جلبها من API
        const response = await fetch(`https://api.example.com/matches/${matchId}`);
        if (!response.ok) throw new Error('Failed to fetch match data');
        
        const data = await response.json();
        cacheMatchData(matchId, data);
        return data;

    } catch (error) {
        console.error('Error loading match data:', error);
        return null;
    }
}

function getCachedMatchData(matchId) {
    const cacheKey = `match-${matchId}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    try {
        const { data, timestamp } = JSON.parse(cached);
        // صلاحية البيانات لمدة ساعتين
        return (Date.now() - timestamp < 7200000) ? data : null;
    } catch {
        return null;
    }
}

function cacheMatchData(matchId, data) {
    const cacheKey = `match-${matchId}`;
    localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
    }));
}

// 3. بيانات القنوات
const CHANNELS_CONFIG = {
    'bein-sports-hd1': {
        name: 'bein SPORTS HD1',
        logo: 'assets/images/channels/bein1.png',
        streamUrl: 'https://demphil.github.io/beinsports1/'
    },
    'bein-sports-hd2': {
        name: 'bein SPORTS HD2',
        logo: 'assets/images/channels/bein2.png',
        streamUrl: 'https://streaming.example.com/bein2'
    },
    'ssc-1': {
        name: 'SSC 1',
        logo: 'assets/images/channels/ssc1.png',
        streamUrl: 'https://streaming.example.com/ssc1'
    },
    // بقية القنوات...
};

function getChannelData(channelKey) {
    return CHANNELS_CONFIG[channelKey] || null;
}

// 4. عرض البيانات
function renderMatchInfo(match) {
    // عنوان الصفحة
    document.title = `${match.teams.home.name} vs ${match.teams.away.name} - كورة لايف`;
    document.getElementById('match-title').textContent = 
        `${match.teams.home.name} vs ${match.teams.away.name}`;

    // معلومات الفريقين
    document.getElementById('home-name').textContent = match.teams.home.name;
    document.getElementById('away-name').textContent = match.teams.away.name;
    document.getElementById('home-logo').src = match.teams.home.logo;
    document.getElementById('away-logo').src = match.teams.away.logo;

    // معلومات الدوري
    document.getElementById('league-name').textContent = match.league.name;
    document.getElementById('league-logo').src = match.league.logo;

    // معلومات إضافية
    document.getElementById('match-venue').textContent = match.fixture.venue?.name || 'غير معروف';
    document.getElementById('match-date').textContent = formatMatchDate(match.fixture.date);
    document.getElementById('match-status').textContent = getMatchStatus(match.fixture.status);
}

function renderChannelInfo(channel) {
    document.getElementById('channel-name').textContent = channel.name;
    document.getElementById('channel-logo').src = channel.logo;
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

function getMatchStatus(status) {
    const statusMap = {
        'NS': 'لم تبدأ',
        '1H': 'الشوط الأول',
        'HT': 'استراحة',
        '2H': 'الشوط الثاني',
        'FT': 'انتهت',
        'PST': 'تأجلت',
        'CANC': 'ألغيت'
    };
    return statusMap[status] || 'غير معروف';
}

// 5. تحميل البث المباشر
function loadStream(channelKey) {
    const iframe = document.getElementById('stream-iframe');
    const loader = document.querySelector('.video-container .loader');
    const errorContainer = document.querySelector('.stream-error');

    // إخفاء العناصر غير الضرورية
    iframe.style.display = 'none';
    errorContainer.style.display = 'none';
    loader.style.display = 'flex';

    // محاكاة تحميل البث (في الواقع سيكون لديك URL حقيقي)
    setTimeout(() => {
        const channel = getChannelData(channelKey);
        if (channel) {
            iframe.src = channel.streamUrl;
            iframe.style.display = 'block';
            loader.style.display = 'none';
            
            // إضافة مستمع للأخطاء
            iframe.onload = () => {
                // يمكنك هنا التحقق من أن البث يعمل بشكل صحيح
                console.log('تم تحميل البث بنجاح');
            };
            
            iframe.onerror = () => {
                showStreamError();
            };
        } else {
            showStreamError();
        }
    }, 1500);
}

function showStreamError() {
    const iframe = document.getElementById('stream-iframe');
    const loader = document.querySelector('.video-container .loader');
    const errorContainer = document.querySelector('.stream-error');

    iframe.style.display = 'none';
    loader.style.display = 'none';
    errorContainer.style.display = 'flex';

    // إعادة المحاولة
    document.querySelector('.retry-btn').addEventListener('click', () => {
        const params = new URLSearchParams(window.location.search);
        const channelKey = params.get('channel');
        loadStream(channelKey);
    });
}

// 6. القنوات البديلة
function renderAlternativeChannels(match, currentChannelKey) {
    const channelsList = document.getElementById('channels-list');
    
    // الحصول على جميع القنوات المتاحة لهذه المباراة
    const availableChannels = match.tv_channels || [];
    const arabicChannels = availableChannels.filter(ch => 
        Object.keys(CHANNELS_CONFIG).includes(getChannelKeyFromName(ch))
    );

    // إذا لم توجد قنوات بديلة
    if (arabicChannels.length <= 1) {
        document.querySelector('.alternative-channels').style.display = 'none';
        return;
    }

    // عرض القنوات البديلة
    channelsList.innerHTML = arabicChannels
        .filter(ch => {
            const key = getChannelKeyFromName(ch);
            return key && key !== currentChannelKey;
        })
        .map(ch => {
            const key = getChannelKeyFromName(ch);
            const channel = CHANNELS_CONFIG[key];
            return `
                <div class="channel-item" data-channel="${key}">
                    <img src="${channel.logo}" alt="${channel.name}">
                    <span>${channel.name}</span>
                    <button class="switch-btn">تبديل</button>
                </div>
            `;
        })
        .join('');

    // إضافة مستمع للأحداث
    document.querySelectorAll('.channel-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('switch-btn')) {
                const channelKey = item.dataset.channel;
                switchChannel(channelKey);
            }
        });
    });
}

function getChannelKeyFromName(channelName) {
    for (const [key, value] of Object.entries(CHANNELS_CONFIG)) {
        if (value.name === channelName) return key;
    }
    return null;
}

function switchChannel(channelKey) {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('id');
    
    // تحديث URL بدون إعادة تحميل الصفحة
    window.history.replaceState({}, '', `watch.html?id=${matchId}&channel=${channelKey}`);
    
    // تحميل القناة الجديدة
    const channelData = getChannelData(channelKey);
    if (channelData) {
        renderChannelInfo(channelData);
        loadStream(channelKey);
        showToast(`تم التبديل إلى ${channelData.name}`);
    }
}

// 7. تسجيل المشاهدة
function logView(matchId, channelName) {
    const history = JSON.parse(localStorage.getItem('viewingHistory') || [];
    
    // إضافة المشاهدة الجديدة
    history.unshift({
        matchId,
        channel: channelName,
        timestamp: new Date().toISOString()
    });

    // حفظ آخر 50 مشاهدة فقط
    localStorage.setItem('viewingHistory', JSON.stringify(history.slice(0, 50)));
}

// 8. إدارة الأخطاء والرسائل
function showError(title, message) {
    const header = document.querySelector('.watch-header h1');
    header.textContent = title;
    
    const videoContainer = document.querySelector('.video-container');
    videoContainer.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
            <button onclick="window.location.href='matches.html'">
                العودة إلى المباريات
            </button>
        </div>
    `;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
