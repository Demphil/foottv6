// assets/js/watch.js

/**
 * متغيرات عامة
 */
let currentMatch = null;
let videoPlayer = null;
let qualityOptions = ['auto', '480p', '720p', '1080p'];
let currentQuality = 'auto';

/**
 * تهيئة الصفحة عند التحميل
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Watch page initialized');
    
    // التحقق من وجود معرف المباراة في URL
    const matchId = getMatchIdFromURL();
    if (!matchId) {
        showErrorPage('لا يوجد معرف مباراة', 'لم يتم تحديد مباراة للمشاهدة');
        return;
    }

    // تحميل بيانات المباراة
    loadMatchData(matchId);
    
    // إعداد مستمعين للأحداث
    setupEventListeners();
});

/**
 * الحصول على معرف المباراة من URL
 */
function getMatchIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

/**
 * تحميل بيانات المباراة من مصادر مختلفة
 */
async function loadMatchData(matchId) {
    showLoadingState();
    
    try {
        // المحاولة الأولى: جلب البيانات من localStorage إذا كانت حديثة
        const cachedData = getCachedMatchData(matchId);
        if (cachedData) {
            console.log('Using cached match data');
            displayMatchData(cachedData);
            return;
        }

        // المحاولة الثانية: جلب البيانات من API
        const apiData = await fetchMatchDataFromAPI(matchId);
        if (apiData) {
            console.log('Using API match data');
            cacheMatchData(matchId, apiData);
            displayMatchData(apiData);
            return;
        }

        // المحاولة الثالثة: جلب البيانات من ملف matches.js
        const localData = findMatchInLocalData(matchId);
        if (localData) {
            console.log('Using local match data');
            displayMatchData(localData);
            return;
        }

        // إذا لم يتم العثور على المباراة في أي مصدر
        showErrorPage('المباراة غير متوفرة', 'تعذر العثور على بيانات المباراة');
        
    } catch (error) {
        console.error('Failed to load match data:', error);
        showErrorPage('خطأ في التحميل', 'حدث خطأ أثناء تحميل بيانات المباراة');
    }
}

/**
 * جلب البيانات من localStorage
 */
function getCachedMatchData(matchId) {
    const cachedData = localStorage.getItem(`match_${matchId}`);
    if (!cachedData) return null;
    
    const parsedData = JSON.parse(cachedData);
    const cacheExpiry = 30 * 60 * 1000; // 30 دقيقة
    
    if (Date.now() - parsedData.timestamp < cacheExpiry) {
        return parsedData.data;
    }
    
    localStorage.removeItem(`match_${matchId}`);
    return null;
}

/**
 * تخزين البيانات في localStorage
 */
function cacheMatchData(matchId, data) {
    const cacheItem = {
        data: data,
        timestamp: Date.now()
    };
    localStorage.setItem(`match_${matchId}`, JSON.stringify(cacheItem));
}

/**
 * جلب بيانات المباراة من API
 */
