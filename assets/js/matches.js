import { fetchMatches } from './api.js';

// عناصر DOM
const featuredContainer = document.getElementById('featured-matches');
const todayContainer = document.getElementById('today-matches');
const tomorrowContainer = document.getElementById('tomorrow-matches');
const upcomingContainer = document.getElementById('upcoming-matches');
const breakingNewsContainer = document.getElementById('breaking-news');
const tabButtons = document.querySelectorAll('.tab-btn');

// تعريف البطولات المميزة
const featuredLeagues = [2, 39, 140, 135]; // دوري الأبطال، الإنجليزي، الإسباني، الإيطالي

// تنسيق التاريخ حسب توقيت المغرب
const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ar-MA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Africa/Casablanca'
    });
};

// بطاقة مباراة مميزة
const createFeaturedMatchCard = ({ teams, fixture, league }) => `
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

// بطاقة مباراة عادية
const createMatchCard = ({ teams, fixture, league }) => `
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

// بطاقة خبر
const createNewsCard = (news) => `
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

// تصنيف المباريات حسب التاريخ
const categorizeMatches = (matches) => {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const afterTomorrow = new Date(tomorrow);
    afterTomorrow.setDate(tomorrow.getDate() + 1);

    return {
        today: matches.filter(match => new Date(match.fixture.date).toDateString() === today.toDateString()),
        tomorrow: matches.filter(match => new Date(match.fixture.date).toDateString() === tomorrow.toDateString()),
        upcoming: matches.filter(match => {
            const matchDate = new Date(match.fixture.date);
            return matchDate > tomorrow && matchDate < afterTomorrow;
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

    const { featured, today, tomorrow, upcoming } = categorizeMatches(matches);

    featuredContainer.innerHTML = featured.length
        ? featured.map(createFeaturedMatchCard).join('')
        : '<p>لا توجد مباريات مميزة اليوم</p>';

    todayContainer.innerHTML = today.length
        ? today.map(createMatchCard).join('')
        : '<p class="no-matches">لا توجد مباريات اليوم</p>';

    tomorrowContainer.innerHTML = tomorrow.length
        ? tomorrow.map(createMatchCard).join('')
        : '<p class="no-matches">لا توجد مباريات غدًا</p>';

    upcomingContainer.innerHTML = upcoming.length
        ? upcoming.map(createMatchCard).join('')
        : '<p class="no-matches">لا توجد مباريات قادمة</p>';
};

// جلب الأخبار العاجلة
const fetchBreakingNews = async () => {
    try {
        const response = await fetch('https://gnews.io/api/v4/top-headlines?category=general&lang=ar&country=ma&apikey=320e688cfb9682d071750f4212f83753');
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        
        const result = await response.json();
        return result.articles.slice(0, 3).map((article, index) => ({
            id: index,
            title: article.title,
            excerpt: article.description || '',
            image: article.image || 'assets/images/default-news.jpg',
            date: new Date(article.publishedAt).toLocaleDateString('ar-MA'),
            views: Math.floor(Math.random() * 5000 + 1000), // رقم وهمي للعرض
        }));
    } catch (error) {
        console.error('فشل جلب الأخبار:', error);
        return [];
    }
};

// التبويبات
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
        featuredContainer.innerHTML = todayContainer.innerHTML = '<div class="loader"></div>';

        const matches = await fetchMatches();
        renderMatches(matches);

        const news = await fetchBreakingNews();
        breakingNewsContainer.innerHTML = news.length
            ? news.map(createNewsCard).join('')
            : '<p>لا توجد أخبار عاجلة حالياً</p>';
    } catch (error) {
        console.error('Initialization error:', error);
        todayContainer.innerHTML = '<p class="error">حدث خطأ في جلب البيانات. الرجاء المحاولة لاحقاً.</p>';
    }
};

// بدء التحميل
initPage();
