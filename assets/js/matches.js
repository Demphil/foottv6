// assets/js/matches.js

import { fetchMatches } from './api.js';

// عناصر HTML
const todayContainer = document.getElementById('today-matches');
const tomorrowContainer = document.getElementById('tomorrow-matches');

// تنسيق الوقت
const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ar-MA', {
        dateStyle: 'full',
        timeStyle: 'short',
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
            <div class="league">${league.name} (${league.country})</div>
            <div class="teams">
                <span>${teams.home.name}</span>
                <strong>VS</strong>
                <span>${teams.away.name}</span>
            </div>
            <div class="time">🕒 ${formatDate(fixture.date)}</div>
        </div>
    `;
};

// تحديد البطولات المطلوبة
const allowedLeagues = [
    2,    // دوري أبطال أوروبا
    39,   // الدوري الإنجليزي
    61,   // الدوري الفرنسي
    78,   // الدوري الألماني
    140,  // الدوري الإسباني
    135,  // الدوري الإيطالي
    307,  // الدوري المغربي
    307,  // (مكرر لتأكيد)
    307,  // يمكن حذف التكرار
    307,  // الدوري المغربي
    308,  // دوري أبطال إفريقيا
    309   // كأس الاتحاد الإفريقي
];

// عرض المباريات
const renderMatches = (matches) => {
    const today = new Date("2025-04-29");
    const tomorrow = new Date("2025-04-30");

    const filteredMatches = matches.filter(
        m => allowedLeagues.includes(m.league.id)
    );

    const todayMatches = filteredMatches.filter(m =>
        isSameDay(new Date(m.fixture.date), today)
    );

    const tomorrowMatches = filteredMatches.filter(m =>
        isSameDay(new Date(m.fixture.date), tomorrow)
    );

    todayContainer.innerHTML += todayMatches.length
        ? todayMatches.map(renderMatchCard).join('')
        : '<p>لا توجد مباريات اليوم.</p>';

    tomorrowContainer.innerHTML += tomorrowMatches.length
        ? tomorrowMatches.map(renderMatchCard).join('')
        : '<p>لا توجد مباريات غدًا.</p>';

    console.info("جميع المباريات", matches); // للمتابعة
};

fetchMatches().then(renderMatches);
