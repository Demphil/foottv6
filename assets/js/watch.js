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
        otherMatches: document.getElementById('other-matches'),
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

        // 5. الحصول على 4 مباريات أخرى عشوائية (غير المباراة الحالية)
        const otherMatches = getOtherMatches(matchesData, matchId, 4);

        // 6. عرض معلومات المباراة والمباريات الأخرى
        renderMatchDetails(match, channel, otherMatches);

        // 7. إعداد البث المباشر
        setupLiveStream(channel);

    } catch (error) {
        console.error('Error:', error);
        showError('حدث خطأ أثناء جلب بيانات المباراة');
    } finally {
        hideLoading();
    }

    // 8. أحداث الأزرار
    DOM.backButton.addEventListener('click', () => {
        window.history.back();
    });

    // ----- الدوال المساعدة ----- //

    async function getMatchesData() {
        const CACHE_KEY = 'football-matches-cache-v8';
        const cached = localStorage.getItem(CACHE_KEY);
        
        if (cached) {
            try {
                const { data } = JSON.parse(cached);
                return data;
            } catch {
                return await fetchFreshMatches();
            }
        }
        return await fetchFreshMatches();
    }

    async function fetchFreshMatches() {
        try {
            const response = await fetch('assets/data/matches.json');
            if (!response.ok) throw new Error('Failed to fetch matches');
            return await response.json();
        } catch (error) {
            console.error('Error fetching matches:', error);
            throw error;
        }
    }

    function findMatchById(matches, id) {
        return matches.find(m => m.id == id);
    }

    function getOtherMatches(matches, currentMatchId, count) {
        return matches
            .filter(m => m.id != currentMatchId)
            .sort(() => 0.5 - Math.random())
            .slice(0, count);
    }

    function renderMatchDetails(match, selectedChannel, otherMatches) {
        const { homeTeam, awayTeam, league, date, venue, score, time } = match;
        
        // عرض معلومات المباراة الرئيسية
        DOM.matchInfo.innerHTML = `
            <div class="match-header">
                <div class="league-info">
                    <img src="${league?.logo || 'default-league.png'}" 
                         alt="${league?.name || 'بطولة غير معروفة'}" 
                         class="league-logo"
                         onerror="this.src='default-league.png'">
                    <h2>${league?.name || 'بطولة غير معروفة'}</h2>
                </div>
                <div class="teams">
                    <div class="team">
                        <img src="${homeTeam.logo || 'default-team.png'}" 
                             alt="${homeTeam.name}"
                             onerror="this.src='default-team.png'">
                        <h3>${homeTeam.name}</h3>
                    </div>
                    <div class="vs">${score || 'VS'}</div>
                    <div class="team">
                        <img src="${awayTeam.logo || 'default-team.png'}" 
                             alt="${awayTeam.name}"
                             onerror="this.src='default-team.png'">
                        <h3>${awayTeam.name}</h3>
                    </div>
                </div>
                <div class="match-meta">
                    <p><i class="fas fa-calendar-alt"></i> ${formatDate(date)}</p>
                    <p><i class="fas fa-clock"></i> ${time || formatTime(date)}</p>
                    ${venue ? `<p><i class="fas fa-map-marker-alt"></i> ${venue}</p>` : ''}
                </div>
            </div>
        `;

        // عرض القنوات المتاحة
        renderChannels(match, selectedChannel);

        // عرض المباريات الأخرى
        renderOtherMatches(otherMatches);
    }

    function renderChannels(match, selectedChannel) {
        const channels = getAvailableChannels(match);
        if (channels.length > 0) {
            DOM.channelList.innerHTML = `
                <h3 class="section-title">القنوات الناقلة:</h3>
                <div class="channels-container">
                    ${channels.map(c => `
                        <button class="channel-btn ${c.key === selectedChannel ? 'active' : ''}" 
                                data-channel="${c.key}">
                            ${c.name}
                        </button>
                    `).join('')}
                </div>
            `;

            // إضافة أحداث تغيير القناة
            document.querySelectorAll('.channel-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const newChannel = btn.dataset.channel;
                    window.location.href = `watch.html?id=${matchId}&channel=${newChannel}`;
                });
            });
        }
    }

    function getAvailableChannels(match) {
        // 1. التحقق من القنوات اليدوية أولاً
        if (match.manualChannels) {
            return match.manualChannels.map(name => ({
                name,
                key: getChannelKey(name)
            }));
        }
        
        // 2. التحقق من القنوات في بيانات المباراة
        const channels = [];
        if (match.broadcast) {
            match.broadcast.forEach(b => {
                const channelName = getArabicChannelName(b.name);
                if (channelName) {
                    channels.push({
                        name: channelName,
                        key: getChannelKey(channelName)
                    });
                }
            });
        }
        
        // 3. إزالة التكرارات
        return channels.filter((c, i, a) => 
            a.findIndex(cc => cc.key === c.key) === i
        );
    }

    function renderOtherMatches(matches) {
        if (matches.length > 0) {
            DOM.otherMatches.innerHTML = `
                <h3 class="section-title">مباريات أخرى مباشرة:</h3>
                <div class="matches-grid">
                    ${matches.map(m => createMatchCard(m)).join('')}
                </div>
            `;
            
            // إضافة أحداث النقر للبطاقات
            document.querySelectorAll('.match-card').forEach(card => {
                card.addEventListener('click', () => {
                    const matchId = card.dataset.id;
                    const channel = card.dataset.channel;
                    if (matchId && channel) {
                        window.location.href = `watch.html?id=${matchId}&channel=${channel}`;
                    }
                });
            });
        }
    }

    function createMatchCard(match) {
        const { id, homeTeam, awayTeam, league, date, time, score } = match;
        const channels = getAvailableChannels(match);
        const mainChannel = channels.length > 0 ? channels[0].key : '';
        
        return `
            <div class="match-card" data-id="${id}" data-channel="${mainChannel}">
                <div class="card-header">
                    <img src="${league?.logo || 'default-league.png'}" 
                         alt="${league?.name || 'بطولة غير معروفة'}" 
                         class="league-logo"
                         onerror="this.src='default-league.png'">
                    <span class="league-name">${league?.name || 'بطولة غير معروفة'}</span>
                </div>
                <div class="teams">
                    <div class="team">
                        <img src="${homeTeam.logo || 'default-team.png'}" 
                             alt="${homeTeam.name}"
                             onerror="this.src='default-team.png'">
                        <span class="team-name">${homeTeam.name}</span>
                    </div>
                    <div class="vs">${score || 'VS'}</div>
                    <div class="team">
                        <img src="${awayTeam.logo || 'default-team.png'}" 
                             alt="${awayTeam.name}"
                             onerror="this.src='default-team.png'">
                        <span class="team-name">${awayTeam.name}</span>
                    </div>
                </div>
                <div class="match-time">
                    <i class="fas fa-clock"></i> ${time || formatTime(date)}
                </div>
                ${channels.length > 0 ? `
                    <div class="match-channel">
                        <i class="fas fa-tv"></i> ${channels[0].name}
                    </div>
                ` : ''}
            </div>
        `;
    }

    function setupLiveStream(channel) {
        const CHANNEL_URLS = {
            'bein-sports-hd1': 'https://stream.sainaertebat.com/hls2/bein1.m3u8',
            'bein-sports-hd2': 'https://z.alkoora.live/albaplayer/on-time-sport-2/',
            'bein-sports-hd3': 'https://z.alkoora.live/albaplayer/on-time-sport-3/',
            'bein-sports-hd4': 'https://yallateri.com/albaplayer/yalla-live-4/',
            'bein-sports-hd5': 'https://12.naba24.net/albaplayer/bn5',
            'bein-sports-hd6': 'https://yallateri.com/albaplayer/yalla-live-6/',
            'ad-sports-premium1': 'https://yallateri.com/albaplayer/yalla-live-7',
            'ssc-hd1': 'https://watch.3rbcafee.com/2024/10/sscnew-prem.html?id=SSC1',
            'ssc-hd2': 'https://watch.3rbcafee.com/2024/10/sscnew-prem.html?id=SSC2',
            'ssc-extra1': 'https://hegazy-iptv5.ddns.net:443/amro8577/amro8577/49.ts',
            'ssc-extra2': 'https://watch.3rbcafee.com/2024/10/sscnew-prem.html?id=SSC_EXTRA2',
            'ssc-extra3': 'https://watch.3rbcafee.com/2024/10/sscnew-prem.html?id=SSC_EXTRA3',
            'Arryadia-HD': 'https://snrt.player.easybroadcast.io/events/73_arryadia_k2tgcj0',
            'Almaghribia': 'https://snrt.player.easybroadcast.io/events/73_almaghribia_83tz85q',
            'one-time-sports1': 'https://www.youtube.com/embed/s3VHPNVxmqk'
        };

        const streamUrl = CHANNEL_URLS[channel] || CHANNEL_URLS['bein-sports-hd1'];
        
        DOM.videoFrame.innerHTML = `
            <div class="video-container">
                <video id="hls-video" controls></video>
            </div>
        `;

        const video = document.getElementById('hls-video');
        
        if (streamUrl.includes('.m3u8')) {
            // تشغيل روابط HLS باستخدام hls.js
            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(streamUrl);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    video.play().catch(e => {
                        console.error('Auto-play failed:', e);
                        showError('تعذر التشغيل التلقائي. الرجاء تشغيل الفيديو يدوياً');
                    });
                });
                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        switch(data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                showError('خطأ في الشبكة. جاري المحاولة مرة أخرى...');
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                showError('خطأ في الوسائط. جاري إعادة المحاولة...');
                                hls.recoverMediaError();
                                break;
                            default:
                                showError('تعذر تحميل البث المباشر');
                                break;
                        }
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // دعم HLS الأصلي لمتصفحات Safari
                video.src = streamUrl;
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch(e => {
                        console.error('Auto-play failed:', e);
                        showError('تعذر التشغيل التلقائي. الرجاء تشغيل الفيديو يدوياً');
                    });
                });
            } else {
                showError('المتصفح لا يدعم تشغيل هذا النوع من البث');
            }
        } else {
            // تشغيل روابط iframe العادية
            DOM.videoFrame.innerHTML = `
                <div class="video-container">
                    <iframe src="${streamUrl}" 
                            frameborder="0" 
                            allowfullscreen
                            allow="autoplay"
                            class="live-stream"></iframe>
                </div>
            `;
        }
    }

    function getArabicChannelName(broadcasterName) {
        const ARABIC_CHANNELS = {
            'bein-sports-hd1': 'bein SPORTS HD1',
            'bein-sports-hd2': 'bein SPORTS HD2',
            'bein-sports-hd3': 'bein SPORTS HD3',
            'bein-sports-hd4': 'bein SPORTS HD4',
            'bein-sports-hd5': 'bein SPORTS HD5',
            'bein-sports-hd6': 'bein SPORTS HD6',
            'ad-sports-premium1': 'AD SPORTS PREMIUM1',
            'SSC-HD1': 'SSC HD1',
            'SSC-EXTRA2': 'SSC EXTRA2',
            'SSC-EXTRA1': 'SSC EXTRA1',
            'SSC-EXTRA3': 'SSC EXTRA3',
            'Arryadia-HD': 'Arryadia HD',
            'Almaghribia': 'Almaghribia',
            'one-time-sports1': 'one time sports1'
        };

        if (!broadcasterName) return null;
        
        const cleanName = broadcasterName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/_/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        
        const matchedKey = Object.keys(ARABIC_CHANNELS).find(key => 
            cleanName.includes(key.toLowerCase())
        );
        
        return matchedKey ? ARABIC_CHANNELS[matchedKey] : null;
    }

    function getChannelKey(channelName) {
        const CHANNEL_MAP = {
            'bein SPORTS HD1': 'bein-sports-hd1',
            'bein SPORTS HD2': 'bein-sports-hd2',
            'bein SPORTS HD3': 'bein-sports-hd3',
            'bein SPORTS HD4': 'bein-sports-hd4',
            'bein SPORTS HD5': 'bein-sports-hd5',
            'bein SPORTS HD6': 'bein-sports-hd6',
            'AD SPORTS PREMIUM1': 'ad-sports-premium1',
            'SSC HD1': 'ssc-hd1',
            'SSC EXTRA2': 'ssc-extra2',
            'SSC EXTRA1': 'ssc-extra1',
            'SSC EXTRA3': 'ssc-extra3',
            'Arryadia HD': 'Arryadia-HD',
            'Almaghribia': 'Almaghribia',
            'one time sports1': 'one-time-sports1'
        };
        return CHANNEL_MAP[channelName] || '';
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

    function formatTime(dateStr) {
        const options = { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Africa/Casablanca'
        };
        return new Date(dateStr).toLocaleTimeString('ar-MA', options);
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
