// matches.js

import { fetchMatches } from './api.js';

const matchesContainer = document.getElementById('matches');

const renderMatches = (matches) => {
    if (matches.length === 0) {
        matchesContainer.innerHTML = '<p>لا توجد مباريات متاحة حاليًا.</p>';
        return;
    }

    matchesContainer.innerHTML = matches.map(match => {
        const { teams, fixture } = match;

        // تنسيق التاريخ والوقت
        const matchDate = new Date(fixture.date);
        const formattedDate = matchDate.toLocaleString('ar-MA', {
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone: 'Africa/Casablanca'
        });

        return `
            <div class="match">
                <span>${teams.home.name}</span>
                <strong> VS </strong>
                <span>${teams.away.name}</span>
                <div>🕒 ${formattedDate}</div>
                <hr>
            </div>
        `;
    }).join('');
};

// تحميل المباريات عند بداية الصفحة
fetchMatches().then(renderMatches);
