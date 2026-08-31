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

  const homeLogo = match.homeTeam.logo || 'assets/images/default-logo.jpg';
  const awayLogo = match.awayTeam.logo || 'assets/images/default-logo.jpg';
  const matchSpecificKey = `${match.homeTeam.name}-${match.awayTeam.name}`;
  const watchUrl = streamLinks[match.channel] || streamLinks[matchSpecificKey];

  // استخدام التاريخ الفعلي المدمج داخل كائن المباراة
  const now = new Date();
  const matchDate = match.matchDate || new Date(); 
  const diffMins = (matchDate - now) / 60000;

  let timeText = match.time;
  let statusBadge = '';
  let matchStatusClass = '';
  
  let hrefAttribute = `href="${watchUrl || '#'}" target="_blank"`;
  let clickAction = '';
  let isClickableClass = watchUrl ? 'clickable' : 'not-clickable';

  // شرط فتح رابط المباراة عند البث أو تبقي 15 دقيقة أو أقل
  if (match.isLive || diffMins <= 15) {
      hrefAttribute = `href="${watchUrl || '#'}" target="_blank"`;
      
      if (diffMins >= 0 && !match.isLive) {
          timeText = '<span class="soon-text-blink">ستبدأ قريباً</span>';
          statusBadge = '<span class="live-badge soon">قريباً</span>';
      } else if (match.isLive || diffMins > -140) {
           statusBadge = '<span class="live-badge live">جاري الآن</span>';
           matchStatusClass = 'is-live';
           if (match.score && match.score.includes('-')) {
               timeText = `<span class="live-score">${match.score}</span>`;
           }
      }
  } else {
      // إيقاف فتح الرابط المباشر وتفعيل النافذة المنبثقة للانتظار
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
            <img src="${homeLogo}" alt="${match.homeTeam.name}" loading="lazy" onerror="this.src='assets/images/default-logo.jpg';">
            <span class="team-name">${match.homeTeam.name}</span>
          </div>
          <div class="match-info">
            <span class="score">${match.score}</span>
            <span class="time">${timeText}</span>
          </div>
          <div class="team">
            <img src="${awayLogo}" alt="${match.awayTeam.name}" loading="lazy" onerror="this.src='assets/images/default-logo.jpg';">
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

// --- 5. الدالة الرئيسية (Load & Sort) ---
async function loadAndRenderMatches() {
  const [rawTodayMatches, rawTomorrowMatches] = await Promise.all([
    getTodayMatches(),
    getTomorrowMatches()
  ]);

  hideLoading();

  // دالة ضبط التاريخ وتصحيح الأوقات المسائية
  function formatMatchDates(matches, sourceDayOffset) {
     const result = [];
     for (let match of matches) {
         if (!match.time || !match.time.includes(':')) {
             result.push({ ...match, matchDate: new Date(), moroccoDayOffset: sourceDayOffset });
             continue;
         }
         
         let moroccoDayOffset = sourceDayOffset;
         let [h, m] = match.time.split(':').map(Number);
         
         // تصحيح الأوقات من 1 إلى 11 لتصبح مساءً (تتم إضافة 12 ساعة) لتفادي اعتبارها صباحاً
         if (h >= 1 && h <= 11) {
             h += 12;
         }
         
         if (h >= 22) {
             moroccoDayOffset -= 1;
         }

         const matchDate = new Date();
         matchDate.setDate(matchDate.getDate() + moroccoDayOffset);
         matchDate.setHours(h, m, 0, 0);
         
         result.push({ ...match, matchDate, moroccoDayOffset });
     }
     return result;
  }

  // معالجة القوائم
  const processedToday = formatMatchDates(rawTodayMatches, 0);
  const processedTomorrow = formatMatchDates(rawTomorrowMatches, 1);
  
  // دمج كل المباريات لتوزيعها لاحقاً
  const allMatches = [...processedToday, ...processedTomorrow];
  const now = new Date();

  const trueTodayMatches = [];
  const trueTomorrowMatches = [];

  // توزيع المباريات على الأيام بشكل صحيح بتوقيت المغرب
  allMatches.forEach(match => {
      const diffMins = (match.matchDate - now) / 60000;
      const isLive = match.isLive || (diffMins <= 0 && diffMins > -140);

      if (match.moroccoDayOffset === 0 || isLive) {
          trueTodayMatches.push(match);
      } 
      else if (match.moroccoDayOffset === 1) {
          trueTomorrowMatches.push(match);
      }
  });

  // دالة الترتيب
  function sortMatches(a, b) {
      const matchSpecificKeyA = `${a.homeTeam.name}-${a.awayTeam.name}`;
      const watchUrlA = streamLinks[a.channel] || streamLinks[matchSpecificKeyA];

      const matchSpecificKeyB = `${b.homeTeam.name}-${b.awayTeam.name}`;
      const watchUrlB = streamLinks[b.channel] || streamLinks[matchSpecificKeyB];

      const diffA = (a.matchDate - now) / 60000;
      const diffB = (b.matchDate - now) / 60000;

      const getRank = (diff, hasStream, isLive) => {
          if (!hasStream) return 4; 
          if (isLive || (diff < 0 && diff > -140)) return 1;
          if (diff >= 0 && diff <= 45) return 2; 
          if (diff > 45) return 3; 
          return 5;
      };

      const rankA = getRank(diffA, !!watchUrlA, a.isLive);
      const rankB = getRank(diffB, !!watchUrlB, b.isLive);

      if (rankA !== rankB) return rankA - rankB;
      
      return a.matchDate - b.matchDate;
  }

  trueTodayMatches.sort(sortMatches);
  trueTomorrowMatches.sort(sortMatches);

  // الفلترة الصحيحة للقسم العلوي لعرض المباريات التي لم تنتهِ
  const featuredMatches = trueTodayMatches.filter(match => {
      const diffMins = (match.matchDate - now) / 60000;
      const isLive = match.isLive || (diffMins <= 0 && diffMins > -140);
      const isFinished = diffMins <= -140 && !isLive;
      return !isFinished; 
  });

  // العرض في الأقسام
  renderSection(DOM.featuredContainer, featuredMatches, 'لا توجد مباريات بارزة أو جارية حالياً.');
  renderSection(DOM.broadcastContainer, trueTodayMatches, 'لا توجد مباريات هامة اليوم.');
  renderSection(DOM.todayContainer, trueTodayMatches, 'لا توجد مباريات اليوم.');
  renderSection(DOM.tomorrowContainer, trueTomorrowMatches, 'لا توجد مباريات غداً.');
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
