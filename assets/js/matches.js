import { fetchMatches } from './api.js';

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
    nextBtn: document.querySelector('.slider-next')
};

// تعريف البطولات المميزة والمنقولة
const featuredLeagues = [2, 39, 140, 135]; // دوري الأبطال، الإنجليزي، الإسباني، الإيطالي
const broadcastMatchesIds = []; // سيتم تعبئتها من API أو قاعدة بياناتك

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    // تعيين سنة حقوق النشر
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    try {
        // جلب وعرض المباريات
        const matches = await fetchMatches();
        const categorized = categorizeMatches(matches);
        
        renderFeaturedMatches(categorized.featured);
        renderBroadcastMatches(categorized.featured); // يمكن استبدالها بمباريات منقولة محددة
        renderAllMatches(categorized);
        
        // إعداد التبويبات
        setupTabs();
        
        // إعداد السلايدر
        setupSlider();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showError('حدث خطأ في جلب البيانات. الرجاء المحاولة لاحقاً.');
    }
});

// تصنيف المباريات
function categorizeMatches(matches) {
    const today = new Date().toDateString();
    const tomorrow = new Date(Date.now() + 86400000).toDateString();
    
    return {
        today: matches.filter(match => new Date(match.fixture.date).toDateString() === today),
        tomorrow: matches.filter(match => new Date(match.fixture.date).toDateString() === tomorrow),
        upcoming: matches.filter(match => new Date(match.fixture.date) > new Date(tomorrow)),
        featured: matches.filter(match => featuredLeagues.includes(match.league.id))
    };
}

// عرض المباريات المميزة (4 مباريات مع تغيير كل 20 ثانية)
function renderFeaturedMatches(matches) {
    if (!matches || matches.length === 0) {
        elements.featuredContainer.innerHTML = '<p>لا توجد مباريات مميزة اليوم</p>';
        return;
    }

    // تقسيم المباريات إلى مجموعات كل 4 مباريات
    const groupedMatches = [];
    for (let i = 0; i < matches.length; i += 4) {
        groupedMatches.push(matches.slice(i, i + 4));
    }

    // عرض المجموعة الأولى
    elements.featuredContainer.innerHTML = groupedMatches[0].map(createFeaturedCard).join('');
    
    // إنشاء نقاط التحكم
    elements.sliderDots.innerHTML = groupedMatches.map((_, i) => 
        `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
    ).join('');

    // التبديل التلقائي
    let currentIndex = 0;
    const interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % groupedMatches.length;
        showSlide(currentIndex);
    }, 20000);

    // أحداث التحكم
    elements.prevBtn.addEventListener('click', () => {
        clearInterval(interval);
        currentIndex = (currentIndex - 1 + groupedMatches.length) % groupedMatches.length;
        showSlide(currentIndex);
    });

    elements.nextBtn.addEventListener('click', () => {
        clearInterval(interval);
        currentIndex = (currentIndex + 1) % groupedMatches.length;
        showSlide(currentIndex);
    });

    function showSlide(index) {
        elements.featuredContainer.innerHTML = groupedMatches[index].map(createFeaturedCard).join('');
        document.querySelectorAll('.dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        currentIndex = index;
    }
}

// عرض المباريات المنقولة (5 مباريات محددة)
function renderBroadcastMatches(matches) {
    // يمكنك تحديد 5 مباريات معينة هنا أو جلبها من API
    const broadcastMatches = matches.slice(0, 5); // مثال: أول 5 مباريات
    
    elements.broadcastContainer.innerHTML = broadcastMatches.length
        ? broadcastMatches.map(createBroadcastCard).join('')
        : '<p>لا توجد مباريات منقولة اليوم</p>';
}

// عرض جميع المباريات
function renderAllMatches({ today, tomorrow, upcoming }) {
    elements.todayContainer.innerHTML = today.length
        ? today.map(createMatchCard).join('')
        : '<p class="no-matches">لا توجد مباريات اليوم</p>';

    elements.tomorrowContainer.innerHTML = tomorrow.length
        ? tomorrow.map(createMatchCard).join('')
        : '<p class="no-matches">لا توجد مباريات غدًا</p>';

    elements.upcomingContainer.innerHTML = upcoming.length
        ? upcoming.map(createMatchCard).join('')
        : '<p class="no-matches">لا توجد مباريات قادمة</p>';
}

// إنشاء بطاقات المباريات
function createFeaturedCard(match) {
    return `
        <div class="featured-card" data-id="${match.fixture.id}">
            <div class="league-info">
                <img src="${match.league.logo}" alt="${match.league.name}">
                <span>${match.league.name}</span>
            </div>
            <div class="teams">
                <div class="team">
                    <img src="${match.teams.home.logo}" alt="${match.teams.home.name}">
                    <span>${match.teams.home.name}</span>
                </div>
                <div class="vs">VS</div>
                <div class="team">
                    <img src="${match.teams.away.logo}" alt="${match.teams.away.name}">
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
            <div class="match-time">
                <i class="fas fa-clock"></i> ${formatDate(match.fixture.date)}
            </div>
            <button class="watch-btn" onclick="watchMatch(${match.fixture.id})">
                <i class="fas fa-play"></i> مشاهدة
            </button>
        </div>
    `;
}

// وظائف مساعدة
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
            elements.tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}-matches`).classList.add('active');
        });
    });
}

function setupSlider() {
    // تم التعامل مع السلايدر في renderFeaturedMatches
}

function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    document.querySelector('main').prepend(errorEl);
}

// الانتقال لمشاهدة المباراة
window.watchMatch = function(matchId) {
    // يمكنك توجيه المستخدم لصفحة المشاهدة
    window.location.href = `watch.html?match=${matchId}`;
    
    // أو فتح الصفحة في نافذة جديدة
    // window.open(`watch.html?match=${matchId}`, '_blank');
};
