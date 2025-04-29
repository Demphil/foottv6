// assets/js/matches.js

import { fetchMatches } from './api.js';

const todayList = document.getElementById('today-list');
const tomorrowList = document.getElementById('tomorrow-list');

// تنسيق العرض حسب توقيت المغرب
const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ar-MA', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Africa/Casablanca'
    });
};

// مقارنة اليوم بالتاريخ حسب توقيت المغرب
const isSameDay = (date1, date2) => {
    const d1 = new Date(date1.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
    const d2 = new Date(date2.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));

    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};

// كرت المباراة
const renderMatchCard = (match) => {
    const { teams, fixture } = match;
    return `
        <div class="match-card">
            <div class="teams">
                <span>${teams.home.name}</span>
                <strong>VS</strong>
                <span>${teams.away.name}</span>
            </div>
            <div class="time">🕒 ${formatDate(fixture.date)}</div>
        </div>
    `;
};

// عرض المباريات في الصفحة
const renderMatches = (matches) => {
    console.log("جميع المباريات:", matches); // للمراقبة

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const todayMatches = matches.filter(m =>
        isSameDay(new Date(m.fixture.date), today)
    );

    const tomorrowMatches = matches.filter(m =>
        isSameDay(new Date(m.fixture.date), tomorrow)
    );

    todayList.innerHTML = todayMatches.length
        ? todayMatches.map(renderMatchCard).join('')
        : '<p>لا توجد مباريات اليوم.</p>';

    tomorrowList.innerHTML = tomorrowMatches.length
        ? tomorrowMatches.map(renderMatchCard).join('')
        : '<p>لا توجد مباريات غدًا.</p>';
};

// جلب البيانات وعرضها
fetchMatches().then(renderMatches).catch(err => {
    console.error("فشل في جلب المباريات:", err);
});
