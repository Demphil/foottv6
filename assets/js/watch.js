// js/watch.js
document.addEventListener('DOMContentLoaded', function() {
    // 1. الحصول على معرف المباراة من URL
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('id');
    
    if (!matchId) {
        redirectToMatchesPage();
        return;
    }

    // 2. جلب بيانات المباراة
    loadMatchData(matchId);
});

function redirectToMatchesPage() {
    window.location.href = 'matches.html';
}

async function loadMatchData(matchId) {
    try {
        // الطريقة الأولى: من ملف matches.js إذا كان متاحاً بشكل عام
        if (typeof window.matchesData !== 'undefined') {
            const matchData = findMatchInLocalData(matchId);
            if (matchData) {
                displayMatchData(matchData);
                return;
            }
        }
        
        // الطريقة الثانية: من API إذا كان متاحاً
        const apiMatch = await fetchMatchFromAPI(matchId);
        if (apiMatch) {
            displayMatchData(apiMatch);
            return;
        }
        
        // إذا لم يتم العثور على المباراة
        showNotFoundError();
    } catch (error) {
        console.error('Error loading match data:', error);
        showLoadError();
    }
}

// البحث في البيانات المحلية (من matches.js)
function findMatchInLocalData(matchId) {
    if (!window.matchesData || !Array.isArray(window.matchesData.matches)) {
        return null;
    }
    
    return window.matchesData.matches.find(match => match.id === matchId);
}

// جلب البيانات من API
async function fetchMatchFromAPI(matchId) {
    try {
        const response = await fetch(`/api/matches/${matchId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.warn('Failed to fetch from API, using local data:', error);
        return null;
    }
}

function displayMatchData(match) {
    // عرض معلومات الفريقين
    setTeamInfo('home', match.home_team);
    setTeamInfo('away', match.away_team);
    
    // النتيجة ووقت المباراة
    document.getElementById('match-score').textContent = 
        `${match.home_score} - ${match.away_score}`;
    document.getElementById('match-time').textContent = match.time;
    
    // تفاصيل المباراة
    document.getElementById('match-league').textContent = match.league;
    document.getElementById('match-stadium').textContent = match.stadium || 'غير محدد';
    document.getElementById('match-referee').textContent = match.referee || 'غير محدد';
    document.getElementById('match-date').textContent = formatMatchDate(match.date);
    
    // تحميل الفيديو
    setupVideoPlayer(match.stream_url || match.video_id);
    
    // إحصائيات وأحداث المباراة
    if (match.stats) updateMatchStats(match.stats);
    if (match.events) updateMatchEvents(match.events);
    
    // تحديث عنوان الصفحة
    document.title = `${match.home_team.name} vs ${match.away_team.name} | البث المباشر`;
}

function setTeamInfo(side, team) {
    const prefix = `team-${side}`;
    document.getElementById(`${prefix}-name`).textContent = team.name;
    
    const logoElem = document.getElementById(`${prefix}-logo`);
    logoElem.src = team.logo || '/images/default-team.png';
    logoElem.alt = `شعار ${team.name}`;
}

function formatMatchDate(dateString) {
    if (!dateString) return 'غير محدد';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ar-EG', options);
}

function setupVideoPlayer(videoSource) {
    const videoContainer = document.getElementById('video-container');
    
    if (!videoSource) {
        videoContainer.innerHTML = `
            <div class="video-error">
                <p>لا يتوفر بث مباشر حالياً</p>
                <img src="/images/default-video.jpg" alt="صورة بديلة">
            </div>
        `;
        return;
    }
    
    // إذا كان Video ID (مثال من YouTube)
    if (typeof videoSource === 'string' && videoSource.length === 11) {
        videoContainer.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${videoSource}?autoplay=1" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen></iframe>
        `;
    } 
    // إذا كان رابط فيديو مباشر
    else if (videoSource.startsWith('http')) {
        videoContainer.innerHTML = `
            <video controls autoplay>
                <source src="${videoSource}" type="video/mp4">
                متصفحك لا يدعم تشغيل الفيديو
            </video>
        `;
    }
}

function updateMatchStats(stats) {
    const statsContainer = document.getElementById('match-stats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = '';
    
    // إحصائيات أساسية
    const basicStats = [
        { name: 'تسديدات', home: stats.shots_on_target?.home, away: stats.shots_on_target?.away },
        { name: 'استحواذ', home: stats.possession?.home, away: stats.possession?.away },
        { name: 'ركنيات', home: stats.corners?.home, away: stats.corners?.away },
        { name: 'أخطاء', home: stats.fouls?.home, away: stats.fouls?.away }
    ];
    
    basicStats.forEach(stat => {
        if (!stat.home && !stat.away) return;
        
        const statElement = document.createElement('div');
        statElement.className = 'stat-row';
        statElement.innerHTML = `
            <span class="stat-value home-stat">${stat.home || '0'}</span>
            <span class="stat-name">${stat.name}</span>
            <span class="stat-value away-stat">${stat.away || '0'}</span>
        `;
        statsContainer.appendChild(statElement);
    });
}

function updateMatchEvents(events) {
    const eventsContainer = document.getElementById('match-events');
    if (!eventsContainer) return;
    
    eventsContainer.innerHTML = '';
    
    // تصنيف الأحداث حسب النوع للعرض
    const eventTypes = {
        goal: { emoji: '⚽', class: 'goal' },
        yellow_card: { emoji: '🟨', class: 'yellow-card' },
        red_card: { emoji: '🟥', class: 'red-card' },
        substitution: { emoji: '🔄', class: 'substitution' }
    };
    
    events.forEach(event => {
        const eventType = eventTypes[event.type] || { emoji: '🔹', class: 'other' };
        
        const eventElement = document.createElement('div');
        eventElement.className = `event-item ${eventType.class}`;
        eventElement.innerHTML = `
            <span class="event-time">${event.time}'</span>
            <span class="event-emoji">${eventType.emoji}</span>
            <span class="event-description">${event.description}</span>
            ${event.player ? `<span class="event-player">${event.player}</span>` : ''}
        `;
        eventsContainer.appendChild(eventElement);
    });
}

function showNotFoundError() {
    const mainContent = document.querySelector('main');
    mainContent.innerHTML = `
        <div class="error-message">
            <h2>لم يتم العثور على المباراة</h2>
            <p>المباراة المطلوبة غير متوفرة أو قد تكون قد انتهت</p>
            <a href="matches.html" class="back-button">العودة إلى قائمة المباريات</a>
        </div>
    `;
}

function showLoadError() {
    const mainContent = document.querySelector('main');
    mainContent.innerHTML = `
        <div class="error-message">
            <h2>حدث خطأ في التحميل</h2>
            <p>تعذر تحميل بيانات المباراة، يرجى المحاولة لاحقاً</p>
            <button onclick="location.reload()" class="retry-button">إعادة المحاولة</button>
        </div>
    `;
}

// التحكم في الفيديو
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('quality-btn')) {
        toggleVideoQuality();
    }
    
    if (e.target.classList.contains('fullscreen-btn')) {
        toggleFullscreen();
    }
});

function toggleVideoQuality() {
    // تنفيذ تغيير جودة الفيديو حسب المتاح
    console.log('جودة الفيديو تتغير...');
}

function toggleFullscreen() {
    const videoContainer = document.querySelector('.video-container');
    
    if (!document.fullscreenElement) {
        videoContainer.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}
