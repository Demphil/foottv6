// assets/js/matches.js

import { fetchMatches } from './api.js';

const todayList = document.getElementById('today-list');
const tomorrowList = document.getElementById('tomorrow-list');

// تنسيق العرض
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

const renderMatches = (matches) => {
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

fetchMatches().then(renderMatches);
