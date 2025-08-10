import { getTodayMatches, getTomorrowMatches } from './api.js';

const DOM = {
  featuredContainer: document.getElementById('featured-matches'),
  todayContainer: document.getElementById('today-matches'),
  tomorrowContainer: document.getElementById('tomorrow-matches')
};

// تحديد المباريات المسائية (بعد 6 مساءً)
function isEveningMatch(time) {
  const hour = parseInt(time.split(':')[0]) || 0;
  return hour >= 18; // 6 مساءً
}

async function loadMatches() {
  try {
    const today = await getTodayMatches();
    const tomorrow = await getTomorrowMatches();
    
    renderMatches({
      featured: today.filter(m => isEveningMatch(m.time)),
      today,
      tomorrow
    });
    
  } catch (error) {
    console.error('Error loading matches:', error);
  }
}

function renderMatches({ featured, today, tomorrow }) {
  // عرض المباريات المميزة (المسائية)
  DOM.featuredContainer.innerHTML = featured.map(match => `
    <div class="match-card featured">
      <div class="teams">
        ${match.homeTeam} vs ${match.awayTeam}
      </div>
      <div class="time">${match.time}</div>
      <div class="channels">${match.channels.join(', ')}</div>
    </div>
  `).join('') || '<p>لا توجد مباريات مسائية اليوم</p>';

  // عرض مباريات اليوم
  DOM.todayContainer.innerHTML = today.map(match => `
    <div class="match-card ${isEveningMatch(match.time) ? 'evening' : ''}">
      <div class="teams">
        ${match.homeTeam} vs ${match.awayTeam}
      </div>
      <div class="time">${match.time}</div>
      <div class="score">${match.score}</div>
    </div>
  `).join('');

  // عرض مباريات الغد
  DOM.tomorrowContainer.innerHTML = tomorrow.map(match => `
    <div class="match-card ${isEveningMatch(match.time) ? 'evening' : ''}">
      <div class="teams">
        ${match.homeTeam} vs ${match.awayTeam}
      </div>
      <div class="time">${match.time}</div>
    </div>
  `).join('');
}

// بدء التحميل عند تشغيل الصفحة
document.addEventListener('DOMContentLoaded', loadMatches);
