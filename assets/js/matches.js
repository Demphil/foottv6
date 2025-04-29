import { fetchMatches } from './api.js';

// عناصر DOM
const featuredContainer = document.getElementById('featured-matches');
const todayContainer = document.getElementById('today-matches');
const tomorrowContainer = document.getElementById('tomorrow-matches');
const upcomingContainer = document.getElementById('upcoming-matches');
const breakingNewsContainer = document.getElementById('breaking-news');
const tabButtons = document.querySelectorAll('.tab-btn');

// تعريف البطولات المميزة
const featuredLeagues = [2, 39, 140, 135]; // UEFA Champions League, Premier League, La Liga, Serie A

// تنسيق التاريخ
const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ar-MA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Casablanca'
    });
};

// إنشاء بطاقة مباراة مميزة
const createFeaturedMatchCard = (match) => {
    const { teams, fixture, league } = match;
    return `
        <div class="featured-match-card">
            <div class="league-name">
                <img src="${league.logo}" alt="${league.name}" class="league-logo" onerror="this.style.display='none'">
                ${league.name}
            </div>
            <div class="teams">
                <div class="team">
                    <img src="${teams.home.logo}" alt="${teams.home.name}" class="team-logo" onerror="this.src='assets/images/default-team.png'">
                    <span>${teams.home.name}</span>
                </div>
                <div class="vs">VS</div>
                <div class="team">
                    <img src="${teams.away.logo}" alt="${teams.away.name}" class="team-logo" onerror="this.src='assets/images/default-team.png'">
                    <span>${teams.away.name}</span>
                </div>
            </div>
            <div class="match-info">
                <span>⏰ ${formatDate(fixture.date)}</span>
                <span>🏟️ ${fixture.venue?.name || 'غير محدد'}</span>
            </div>
        </div>
    `;
};

// إنشاء بطاقة مباراة عادية
const createMatchCard = (match) => {
    const { teams, fixture, league } = match;
    return `
        <div class="match-card">
            <div class="league-name">
                <img src="${league.logo}" alt="${league.name}" class="league-logo" onerror="this.style.display='none'">
                ${league.name}
            </div>
            <div class="teams">
                <div class="team">
                    <img src="${teams.home.logo}" alt="${teams.home.name}" class="team-logo" onerror="this.src='assets/images/default-team.png'">
                    <span>${teams.home.name}</span>
                </div>
                <div class="vs">VS</div>
                <div class="team">
                    <img src="${teams.away.logo}" alt="${teams.away.name}" class="team-logo" onerror="this.src='assets/images/default-team.png'">
                    <span>${teams.away.name}</span>
                </div>
            </div>
            <div class="match-time">⏰ ${formatDate(fixture.date)}</div>
            <div class="match-venue">🏟️ ${fixture.venue?.name || 'غير محدد'}</div>
        </div>
    `;
};

// إنشاء بطاقة أخبار
const createNewsCard = (news) => {
    return `
        <div class="news-card" onclick="window.location.href='news.html?id=${news.id}'">
            <img src="${news.image}" alt="${news.title}" onerror="this.src='assets/images/default-news.jpg'">
            <div class="news-content">
                <h3 class="news-title">${news.title}</h3>
                <p class="news-excerpt">${news.excerpt}</p>
                <div class="news-meta">
                    <span>📅 ${news.date}</span>
                    <span>👁️ ${news.views} مشاهدة</span>
                </div>
            </div>
        </div>
    `;
};

// تصنيف المباريات حسب التاريخ
const categorizeMatches = (matches) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const upcoming = new Date();
    upcoming.setDate(today.getDate() + 2);

    return {
        today: matches.filter(match => {
            const matchDate = new Date(match.fixture.date);
            return matchDate.toDateString() === today.toDateString();
        }),
        tomorrow: matches.filter(match => {
            const matchDate = new Date(match.fixture.date);
            return matchDate.toDateString() === tomorrow.toDateString();
        }),
        upcoming: matches.filter(match => {
            const matchDate = new Date(match.fixture.date);
            return matchDate > tomorrow && matchDate <= upcoming;
        }),
        featured: matches.filter(match => featuredLeagues.includes(match.league.id))
    };
};

// عرض المباريات
const renderMatches = (matches) => {
    if (!matches || matches.length === 0) {
        todayContainer.innerHTML = '<p class="no-matches">لا توجد مباريات في الفترة القادمة</p>';
        return;
    }

    const categorized = categorizeMatches(matches);

    // عرض المباريات المميزة
    if (categorized.featured.length > 0) {
        featuredContainer.innerHTML = categorized.featured.map(createFeaturedMatchCard).join('');
    } else {
        featuredContainer.innerHTML = '<p>لا توجد مباريات مميزة اليوم</p>';
    }

    // عرض مباريات اليوم
    if (categorized.today.length > 0) {
        todayContainer.innerHTML = categorized.today.map(createMatchCard).join('');
    } else {
        todayContainer.innerHTML = '<p class="no-matches">لا توجد مباريات اليوم</p>';
    }

    // عرض مباريات الغد
    if (categorized.tomorrow.length > 0) {
        tomorrowContainer.innerHTML = categorized.tomorrow.map(createMatchCard).join('');
    } else {
        tomorrowContainer.innerHTML = '<p class="no-matches">لا توجد مباريات غدًا</p>';
    }

    // عرض المباريات القادمة
    if (categorized.upcoming.length > 0) {
        upcomingContainer.innerHTML = categorized.upcoming.map(createMatchCard).join('');
    } else {
        upcomingContainer.innerHTML = '<p class="no-matches">لا توجد مباريات قادمة</p>';
    }
};

// جلب الأخبار العاجلة
const fetchBreakingNews = async () => {
    try {
        const response = await fetch('https://your-api-endpoint/news/breaking');
        const data = await response.json();
        return data.slice(0, 3); // عرض 3 أخبار فقط
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
};

// تبديل التبويبات
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const tabId = button.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabId}-matches`).classList.add('active');
    });
});

// تهيئة الصفحة
const initPage = async () => {
    try {
        // عرض حالة التحميل
        featuredContainer.innerHTML = '<div class="loader"></div>';
        todayContainer.innerHTML = '<div class="loader"></div>';
        
        // جلب وعرض المباريات
        const matches = await fetchMatches();
        renderMatches(matches);
        
        // جلب وعرض الأخبار العاجلة
        const news = await fetchBreakingNews();
        if (news.length > 0) {
            breakingNewsContainer.innerHTML = news.map(createNewsCard).join('');
        } else {
            breakingNewsContainer.innerHTML = '<p>لا توجد أخبار عاجلة حالياً</p>';
        }
    } catch (error) {
        console.error('Initialization error:', error);
        todayContainer.innerHTML = '<p class="error">حدث خطأ في جلب البيانات. الرجاء المحاولة لاحقاً.</p>';
    }
};

// بدء التحميل
initPage();
