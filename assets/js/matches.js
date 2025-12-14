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
// نجعلها Global لكي يستطيع HTML الوصول إليها عبر onclick
window.openWaitModal = function() {
    const modal = document.getElementById('wait-modal');
    if (modal) modal.style.display = 'flex';
}

window.closeWaitModal = function() {
    const modal = document.getElementById('wait-modal');
    if (modal) modal.style.display = 'none';
}

// --- 3. دالة الترتيب الذكي (Strict Sort) ---
function sortMatchesByPriority(a, b) {
    // أ. التحقق من وجود القناة (المباريات بدون قناة تذهب للأسفل)
    const hasChannel = (match) => {
        const ch = match.channel;
        return ch && ch !== 'غير محدد' && ch !== 'Unknown' && ch !== 'غير معروف' && ch.trim() !== '';
    };

    const aHas = hasChannel(a);
    const bHas = hasChannel(b);

    if (aHas && !bHas) return -1; // a فوق
    if (!aHas && bHas) return 1;  // b فوق

    // ب. حساب الفارق الزمني
    const now = new Date();
    const getMatchDate = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const dateA = getMatchDate(a.time);
    const dateB = getMatchDate(b.time);
    const diffA = (dateA - now) / 60000; // الفرق بالدقائق
    const diffB = (dateB - now) / 60000;

    // ج. تحديد الرتبة (Rank)
    const getRank = (diff) => {
        // 1. جارية الآن: (بدأت منذ أقل من 140 دقيقة)
        if (diff < 0 && diff > -140) return 1;

        // 2. ستبدأ قريباً: (خلال 0 إلى 45 دقيقة)
        if (diff >= 0 && diff <= 45) return 2;

        // 3. قادمة: (بعد أكثر من 45 دقيقة)
        if (diff > 45) return 3;

        // 4. انتهت: (مر عليها أكثر من 140 دقيقة)
        return 4;
    };

    const rankA = getRank(diffA);
    const rankB = getRank(diffB);

    // الترتيب حسب الرتبة (الأصغر هو الأول)
    if (rankA !== rankB) {
        return rankA - rankB;
    }

    // إذا تساوت الرتبة، نرتب حسب الزمن (الأقرب فالأقرب)
    return dateA - dateB;
}

// --- 4. دالة بناء بطاقة المباراة (Render) ---
function renderMatch(match) {
  if (!match || !match.homeTeam || !match.awayTeam) return '';

  const homeLogo = match.homeTeam.logo || 'assets/images/default-logo.png';
  const awayLogo = match.awayTeam.logo || 'assets/images/default-logo.png';
  const matchSpecificKey = `${match.homeTeam.name}-${match.awayTeam.name}`;
  const watchUrl = streamLinks[match.channel] || streamLinks[matchSpecificKey];

  // حساب الوقت المتبقي
  const [h, m] = match.time.split(':').map(Number);
  const matchDate = new Date(); matchDate.setHours(h, m, 0, 0);
  const now = new Date();
  const diffMins = (matchDate - now) / 60000;

  // المتغيرات للعرض
  let timeText = match.time;
  let statusBadge = '';
  let matchStatusClass = '';
  
  // إعداد الرابط (النافذة المنبثقة vs الرابط المباشر)
  let hrefAttribute = `href="${watchUrl || '#'}" target="_blank"`;
  let clickAction = '';
  let isClickableClass = watchUrl ? 'clickable' : 'not-clickable';

  // المنطق:
  // إذا تبقى 10 دقائق أو أقل، أو المباراة جارية -> اسمح بالدخول
  // وإلا -> أظهر النافذة المنبثقة
  
  if (diffMins <= 10) {
      // --- حالة الدخول المسموح ---
      hrefAttribute = `href="${watchUrl || '#'}" target="_blank"`;
      
      if (diffMins >= 0) {
          // ستبدأ خلال 0-10 دقائق
          timeText = '<span class="soon-text-blink">ستبدأ قريباً</span>';
          statusBadge = '<span class="live-badge soon">قريباً</span>';
      } else if (diffMins > -140) {
           // جارية الآن
           statusBadge = '<span class="live-badge live">جاري الآن</span>';
           matchStatusClass = 'is-live';
           // عرض النتيجة إذا توفرت
           if (match.score && match.score.includes('-')) {
               timeText = `<span class="live-score">${match.score}</span>`;
           }
      }
  } else {
      // --- حالة الانتظار (أكثر من 10 دقائق) ---
      hrefAttribute = `href="javascript:void(0)"`; 
      clickAction = `onclick="openWaitModal()"`;
  }

  // فحص معلومات القناة
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

// --- 5. دالة تعبئة الأقسام ---
function renderSection(container, matches, message) {
    if (!container) return;
    if (matches && matches.length > 0) {
        container.innerHTML = matches.map(renderMatch).join('');
    } else {
        container.innerHTML = `<div class="no-matches"><i class="fas fa-futbol"></i><p>${message}</p></div>`;
    }
}

// --- 6. الدالة الرئيسية (Load & Sort) ---
async function loadAndRenderMatches() {
  const [todayMatches, tomorrowMatches] = await Promise.all([
    getTodayMatches(),
    getTomorrowMatches()
  ]);

  hideLoading();

  // 1. ترتيب مباريات اليوم (نسخة جديدة ثم ترتيب)
  const sortedTodayMatches = todayMatches.slice().sort(sortMatchesByPriority);

  // 2. فلترة مباريات السهرة (اختياري: من الساعة 4 مساءً وما بعد)
  const featuredMatches = sortedTodayMatches.filter(match => {
    try {
      const [hours] = match.time.split(':').map(Number);
      return hours >= 12; 
    } catch (e) { return false; }
  });

  // 3. العرض في الأقسام
  renderSection(DOM.featuredContainer, featuredMatches, 'لا توجد مباريات سهرة اليوم.');
  renderSection(DOM.broadcastContainer, sortedTodayMatches, 'لا توجد مباريات هامة اليوم.');
  renderSection(DOM.todayContainer, sortedTodayMatches, 'لا توجد مباريات اليوم.');
  renderSection(DOM.tomorrowContainer, tomorrowMatches, 'لا توجد مباريات غداً.');
}

// --- 7. إعداد التبويبات ---
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
