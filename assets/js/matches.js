import { getTodayMatches, getTomorrowMatches } from './api.js';

const DOM = {
  featuredContainer: document.getElementById('featured-matches'),
  todayContainer: document.getElementById('today-matches'),
  tomorrowContainer: document.getElementById('tomorrow-matches'),
  loading: document.getElementById('loading')
};

function showLoading() {
  if (DOM.loading) DOM.loading.style.display = 'flex';
}

function hideLoading() {
  if (DOM.loading) DOM.loading.style.display = 'none';
}

function renderMatch(match, isFeatured = false) {
  return `
    <div class="match-card ${isFeatured ? 'featured' : ''}">
      <div class="league">${match.league}</div>
      <div class="teams">
        <div class="team">
          <img src="${match.homeTeam.logo || 'default-team.png'}" 
               alt="${match.homeTeam.name}"
               onerror="this.src='default-team.png'">
          <span>${match.homeTeam.name}</span>
        </div>
        <div class="match-info">
          <span class="time">${match.time}</span>
          <span class="score">${match.score}</span>
        </div>
        <div class="team">
          <img src="${match.awayTeam.logo || 'default-team.png'}" 
               alt="${match.awayTeam.name}"
               onerror="this.src='default-team.png'">
          <span>${match.awayTeam.name}</span>
        </div>
      </div>
    </div>
  `;
}

async function loadAndRenderMatches() {
  showLoading();
  
  try {
    const [todayMatches, tomorrowMatches] = await Promise.all([
      getTodayMatches(),
      getTomorrowMatches()
    ]);

    console.log('Today matches:', todayMatches);
    console.log('Tomorrow matches:', tomorrowMatches);

    // عرض المباريات المسائية في القسم المميز (بعد 6 مساءً)
    const eveningMatches = todayMatches.filter(match => {
      const hour = parseInt(match.time.split(':')[0]) || 0;
      return hour >= 18; // 6 مساءً
    });

    if (DOM.featuredContainer) {
      DOM.featuredContainer.innerHTML = eveningMatches.length > 0 
        ? eveningMatches.map(match => renderMatch(match, true)).join('')
        : '<p>لا توجد مباريات مسائية اليوم</p>';
    }

    if (DOM.todayContainer) {
      DOM.todayContainer.innerHTML = todayMatches.length > 0
        ? todayMatches.map(renderMatch).join('')
        : '<p>لا توجد مباريات اليوم</p>';
    }

    if (DOM.tomorrowContainer) {
      DOM.tomorrowContainer.innerHTML = tomorrowMatches.length > 0
        ? tomorrowMatches.map(renderMatch).join('')
        : '<p>لا توجد مباريات غداً</p>';
    }

  } catch (error) {
    console.error('Error:', error);
    alert('حدث خطأ في تحميل البيانات، يرجى المحاولة لاحقاً');
  } finally {
    hideLoading();
  }
}

// بدء التحميل عند تشغيل الصفحة
document.addEventListener('DOMContentLoaded', loadAndRenderMatches);

// للفحص من الكونسول
window.debugMatches = {
  reload: () => {
    localStorage.clear();
    location.reload();
  }
};
