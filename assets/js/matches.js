import { fetchMatches } from './api.js';

// إعدادات التخزين المؤقت
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 ساعة
const CACHE_KEY = 'football-matches-cache';

// عناصر DOM
const elements = {
    featuredContainer: document.getElementById('featured-matches'),
    broadcastContainer: document.getElementById('broadcast-matches'),
    todayContainer: document.getElementById('today-matches'),
    tomorrowContainer: document.getElementById('tomorrow-matches'),
    upcomingContainer: document.getElementById('upcoming-matches'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    sliderDots: document.querySelector('.slider-dots'),
    prevBtn: document.querySelector('.slider-prev'),
    nextBtn: document.querySelector('.slider-next'),
    loadingIndicator: document.querySelector('.loader-container')
};

// البطولات المميزة (دوري الأبطال، الإنجليزي، الإسباني، الإيطالي)
const featuredLeagues = [2, 39, 140, 135];

// المباريات المنقولة المحددة (يمكن تغييرها حسب الحاجة)
const broadcastMatchesIds = [/* أضف IDs المباريات المنقولة هنا */];

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        
        // جلب البيانات مع التخزين المؤقت
        const matchesData = await getCachedMatches();
        const categorized = categorizeMatches(matchesData);
        
        renderFeaturedMatches(categorized.featured);
        renderBroadcastMatches(categorized.all.filter(m => broadcastMatchesIds.includes(m.fixture.id)));
        renderAllMatches(categorized);
        
        setupTabs();
        setupSlider();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showError('حدث خطأ في جلب البيانات. جارٍ عرض آخر بيانات متاحة...');
        tryFallbackCache();
    } finally {
        hideLoading();
    }
});

// نظام التخزين المؤقت
async function getCachedMatches() {
    // محاولة جلب البيانات من الكاش
    const cachedData = getValidCache();
    if (cachedData) return cachedData;
    
    // جلب بيانات جديدة من API
    const freshData = await fetchMatches();
    
    // تخزين البيانات الجديدة
    localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: freshData,
        timestamp: Date.now()
    }));
    
    return freshData;
}

function getValidCache() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    return (Date.now() - timestamp < CACHE_DURATION) ? data : null;
}

function tryFallbackCache() {
    const cachedData = getValidCache();
    if (cachedData) {
        const categorized = categorizeMatches(cachedData);
        renderFeaturedMatches(categorized.featured);
        renderAllMatches(categorized);
    }
}

// تصنيف المباريات
function categorizeMatches(matches) {
    const today = new Date().toDateString();
    const tomorrow = new Date(Date.now() + 86400000).toDateString();
    
    return {
        today: filterByDate(matches, today),
        tomorrow: filterByDate(matches, tomorrow),
        upcoming: matches.filter(m => new Date(m.fixture.date) > new Date(tomorrow)),
        featured: matches.filter(m => featuredLeagues.includes(m.league.id)),
        all: matches
    };
}

function filterByDate(matches, dateString) {
    return matches.filter(m => 
        new Date(m.fixture.date).toDateString() === dateString
    );
}

// عرض المباريات
function renderFeaturedMatches(matches) {
    if (!matches?.length) {
        elements.featuredContainer.innerHTML = '<p>لا توجد مباريات مميزة اليوم</p>';
        return;
    }

    // تقسيم إلى مجموعات كل 4 مباريات
    const groupedMatches = [];
    for (let i = 0; i < matches.length; i += 4) {
        groupedMatches.push(matches.slice(i, i + 4));
    }

    renderSlider(groupedMatches);
}

