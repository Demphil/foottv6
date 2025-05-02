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

        // تحميل بيانات المباراة من API
        const matchData = await fetchMatchData(matchId);
        if (!matchData) {
            showError('بيانات غير متوفرة', 'تعذر تحميل بيانات المباراة');
            return;
        }

        // تحميل بيانات القنوات من API
        const channelsData = await fetchChannelsData();
        if (!channelsData) {
            showError('بيانات غير متوفرة', 'تعذر تحميل بيانات القنوات');
            return;
        }

        // العثور على بيانات القناة المحددة
        const channelData = channelsData.find(ch => ch.key === channelKey);
        if (!channelData) {
            showError('قناة غير متوفرة', 'تعذر العثور على بيانات القناة');
            return;
        }

        // عرض البيانات
        renderMatchInfo(matchData);
        renderChannelInfo(channelData);
        loadStream(channelData);

        // تحميل القنوات البديلة
        renderAlternativeChannels(matchData, channelKey, channelsData);

        // تسجيل المشاهدة
        logView(matchId, channelData.name);

    } catch (error) {
        console.error('Error:', error);
        showError('حدث خطأ', 'تعذر تحميل الصفحة بشكل كامل');
    }
});

// 2. دالة لجلب بيانات المباراة من API
async function fetchMatchData(matchId) {
    try {
        const response = await fetch(`https://api.example.com/matches/${matchId}`);
        if (!response.ok) throw new Error('Failed to fetch match data');
        return await response.json();
    } catch (error) {
        console.error('Error fetching match data:', error);
        return null;
    }
}

// 3. دالة لجلب بيانات القنوات من API
async function fetchChannelsData() {
    try {
        const response = await fetch('https://api.example.com/channels');
        if (!response.ok) throw new Error('Failed to fetch channels data');
        return await response.json();
    } catch (error) {
        console.error('Error fetching channels data:', error);
        return null;
    }
}

// 4. عرض بيانات المباراة
function renderMatchInfo(match) {
    // عنوان الصفحة
    document.title = `${match.teams.home.name} vs ${match.teams.away.name} - كورة لايف`;
    
    // تحديث عناصر واجهة المستخدم
    const elements = {
        'match-title': `${match.teams.home.name} vs ${match.teams.away.name}`,
        'home-name': match.teams.home.name,
        'away-name': match.teams.away.name,
        'home-logo': match.teams.home.logo,
        'away-logo': match.teams.away.logo,
        'league-name': match.league.name,
        'league-logo': match.league.logo,
        'match-venue': match.fixture.venue?.name || 'غير معروف',
        'match-date': formatMatchDate(match.fixture.date),
        'match-status': getMatchStatus(match.fixture.status)
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (id.includes('-logo')) {
                element.src = value || 'assets/images/default-team.png';
                element.onerror = () => {
                    element.src = 'assets/images/default-team.png';
                };
            } else {
                element.textContent = value;
            }
        }
    });
}

// 5. عرض معلومات القناة
function renderChannelInfo(channel) {
    const channelNameElement = document.getElementById('channel-name');
    const channelLogoElement = document.getElementById('channel-logo');
    
    if (channelNameElement) channelNameElement.textContent = channel.name;
    if (channelLogoElement) {
        channelLogoElement.src = channel.logo || 'assets/images/default-channel.png';
        channelLogoElement.onerror = () => {
            channelLogoElement.src = 'assets/images/default-channel.png';
        };
    }
}

// 6. تحميل البث المباشر
function loadStream(channelData) {
    const iframe = document.getElementById('stream-iframe');
    const loader = document.querySelector('.video-container .loader');
    const errorContainer = document.querySelector('.stream-error');

    // إخفاء العناصر غير الضرورية
    if (iframe) iframe.style.display = 'none';
    if (errorContainer) errorContainer.style.display = 'none';
    if (loader) loader.style.display = 'flex';

    // تأخير لمحاكاة التحميل (يمكن إزالته في الإنتاج)
    setTimeout(() => {
        if (channelData && channelData.streamUrl) {
            if (iframe) {
                iframe.src = channelData.streamUrl;
                iframe.style.display = 'block';
                iframe.onerror = () => showStreamError();
            }
            if (loader) loader.style.display = 'none';
        } else {
            showStreamError();
        }
    }, 1000);
}

// 7. عرض القنوات البديلة
function renderAlternativeChannels(match, currentChannelKey, channelsData) {
    const channelsList = document.getElementById('channels-list');
    if (!channelsList) return;
    
    // تصفية القنوات المتاحة لهذه المباراة
    const availableChannels = match.tv_channels || [];
    const alternativeChannels = channelsData.filter(ch => 
        availableChannels.includes(ch.name) && ch.key !== currentChannelKey
    );

    if (alternativeChannels.length === 0) {
        const container = document.querySelector('.alternative-channels');
        if (container) container.style.display = 'none';
        return;
    }

    // بناء واجهة القنوات البديلة
    channelsList.innerHTML = alternativeChannels.map(channel => `
        <div class="channel-item" data-channel="${channel.key}">
            <img src="${channel.logo}" alt="${channel.name}" 
                 onerror="this.src='assets/images/default-channel.png'">
            <span>${channel.name}</span>
            <button class="switch-btn">تبديل</button>
        </div>
    `).join('');

    // إضافة مستمعات الأحداث
    document.querySelectorAll('.channel-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('switch-btn')) {
                const channelKey = item.dataset.channel;
                switchChannel(channelKey);
            }
        });
    });
}

// 8. وظائف مساعدة
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

function showStreamError() {
    const iframe = document.getElementById('stream-iframe');
    const loader = document.querySelector('.video-container .loader');
    const errorContainer = document.querySelector('.stream-error');

    if (iframe) iframe.style.display = 'none';
    if (loader) loader.style.display = 'none';
    if (errorContainer) {
        errorContainer.style.display = 'flex';
        errorContainer.querySelector('.retry-btn')?.addEventListener('click', () => {
            const params = new URLSearchParams(window.location.search);
            const channelKey = params.get('channel');
            if (channelKey) {
                fetchChannelsData().then(channels => {
                    const channel = channels.find(ch => ch.key === channelKey);
                    if (channel) loadStream(channel);
                });
            }
        });
    }
}

function switchChannel(channelKey) {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('id');
    
    if (matchId && channelKey) {
        window.history.replaceState({}, '', `watch.html?id=${matchId}&channel=${channelKey}`);
        fetchChannelsData().then(channels => {
            const channel = channels.find(ch => ch.key === channelKey);
            if (channel) {
                renderChannelInfo(channel);
                loadStream(channel);
                showToast(`تم التبديل إلى ${channel.name}`);
            }
        });
    }
}

function logView(matchId, channelName) {
    try {
        const history = JSON.parse(localStorage.getItem('viewingHistory') || '[]');
        const newHistory = [{ matchId, channel: channelName, timestamp: new Date().toISOString() }, ...history.slice(0, 49)];
        localStorage.setItem('viewingHistory', JSON.stringify(newHistory));
    } catch (error) {
        console.error('Error saving view history:', error);
    }
}

function showError(title, message) {
    const header = document.querySelector('.watch-header h1');
    const videoContainer = document.querySelector('.video-container');
    
    if (header) header.textContent = title;
    if (videoContainer) {
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
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 100);
}
