// watch.js
document.addEventListener('DOMContentLoaded', async () => {
    // 1. الحصول على معرّف المباراة والقناة من URL
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('id');
    const channel = urlParams.get('channel');

    if (!matchId || !channel) {
        showError('المعطيات ناقصة! الرجاء العودة واختيار مباراة صالحة');
        return;
    }

    // 2. عناصر DOM
    const DOM = {
        loading: document.getElementById('loading'),
        errorContainer: document.getElementById('error-container'),
        matchContainer: document.getElementById('match-container'),
        videoFrame: document.getElementById('video-frame'),
        matchInfo: document.getElementById('match-info'),
        channelList: document.getElementById('channel-list'),
        backButton: document.getElementById('back-button')
    };

    // 3. عرض حالة التحميل
    showLoading();

    try {
        // 4. جلب بيانات المباريات (مع التخزين المؤقت)
        const matchesData = await getMatchesData();
        const match = findMatchById(matchesData, matchId);

        if (!match) {
            showError('لم يتم العثور على بيانات المباراة');
            return;
        }

        // 5. عرض معلومات المباراة
        renderMatchDetails(match, channel);

        // 6. إعداد البث المباشر
        setupLiveStream(channel);

    } catch (error) {
        console.error('Error:', error);
        showError('حدث خطأ أثناء جلب بيانات المباراة');
    } finally {
        hideLoading();
    }

    // 7. أحداث الأزرار
    DOM.backButton.addEventListener('click', () => {
        window.history.back();
    });

    // ----- الدوال المساعدة ----- //

    async function getMatchesData() {
        const CACHE_KEY = 'football-matches-cache-v5';
        const cached = localStorage.getItem(CACHE_KEY);
        
        if (cached) {
            try {
                const { data } = JSON.parse(cached);
                return data;
            } catch {
                // إذا كان هناك خطأ في التخزين المؤقت، نستدعي API مباشرة
                return await fetchMatches();
            }
        }
        return await fetchMatches();
    }

    function findMatchById(matches, id) {
        return matches.find(m => m.fixture.id == id);
    }

    function renderMatchDetails(match, selectedChannel) {
        const { fixture, teams, league } = match;
        
        DOM.matchInfo.innerHTML = `
            <div class="match-header">
                <img src="${league.logo}" alt="${league.name}" class="league-logo">
                <h2>${league.name}</h2>
            </div>
            <div class="teams">
                <div class="team">
                    <img src="${teams.home.logo}" alt="${teams.home.name}">
                    <h3>${teams.home.name}</h3>
                </div>
                <div class="vs">VS</div>
                <div class="team">
                    <img src="${teams.away.logo}" alt="${teams.away.name}">
                    <h3>${teams.away.name}</h3>
                </div>
            </div>
            <div class="match-meta">
                <p><i class="fas fa-calendar-alt"></i> ${formatDate(fixture.date)}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${fixture.venue?.name || 'ملعب غير معروف'}</p>
            </div>
        `;

        // عرض قنوات البث المتاحة
        if (match.broadcast?.length > 0) {
            const channels = getArabicBroadcasters(match.broadcast);
            if (channels.length > 0) {
                DOM.channelList.innerHTML = channels.map(c => `
                    <button class="channel-btn ${c === selectedChannel ? 'active' : ''}" 
                            data-channel="${c}">
                        ${c}
                    </button>
                `).join('');

                // إضافة أحداث تغيير القناة
                document.querySelectorAll('.channel-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const newChannel = btn.dataset.channel;
                        window.location.href = `watch.html?id=${matchId}&channel=${newChannel}`;
                    });
                });
            }
        }
    }

    function setupLiveStream(channel) {
        const CHANNEL_URLS = {
            'bein-sports-hd1': 'https://z.alkoora.live/albaplayer/on-time-sport-1/',
            'bein-sports-hd2': 'https://example-stream.com/bein2',
            'bein-sports-hd3': 'https://example-stream.com/bein3',
            'ad-sports-premium1': 'https://example-stream.com/adsports1'
            // أضف روابط القنوات الفعلية هنا
        };

        const streamUrl = CHANNEL_URLS[channel] || CHANNEL_URLS['bein-sports-hd1'];
        
        DOM.videoFrame.innerHTML = `
            <iframe src="${streamUrl}" 
                    frameborder="0" 
                    allowfullscreen
                    allow="autoplay"
                    class="live-stream"></iframe>
        `;
    }

    function getArabicBroadcasters(broadcastData) {
        const ARABIC_CHANNELS = {
            'bein-sports-hd1': 'bein SPORTS HD1',
            'bein-sports-hd2': 'bein SPORTS HD2',
            'bein-sports-hd3': 'bein SPORTS HD3',
            'ad-sports-premium1': 'AD SPORTS PREMIUM1'
        };

        return broadcastData
            .filter(b => b && b.name)
            .map(b => {
                const cleanName = b.name.toLowerCase().replace(/\s+/g, '-');
                const matchedKey = Object.keys(ARABIC_CHANNELS).find(key => 
                    cleanName.includes(key.toLowerCase())
                );
                return matchedKey ? ARABIC_CHANNELS[matchedKey] : null;
            })
            .filter(Boolean)
            .filter((v, i, a) => a.indexOf(v) === i);
    }

    function formatDate(dateStr) {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Africa/Casablanca'
        };
        return new Date(dateStr).toLocaleDateString('ar-MA', options);
    }

    function showLoading() {
        DOM.loading.style.display = 'flex';
        DOM.matchContainer.style.display = 'none';
    }

    function hideLoading() {
        DOM.loading.style.display = 'none';
        DOM.matchContainer.style.display = 'block';
    }

    function showError(message) {
        DOM.errorContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                <button onclick="window.location.href='index.html'">العودة للصفحة الرئيسية</button>
            </div>
        `;
        hideLoading();
    }
});
