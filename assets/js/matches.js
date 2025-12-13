import { getTodayMatches, getTomorrowMatches } from './api.js';
import { streamLinks } from './streams.js';

// DOM elements mapping
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

/**
 * دالة الترتيب الذكي (النسخة الصارمة)
 * الترتيب:
 * 1. (Rank 1) جارية الآن (بدأت منذ 0 وحتى 140 دقيقة) ولها قناة.
 * 2. (Rank 2) ستبدأ قريباً (خلال 0 إلى 45 دقيقة) ولها قناة.
 * 3. (Rank 3) قادمة (أكثر من 45 دقيقة) ولها قناة.
 * 4. (Rank 4) انتهت (مر أكثر من 140 دقيقة) ولها قناة.
 * 5. (Rank 5) ليس لها قناة (في الأسفل دائماً).
 */
function sortMatchesByPriority(a, b) {
    // 1. فحص وجود القناة
    const hasChannel = (match) => {
        const ch = match.channel;
        return ch && ch !== 'غير محدد' && ch !== 'Unknown' && ch !== 'غير معروف' && ch.trim() !== '';
    };

    const aHas = hasChannel(a);
    const bHas = hasChannel(b);

    // إذا كانت إحدى المباريات بدون قناة، تذهب للأسفل مباشرة (Rank 5)
    if (aHas && !bHas) return -1; // a فوق
    if (!aHas && bHas) return 1;  // b فوق

    // --- حساب الفارق الزمني ---
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

    // دالة تحديد الرتبة
    const getRank = (diff) => {
        // جارية الآن: الوقت بالسالب (بدأت) ولكن لم يمر عليها 140 دقيقة
        if (diff < 0 && diff > -140) return 1;

        // ستبدأ قريباً: الوقت بالموجب (لم تبدأ) ولكن أقل من 45 دقيقة
        if (diff >= 0 && diff <= 45) return 2;

        // قادمة: ستبدأ بعد أكثر من 45 دقيقة
        if (diff > 45) return 3;

        // انتهت: مر عليها أكثر من 140 دقيقة
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

function renderMatch(match) {
  if (!match || !match.homeTeam || !match.awayTeam) return '';

  const homeLogo = match.homeTeam.logo || 'assets/images/default-logo.png';
  const awayLogo = match.awayTeam.logo || 'assets/images/default-logo.png';
  const matchSpecificKey = `${match.homeTeam.name}-${match.awayTeam.name}`;
  const watchUrl = streamLinks[match.channel] || streamLinks[matchSpecificKey];
  const isClickable = watchUrl ? 'clickable' : 'not-clickable';

  // حساب الوقت والحالة
  const [h, m] = match.time.split(':').map(Number);
  const matchDate = new Date(); matchDate.setHours(h, m, 0, 0);
  const now = new Date();
  const diffMins = (matchDate - now) / 60000;

  // إعداد النصوص والشارات
  let timeText = match.time;
  let statusBadge = '';
  let matchStatusClass = ''; // كلاس إضافي لتنسيق CSS إذا أردت

  if (diffMins >= 0 && diffMins <= 10) {
      // الحالة: ستبدأ قريباً جداً (أقل من 10 دقائق)
      // استبدال الوقت بالنص
      timeText = '<span class="soon-text-blink">ستبدأ قريباً</span>';
      statusBadge = '<span class="live-badge soon">قريباً</span>';
  } else if (diffMins < 0 && diffMins > -140) {
      // الحالة: جارية الآن
      statusBadge = '<span class="live-badge live">جاري الآن</span>';
      matchStatusClass = 'is-live'; // يمكن استخدامه لتمييز البطاقة
      
      // إذا كانت النتيجة متوفرة (ليست VS)، نعرضها مكان الوقت
      // وإلا نترك الوقت الأصلي لبداية المباراة
      if (match.score && match.score.includes('-')) {
          timeText = `<span class="live-score">${match.score}</span>`;
      }
  }

  // فحص القناة للعرض
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
    <a href="${watchUrl || '#'}" target="_blank" rel="noopener noreferrer" class="match-card-link ${isClickable}">
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

function renderSection(container, matches, message) {
    if (!container) return;
    if (matches && matches.length > 0) {
        container.innerHTML = matches.map(renderMatch).join('');
    } else {
        container.innerHTML = `<div class="no-matches"><i class="fas fa-futbol"></i><p>${message}</p></div>`;
    }
}

async function loadAndRenderMatches() {
  const [todayMatches, tomorrowMatches] = await Promise.all([
    getTodayMatches(),
    getTomorrowMatches()
  ]);

  hideLoading();

  // 1. ترتيب مباريات اليوم (هنا يتم تطبيق الإصلاح)
  // نستخدم .slice() لإنشاء نسخة جديدة ثم ترتيبها
  const sortedTodayMatches = todayMatches.slice().sort(sortMatchesByPriority);

  // 2. فلترة مباريات السهرة (اختياري)
  const featuredMatches = sortedTodayMatches.filter(match => {
    try {
      const [hours] = match.time.split(':').map(Number);
      return hours >= 16; 
    } catch (e) { return false; }
  });

  // 3. العرض في الأقسام
  renderSection(DOM.featuredContainer, featuredMatches, 'No evening matches today.');
  renderSection(DOM.broadcastContainer, sortedTodayMatches, 'No key matches scheduled for today.');
  renderSection(DOM.todayContainer, sortedTodayMatches, 'No matches scheduled for today.');
  renderSection(DOM.tomorrowContainer, tomorrowMatches, 'No matches scheduled for tomorrow.');
}

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

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    loadAndRenderMatches().catch(error => {
        console.error("An error occurred while loading matches:", error);
        hideLoading();
    });
});
