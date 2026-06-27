// assets/js/matches.js

import { getTodayMatches, getTomorrowMatches } from './api.js';
import { streamLinks } from './streams.js';

// --- 1. تعريف عناصر DOM ---
const DOM = {
  featuredContainer: document.getElementById('featured-matches'),
  broadcastContainer: document.getElementById('broadcast-matches'),
  todayContainer: document.getElementById('today-matches'),
  tomorrowContainer: document.getElementById('tomorrow-matches'),
  loadingScreen: document.getElementById('loading'),
  todayTab: document.getElementById('today-tab'),
  tomorrowTab: document.getElementById('tomorrow-tab'),
};

function hideLoading() {
  if (DOM.loadingScreen) DOM.loadingScreen.style.display = 'none';
}

// --- 2. دوال النافذة المنبثقة (Modal) ---
window.openWaitModal = function() {
    const modal = document.getElementById('wait-modal');
    if (modal) modal.style.display = 'flex';
}

window.closeWaitModal = function() {
    const modal = document.getElementById('wait-modal');
    if (modal) modal.style.display = 'none';
}

// --- 3. دالة بناء بطاقة المباراة (Render) ---
function renderMatch(match) {
  if (!match || !match.homeTeam || !match.awayTeam) return '';

  const homeLogo = match.homeTeam.logo || 'assets/images/default-logo.png';
  const awayLogo = match.awayTeam.logo || 'assets/images/default-logo.png';
  const matchSpecificKey = `${match.homeTeam.name}-${match.awayTeam.name}`;
  const watchUrl = streamLinks[match.channel] || streamLinks[matchSpecificKey];

  // استخدام حساب التوقيت بدقائق اليوم الحالية
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // الفارق بالدقائق بين وقت المباراة الحالي والوقت الفعلي للجهاز
  const diffMins = match.rawMinutes - currentMinutes;

  let timeText = match.time;
  let statusBadge = '';
  let matchStatusClass = '';
  
  let hrefAttribute = `href="${watchUrl || '#'}" target="_blank"`;
  let clickAction = '';
  let isClickableClass = watchUrl ? 'clickable' : 'not-clickable';

  // تحديد الحالة (جاري الآن / قريباً / انتهت) بناءً على الفارق الزمني ودقة الـ Score
  if (match.score && match.score !== 'VS') {
      // إذا تم تسجيل أهداف، فهي جارية حتماً
      statusBadge = '<span class="live-badge live">جاري الآن</span>';
      matchStatusClass = 'is-live';
      timeText = `<span class="live-score">${match.score}</span>`;
  } else if (diffMins <= 15 && diffMins > -130) {
      // نافذة المباراة: بدأت قبل أقل من ساعتين وعشر دقائق أو ستبدأ بعد 15 دقيقة
      if (diffMins >= 0) {
          timeText = '<span class="soon-text-blink">ستبدأ قريباً</span>';
          statusBadge = '<span class="live-badge soon">قريباً</span>';
      } else {
          statusBadge = '<span class="live-badge live">جاري الآن</span>';
          matchStatusClass = 'is-live';
      }
  } else if (diffMins <= -130) {
      statusBadge = '<span class="live-badge ended" style="background:#555;">انتهت</span>';
  } else {
      // المباراة بعيدة، نغلق الرابط ونفعل مودال الانتظار
      hrefAttribute = `href="javascript:void(0)"`; 
      clickAction = `onclick="openWaitModal()"`;
  }

  const hasChannelInfo = match.channel && match.channel !== 'غير محدد' && match.channel !== 'Unknown' && match.channel !== 'غير معروف' && match.channel.trim() !== '';
  
  const matchDetailsHTML = `
    ${hasChannelInfo ? `
      <div class="match-detail-item">
        <i class="fas fa-tv" aria-hidden="true"></i>
        <span>${match.channel}</span>
      </div>
    ` : ''}
    ${match.commentator ? `
      <div class="match-detail-item">
        <i class="fas fa-microphone-alt" aria-hidden="true"></i>
        <span>${match.commentator}</span>
      </div>
    ` : ''}
  `;

  return `
    <a ${hrefAttribute} ${clickAction} class="match-card-link ${isClickableClass}">
      <article class="match-card ${matchStatusClass}">
        ${!watchUrl ? '<span class="no-stream-badge">Stream Unavailable</span>' : ''}
        ${statusBadge}
        <div class="league-info"><span>${match.league}</span></div>
        <div class="teams">
          <div class="team">
            <img src="${homeLogo}" alt="${match.homeTeam.name}" loading="lazy" onerror="this.src='assets/images/default-logo.png';">
            <span class="team-name">${match.homeTeam.name}</span>
          </div>
          <div class="match-info">
            <span class="score">${match.score}</span>
            <span class="time">${timeText}</span>
          </div>
          <div class="team">
            <img src="${awayLogo}" alt="${match.awayTeam.name}" loading="lazy" onerror="this.src='assets/images/default-logo.png';">
            <span class="team-name">${match.awayTeam.name}</span>
          </div>
        </div>
        ${matchDetailsHTML.trim() ? `<div class="match-details-extra">${matchDetailsHTML}</div>` : ''}
      </article>
    </a>
  `;
}