function renderSlider(groups) {
    let currentIndex = 0;
    
    function showGroup(index) {
        elements.featuredContainer.innerHTML = groups[index].map(createFeaturedCard).join('');
        updateDots(index);
        currentIndex = index;
    }

    function updateDots(index) {
        document.querySelectorAll('.dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    // إنشاء نقاط التوجيه
    elements.sliderDots.innerHTML = groups.map((_, i) => 
        `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
    ).join('');

    // الأحداث
    elements.prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + groups.length) % groups.length;
        showGroup(currentIndex);
    });

    elements.nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % groups.length;
        showGroup(currentIndex);
    });

    // التبديل التلقائي كل 20 ثانية
    let interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % groups.length;
        showGroup(currentIndex);
    }, 20000);

    // إيقاف المؤقت عند التفاعل
    elements.sliderDots.addEventListener('click', (e) => {
        if (e.target.classList.contains('dot')) {
            clearInterval(interval);
            showGroup(parseInt(e.target.dataset.index));
            interval = setInterval(/*...*/); // إعادة التشغيل
        }
    });

    // عرض المجموعة الأولى
    showGroup(0);
}

function renderBroadcastMatches(matches) {
    const toShow = matches.slice(0, 5); // عرض أول 5 مباريات فقط
    elements.broadcastContainer.innerHTML = toShow.length
        ? toShow.map(createBroadcastCard).join('')
        : '<p>لا توجد مباريات منقولة اليوم</p>';
}

function renderAllMatches({ today, tomorrow, upcoming }) {
    elements.todayContainer.innerHTML = renderMatchList(today, 'اليوم');
    elements.tomorrowContainer.innerHTML = renderMatchList(tomorrow, 'غداً');
    elements.upcomingContainer.innerHTML = renderMatchList(upcoming, 'القادمة');
}

function renderMatchList(matches, title) {
    return matches?.length
        ? `<h3>مباريات ${title}</h3>` + matches.map(createMatchCard).join('')
        : `<p class="no-matches">لا توجد مباريات ${title}</p>`;
}

// إنشاء البطاقات
function createFeaturedCard(match) {
    return `
        <div class="featured-card" data-id="${match.fixture.id}">
            <div class="league-info">
                <img src="${match.league.logo}" alt="${match.league.name}" onerror="this.style.display='none'">
                <span>${match.league.name}</span>
            </div>
            <div class="teams">
                <div class="team">
                    <img src="${match.teams.home.logo}" alt="${match.teams.home.name}" onerror="this.src='assets/images/default-team.png'">
                    <span>${match.teams.home.name}</span>
                </div>
                <div class="vs">VS</div>
                <div class="team">
                    <img src="${match.teams.away.logo}" alt="${match.teams.away.name}" onerror="this.src='assets/images/default-team.png'">
                    <span>${match.teams.away.name}</span>
                </div>
            </div>
            <div class="match-info">
                <span><i class="fas fa-clock"></i> ${formatDate(match.fixture.date)}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${match.fixture.venue?.name || 'غير محدد'}</span>
            </div>
        </div>
    `;
}

function createBroadcastCard(match) {
    return `
        <div class="broadcast-card" data-id="${match.fixture.id}">
            <div class="teams">
                <span>${match.teams.home.name}</span>
                <span class="vs">VS</span>
                <span>${match.teams.away.name}</span>
            </div>
            <div class="match-details">
                <span><i class="fas fa-trophy"></i> ${match.league.name}</span>
                <span><i class="fas fa-clock"></i> ${formatDate(match.fixture.date)}</span>
            </div>
            <button class="watch-btn" onclick="navigateToWatchPage(${match.fixture.id})">
                <i class="fas fa-play"></i> مشاهدة البث المباشر
            </button>
        </div>
    `;
}

function createMatchCard(match) {
    return `
        <div class="match-card" data-id="${match.fixture.id}">
            <div class="league-info">
                <img src="${match.league.logo}" alt="${match.league.name}" onerror="this.style.display='none'">
                <span>${match.league.name}</span>
            </div>
            <div class="teams">
                <div class="team">
                    <img src="${match.teams.home.logo}" alt="${match.teams.home.name}" onerror="this.src='assets/images/default-team.png'">
                    <span>${match.teams.home.name}</span>
                </div>
                <div class="vs">VS</div>
                <div class="team">
                    <img src="${match.teams.away.logo}" alt="${match.teams.away.name}" onerror="this.src='assets/images/default-team.png'">
                    <span>${match.teams.away.name}</span>
                </div>
            </div>
            <div class="match-info">
                <span><i class="fas fa-clock"></i> ${formatDate(match.fixture.date)}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${match.fixture.venue?.name || 'غير محدد'}</span>
            </div>
        </div>
    `;
}

// أدوات مساعدة
function formatDate(dateStr) {
    const options = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Africa/Casablanca'
    };
    return new Date(dateStr).toLocaleString('ar-MA', options);
}

function setupTabs() {
    elements.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // إزالة التنشيط من جميع الأزرار
            elements.tabButtons.forEach(b => b.classList.remove('active'));
            
            // تنشيط الزر الحالي
            btn.classList.add('active');
            
            // إخفاء جميع المحتويات
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // إظهار المحتوى المحدد
            document.getElementById(`${btn.dataset.tab}-matches`).classList.add('active');
        });
    });
}

// التحكم في الواجهة
function showLoading() {
    elements.loadingIndicator.style.display = 'flex';
}

function hideLoading() {
    elements.loadingIndicator.style.display = 'none';
}

function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    document.querySelector('main').prepend(errorEl);
}

// الانتقال لصفحة المشاهدة
window.navigateToWatchPage = function(matchId) {
    // يمكنك تغيير هذا حسب نظام التوجيه في تطبيقك
    window.location.href = `watch.html?matchId=${matchId}`;
    
    // أو فتح في نافذة جديدة:
    // window.open(`watch.html?matchId=${matchId}`, '_blank');
};

// مسح الكاش يدوياً إذا لزم الأمر
window.clearMatchesCache = function() {
    localStorage.removeItem(CACHE_KEY);
    location.reload();
};
