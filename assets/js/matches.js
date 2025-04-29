// assets/js/matches.js

import { fetchMatches } from './api.js';

// عناصر HTML
const todayContainer = document.getElementById('today-matches');
const tomorrowContainer = document.getElementById('tomorrow-matches');

// عرض مؤشر التحميل
const showLoading = () => {
    todayContainer.innerHTML = '<div class="loader"></div>';
    tomorrowContainer.innerHTML = '';
};

// تنسيق الوقت
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

// مقارنة التواريخ
const isSameDay = (date1, date2) =>
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

// توليد بطاقة المباراة
const renderMatchCard = (match) => {
    const { teams, fixture, league } = match;
    return `
        <div class="match-card">
            <h3 class="league-name">${league.name}</h3>
            <div class="teams">
                <div class="team">
                    <img src="${teams.home.logo}" alt="${teams.home.name}" class="team-logo" onerror="this.src='assets/images/default-team.png'">
                    <span>${teams.home.name}</span>
                </div>
                <span class="vs">vs</span>
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

// البطولات المطلوبة
const allowedLeagues = [
    2,    // دوري أبطال أوروبا
    39,   // الدوري الإنجليزي
    61,   // الدوري الفرنسي
    78,   // الدوري الألماني
    140,  // الدوري الإسباني
    135,  // الدوري الإيطالي
    307,  // الدوري المغربي
    308,  // دوري أبطال إفريقيا
    309   // كأس الاتحاد الإفريقي
];

// عرض المباريات
const renderMatches = (matches) => {
    if (!matches || matches.length === 0) {
        todayContainer.innerHTML = '<p class="no-matches">لا توجد مباريات في الفترة القادمة</p>';
        tomorrowContainer.innerHTML = '';
        return;
    }

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    console.log('جميع المباريات:', matches);
    
    const filteredMatches = matches.filter(m => 
        m.league && allowedLeagues.includes(m.league.id)
    );
    
    console.log('المباريات المصفاة:', filteredMatches);

    if (filteredMatches.length === 0) {
        todayContainer.innerHTML = '<p class="no-matches">لا توجد مباريات في البطولات المتابعة</p>';
        tomorrowContainer.innerHTML = '';
        return;
    }

    const todayMatches = filteredMatches.filter(m =>
        m.fixture && m.fixture.date && isSameDay(new Date(m.fixture.date), today)
    );

    const tomorrowMatches = filteredMatches.filter(m =>
        m.fixture && m.fixture.date && isSameDay(new Date(m.fixture.date), tomorrow)
    );

    console.log('مباريات اليوم:', todayMatches);
    console.log('مباريات الغد:', tomorrowMatches);

    todayContainer.innerHTML = todayMatches.length
        ? todayMatches.map(renderMatchCard).join('')
        : '<p class="no-matches">لا توجد مباريات اليوم.</p>';

    tomorrowContainer.innerHTML = tomorrowMatches.length
        ? tomorrowMatches.map(renderMatchCard).join('')
        : '<p class="no-matches">لا توجد مباريات غدًا.</p>';
};

// معالجة الأخطاء
const handleError = (error) => {
    console.error('حدث خطأ:', error);
    todayContainer.innerHTML = `
        <p class="error">
            حدث خطأ في جلب البيانات
            <button onclick="window.location.reload()">إعادة المحاولة</button>
        </p>
    `;
    tomorrowContainer.innerHTML = '';
};

// تحميل البيانات
showLoading();
fetchMatches()
    .then(renderMatches)
    .catch(handleError);