// --- 4. دالة تعبئة الأقسام ---
function renderSection(container, matches, message) {
    if (!container) return;
    if (matches && matches.length > 0) {
        container.innerHTML = matches.map(renderMatch).join('');
    } else {
        container.innerHTML = `<div class="no-matches"><i class="fas fa-futbol"></i><p>${message}</p></div>`;
    }
}

// --- 5. الدالة الرئيسية (Load & Display) ---
async function loadAndRenderMatches() {
  const [rawTodayMatches, rawTomorrowMatches] = await Promise.all([
    getTodayMatches(),
    getTomorrowMatches()
  ]);

  hideLoading();

  // عرض القوائم مباشرة لأن ملف الـ API المطور يتكفل كلياً بحسابات التوقيت المدمجة ومنع التكرار
  renderSection(DOM.todayContainer, rawTodayMatches, 'لا توجد مباريات اليوم.');
  renderSection(DOM.tomorrowContainer, rawTomorrowMatches, 'لا توجد مباريات غداً.');

  // تعيين الأقسام الإضافية (مباريات جارية وبث مباشر متميز) بناءً على التصفية الذكية
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const liveAndFeatured = rawTodayMatches.filter(match => {
      const diffMins = match.rawMinutes - currentMinutes;
      // المباراة جارية أو ستبدأ بعد قليل
      return (match.score && match.score !== 'VS') || (diffMins <= 30 && diffMins > -130);
  });

  renderSection(DOM.featuredContainer, liveAndFeatured, 'لا توجد مباريات بارزة أو جارية حالياً.');
  renderSection(DOM.broadcastContainer, rawTodayMatches, 'لا توجد مباريات هامة اليوم.');
}

// --- 6. إعداد التبويبات ---
function setupTabs() {
    const handleTabClick = (activeTab, inactiveTab, activeContainer, inactiveContainer) => {
        if (!activeTab || !inactiveTab || !activeContainer || !inactiveContainer) return;
        activeTab.classList.add('active');
        inactiveTab.classList.remove('active');
        activeContainer.style.display = 'grid';
        inactiveContainer.style.display = 'none';
    };

    DOM.todayTab?.addEventListener('click', () => {
        handleTabClick(DOM.todayTab, DOM.tomorrowTab, DOM.todayContainer, DOM.tomorrowContainer);
    });

    DOM.tomorrowTab?.addEventListener('click', () => {
        handleTabClick(DOM.tomorrowTab, DOM.todayTab, DOM.tomorrowContainer, DOM.todayContainer);
    });
}

// تشغيل الكود عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    loadAndRenderMatches().catch(error => {
        console.error("An error occurred while loading matches:", error);
        hideLoading();
    });
});