async function fetchMatchDataFromAPI(matchId) {
    try {
        const response = await fetch(`https://api.matches.news/matches/${matchId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.warn('Failed to fetch from API:', error);
        return null;
    }
}

/**
 * البحث عن المباراة في البيانات المحلية (matches.js)
 */
function findMatchInLocalData(matchId) {
    if (!window.matchesData || !Array.isArray(window.matchesData.matches)) {
        return null;
    }
    
    return window.matchesData.matches.find(match => match.id === matchId || match._id === matchId);
}

/**
 * عرض بيانات المباراة في الصفحة
 */
function displayMatchData(matchData) {
    currentMatch = matchData;
    
    // عرض معلومات الفريقين
    displayTeamInfo('home', matchData.home_team);
    displayTeamInfo('away', matchData.away_team);
    
    // عرض النتيجة ووقت المباراة
    updateMatchScore(matchData.home_score, matchData.away_score);
    updateMatchTime(matchData.time);
    
    // عرض تفاصيل المباراة
    updateMatchDetails({
        league: matchData.league,
        stadium: matchData.stadium,
        referee: matchData.referee,
        date: matchData.date
    });
    
    // تحميل وإعداد مشغل الفيديو
    setupVideoPlayer(matchData.stream_url || matchData.video_id);
    
    // عرض إحصائيات المباراة
    if (matchData.stats) {
        updateMatchStats(matchData.stats);
    }
    
    // عرض أحداث المباراة
    if (matchData.events) {
        updateMatchEvents(matchData.events);
    }
    
    // تحديث عنوان الصفحة
    document.title = `${matchData.home_team.name} ضد ${matchData.away_team.name} | البث المباشر`;
    
    // إخفاء حالة التحميل
    hideLoadingState();
}

/**
 * عرض معلومات الفريق
 */
function displayTeamInfo(side, team) {
    const prefix = `team-${side}`;
    
    // اسم الفريق
    const nameElement = document.getElementById(`${prefix}-name`);
    if (nameElement) {
        nameElement.textContent = team.name;
    }
    
    // شعار الفريق
    const logoElement = document.getElementById(`${prefix}-logo`);
    if (logoElement) {
        logoElement.src = team.logo || 'assets/images/default-team.png';
        logoElement.alt = `شعار ${team.name}`;
    }
}

/**
 * تحديث نتيجة المباراة
 */
function updateMatchScore(homeScore, awayScore) {
    const homeScoreElement = document.getElementById('home-score');
    const awayScoreElement = document.getElementById('away-score');
    
    if (homeScoreElement) homeScoreElement.textContent = homeScore || '0';
    if (awayScoreElement) awayScoreElement.textContent = awayScore || '0';
}

/**
 * تحديث وقت المباراة
 */
function updateMatchTime(time) {
    const timeElement = document.getElementById('match-time');
    if (timeElement) {
        timeElement.textContent = time || '--:--';
    }
}

/**
 * تحديث تفاصيل المباراة
 */
function updateMatchDetails(details) {
    const leagueElement = document.getElementById('league');
    const stadiumElement = document.getElementById('stadium');
    const refereeElement = document.getElementById('referee');
    const dateElement = document.getElementById('match-date');
    
    if (leagueElement) leagueElement.textContent = details.league || 'غير محدد';
    if (stadiumElement) stadiumElement.textContent = details.stadium || 'غير محدد';
    if (refereeElement) refereeElement.textContent = details.referee || 'غير محدد';
    
    if (dateElement && details.date) {
        dateElement.textContent = formatMatchDate(details.date);
    }
}

/**
 * تنسيق تاريخ المباراة
 */
function formatMatchDate(dateString) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    try {
        return new Date(dateString).toLocaleDateString('ar-EG', options);
    } catch (e) {
        console.error('Error formatting date:', e);
        return dateString || 'غير محدد';
    }
}

/**
 * إعداد مشغل الفيديو
 */
function setupVideoPlayer(videoSource) {
    const videoContainer = document.getElementById('main-video');
    if (!videoContainer) return;
    
    // مسح المحتوى الحالي
    videoContainer.innerHTML = '';
    
    if (!videoSource) {
        showNoStreamAvailable();
        return;
    }
    
    // تحديد نوع الفيديو وإنشاء العنصر المناسب
    if (isYouTubeVideo(videoSource)) {
        setupYouTubePlayer(videoContainer, videoSource);
    } else if (isM3U8Stream(videoSource)) {
        setupHLSPlayer(videoContainer, videoSource);
    } else if (isMP4Video(videoSource)) {
        setupHTML5VideoPlayer(videoContainer, videoSource);
    } else {
        showUnsupportedStream();
    }
}

/**
 * التحقق إذا كان الفيديو من يوتيوب
 */
function isYouTubeVideo(source) {
    return typeof source === 'string' && 
          (source.length === 11 || // YouTube ID
           source.includes('youtube.com') || 
           source.includes('youtu.be'));
}

/**
 * إعداد مشغل يوتيوب
 */
function setupYouTubePlayer(container, videoId) {
    // إذا كان معرف فيديو فقط (11 حرف)
    if (videoId.length === 11) {
        videoId = `https://www.youtube.com/embed/${videoId}`;
    }
    
    // إذا كان رابط يوتيوب كامل
    const iframe = document.createElement('iframe');
    iframe.src = `${videoId}?autoplay=1&rel=0`;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    
    container.appendChild(iframe);
    videoPlayer = iframe;
}

/**
 * إعداد مشغل HLS للبث المباشر
 */
function setupHLSPlayer(container, streamUrl) {
    container.innerHTML = `
        <video id="hls-video" controls autoplay>
            <source src="${streamUrl}" type="application/x-mpegURL">
            متصفحك لا يدعم تشغيل هذا النوع من البث
        </video>
    `;
    
    const videoElement = document.getElementById('hls-video');
    videoPlayer = videoElement;
    
    // إذا كان متصفح يدعم HLS.js
    if (typeof Hls !== 'undefined') {
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(videoElement);
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // دعم Safari
        videoElement.src = streamUrl;
    } else {
        showUnsupportedStream();
    }
}

/**
 * إعداد مشغل فيديو HTML5 عادي
 */
function setupHTML5VideoPlayer(container, videoUrl) {
    container.innerHTML = `
        <video controls autoplay>
            <source src="${videoUrl}" type="video/mp4">
            متصفحك لا يدعم تشغيل الفيديو
        </video>
    `;
    
    videoPlayer = container.querySelector('video');
}

/**
 * عرض رسالة عدم توفر البث
 */
function showNoStreamAvailable() {
    const videoContainer = document.getElementById('main-video');
    if (!videoContainer) return;
    
    videoContainer.innerHTML = `
        <div class="no-stream">
            <i class="fas fa-video-slash"></i>
            <h3>لا يتوفر بث مباشر حالياً</h3>
            <p>سيتم عرض تسجيل المباراة فور انتهائها</p>
            <img src="assets/images/default-video.jpg" alt="صورة بديلة">
        </div>
    `;
}

/**
 * عرض رسالة عدم دعم البث
 */
function showUnsupportedStream() {
    const videoContainer = document.getElementById('main-video');
    if (!videoContainer) return;
    
    videoContainer.innerHTML = `
        <div class="unsupported-stream">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>نوع البث غير مدعوم</h3>
            <p>عذراً، لا يمكن تشغيل هذا النوع من البث على متصفحك الحالي</p>
            <a href="#" class="retry-button">حاول مرة أخرى</a>
        </div>
    `;
}

/**
 * تحديث إحصائيات المباراة
 */
function updateMatchStats(stats) {
    const statsContainer = document.getElementById('match-stats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = '';
    
    // الإحصائيات الأساسية
    const basicStats = [
        { name: 'تسديدات', home: stats.shots_on_target?.home, away: stats.shots_on_target?.away },
        { name: 'استحواذ', home: stats.possession?.home, away: stats.possession?.away },
        { name: 'ركنيات', home: stats.corners?.home, away: stats.corners?.away },
        { name: 'أخطاء', home: stats.fouls?.home, away: stats.fouls?.away },
        { name: 'تسلل', home: stats.offsides?.home, away: stats.offsides?.away }
    ];
    
    basicStats.forEach(stat => {
        if (stat.home === undefined && stat.away === undefined) return;
        
        const statElement = document.createElement('div');
        statElement.className = 'stat-row';
        
        // حساب النسب المئوية إذا كانت الإحصائيات رقمية
        const homeValue = stat.home || 0;
        const awayValue = stat.away || 0;
        const total = homeValue + awayValue;
        const homePercent = total > 0 ? Math.round((homeValue / total) * 100) : 50;
        const awayPercent = 100 - homePercent;
        
        statElement.innerHTML = `
            <div class="stat-value home-stat">${homeValue}</div>
            <div class="stat-bar-container">
                <div class="stat-bar home-bar" style="width: ${homePercent}%"></div>
                <div class="stat-name">${stat.name}</div>
                <div class="stat-bar away-bar" style="width: ${awayPercent}%"></div>
            </div>
            <div class="stat-value away-stat">${awayValue}</div>
        `;
        
        statsContainer.appendChild(statElement);
    });
}

/**
 * تحديث أحداث المباراة
 */
function updateMatchEvents(events) {
    const eventsContainer = document.getElementById('events-timeline');
    if (!eventsContainer) return;
    
    eventsContainer.innerHTML = '';
    
    // تصنيف الأحداث حسب النوع
    const eventTypes = {
        goal: { emoji: '⚽', class: 'goal', color: '#4CAF50' },
        yellow_card: { emoji: '🟨', class: 'yellow-card', color: '#FFEB3B' },
        red_card: { emoji: '🟥', class: 'red-card', color: '#F44336' },
        substitution: { emoji: '🔄', class: 'substitution', color: '#2196F3' },
        penalty: { emoji: '🎯', class: 'penalty', color: '#9C27B0' },
        var: { emoji: '📺', class: 'var', color: '#607D8B' }
    };
    
    // فرز الأحداث حسب الوقت
    const sortedEvents = [...events].sort((a, b) => {
        const timeA = parseInt(a.time) || 0;
        const timeB = parseInt(b.time) || 0;
        return timeA - timeB;
    });
    
    sortedEvents.forEach(event => {
        const eventType = eventTypes[event.type] || { 
            emoji: '🔹', 
            class: 'other', 
            color: '#9E9E9E' 
        };
        
        const eventElement = document.createElement('div');
        eventElement.className = `event-item ${eventType.class}`;
        eventElement.style.borderRight = `3px solid ${eventType.color}`;
        
        eventElement.innerHTML = `
            <div class="event-time">${event.time || '??'}'</div>
            <div class="event-icon" style="color: ${eventType.color}">${eventType.emoji}</div>
            <div class="event-details">
                <div class="event-description">${event.description || 'حدث غير معروف'}</div>
                ${event.player ? `<div class="event-player">${event.player}</div>` : ''}
            </div>
        `;
        
        eventsContainer.appendChild(eventElement);
    });
}

/**
 * إعداد مستمعي الأحداث
 */
function setupEventListeners() {
    // أزرار التحكم في الفيديو
    document.querySelector('.quality-btn')?.addEventListener('click', toggleQuality);
    document.querySelector('.fullscreen-btn')?.addEventListener('click', toggleFullscreen);
    
    // تحديث تلقائي للنتيجة ووقت المباراة (محاكاة)
    if (currentMatch?.live) {
        setInterval(updateLiveMatchData, 30000); // كل 30 ثانية
    }
}

/**
 * تبديل جودة الفيديو
 */
function toggleQuality() {
    if (!qualityOptions.length) return;
    
    const currentIndex = qualityOptions.indexOf(currentQuality);
    const nextIndex = (currentIndex + 1) % qualityOptions.length;
    currentQuality = qualityOptions[nextIndex];
    
    const qualityText = document.querySelector('.quality-text');
    if (qualityText) {
        qualityText.textContent = currentQuality.toUpperCase();
    }
    
    // هنا يمكنك تطبيق تغيير الجودة على مشغل الفيديو
    console.log('Changing quality to:', currentQuality);
}

/**
 * تبديل وضع ملء الشاشة
 */
function toggleFullscreen() {
    if (!videoPlayer) return;
    
    if (!document.fullscreenElement) {
        if (videoPlayer.requestFullscreen) {
            videoPlayer.requestFullscreen();
        } else if (videoPlayer.webkitRequestFullscreen) {
            videoPlayer.webkitRequestFullscreen();
        } else if (videoPlayer.msRequestFullscreen) {
            videoPlayer.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

/**
 * تحديث بيانات المباراة الحية (محاكاة)
 */
function updateLiveMatchData() {
    if (!currentMatch?.live) return;
    
    // هنا يمكنك جلب البيانات المحدثة من API
    console.log('Updating live match data...');
    
    // مثال لتحديث النتيجة عشوائياً (للتجربة فقط)
    if (Math.random() > 0.7) {
        const homeScore = parseInt(document.getElementById('home-score').textContent) || 0;
        document.getElementById('home-score').textContent = homeScore + 1;
    }
    
    if (Math.random() > 0.7) {
        const awayScore = parseInt(document.getElementById('away-score').textContent) || 0;
        document.getElementById('away-score').textContent = awayScore + 1;
    }
}

/**
 * عرض حالة التحميل
 */
function showLoadingState() {
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.classList.add('loading');
    }
}

/**
 * إخفاء حالة التحميل
 */
function hideLoadingState() {
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.classList.remove('loading');
    }
}

/**
 * عرض صفحة الخطأ
 */
function showErrorPage(title, message) {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="error-page">
            <div class="error-icon">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <h2>${title}</h2>
            <p>${message}</p>
            <div class="error-actions">
                <a href="matches.html" class="error-button">
                    <i class="fas fa-arrow-left"></i> العودة إلى المباريات
                </a>
                <button onclick="location.reload()" class="error-button">
                    <i class="fas fa-sync-alt"></i> إعادة تحميل
                </button>
            </div>
        </div>
    `;
}

/**
 * كشف الأخطاء الغير معالجة
 */
window.addEventListener('error', function(event) {
    console.error('Unhandled error:', event.error);
    showErrorPage('حدث خطأ غير متوقع', 'حدث خطأ في تطبيق الصفحة. يرجى المحاولة لاحقاً.');
});

// دعم HLS.js إذا كان متاحاً
if (typeof Hls !== 'undefined') {
    Hls.DefaultConfig.maxBufferLength = 30;
    Hls.DefaultConfig.maxMaxBufferLength = 600;
    Hls.DefaultConfig.maxBufferSize = 60 * 1000 * 1000;
    Hls.DefaultConfig.maxBufferHole = 0.5;
}
