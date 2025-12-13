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
 * دالة الترتيب الذكي
 * الترتيب الجديد:
 * 1. مباريات لها قناة + جارية الآن (بدأت منذ أقل من 130 دقيقة)
 * 2. مباريات لها قناة + ستبدأ قريباً (0-30 دقيقة) - تم تعديل المجال الزمني قليلاً ليشمل المزيد
 * 3. مباريات لها قناة + قادمة
 * 4. مباريات لها قناة + انتهت
 * 5. مباريات ليس لها قناة (في الأسفل دائماً)
 */
function sortMatchesByPriority(a, b) {
    // 1. التحقق من وجود القناة
    const hasChannel = (match) => {
        const ch = match.channel;
        return ch && ch !== 'غير محدد' && ch !== 'Unknown' && ch !== 'غير معروف' && ch.trim() !== '';
    };

    const aHas = hasChannel(a);
    const bHas = hasChannel(b);

    // المباريات التي لها قناة تظهر أولاً
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;

    // --- الترتيب الزمني ---
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

    const getRank = (diff) => {
        // الأولوية 1: جارية الآن (بدأت منذ أقل من 130 دقيقة)
        // الفرق السالب يعني أن الوقت الحالي بعد وقت المباراة
        if (diff < 0 && diff > -130) return 1;

        // الأولوية 2: ستبدأ قريباً (خلال 30 دقيقة)
        if (diff >= 0 && diff <= 30) return 2;

        // الأولوية 3: قادمة (أكثر من 30 دقيقة)
        if (diff > 30) return 3;

        // الأولوية 4: انتهت (مر أكثر من 130 دقيقة)
        return 4;
    };

    const rankA = getRank(diffA);
    const rankB = getRank(diffB);

    // الترتيب حسب الرتبة (الأقل رتبة يظهر أولاً)
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

  // حساب الوقت المتبقي
  const [h, m] = match.time.split(':').map(Number);
  const matchDate = new Date(); matchDate.setHours(h, m, 0, 0);
  const now = new Date();
  const diffMins = (matchDate - now) / 60000;

  // تحديد نص الوقت وحالة الشارة
  let timeText = match.time;
  let statusBadge = '';

  if (diffMins >= 0 && diffMins <= 10) {
      // إذا تبقى 10 دقائق أو أقل، نستبدل الوقت بـ "ستبدأ قريباً"
      timeText = '<span class="soon-text">ستبدأ قريباً</span>';
      statusBadge = '<span class="live-badge soon">قريباً</span>';
  } else if (diffMins < 0 && diffMins > -130) {
      // المباراة جارية
      statusBadge = '<span class="live-badge live">جاري الآن</span>';
      // يمكن إضافة النتيجة هنا إذا كانت متوفرة وتحدث مباشرة، لكن حالياً نترك الوقت أو النتيجة الثابتة
      // إذا كانت النتيجة متوفرة من المصدر، نستخدمها بدلاً من الوقت
      if (match.score && match.score !== 'VS' && match.score.includes('-')) {
          timeText = match.score;
      }
  }

  // التحقق من وجود القناة للعرض
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
      <article class="match-card">
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

  // ترتيب المباريات باستخدام الدالة المعدلة
  const sortedTodayMatches = [...todayMatches].sort(sortMatchesByPriority);

  // فلترة مباريات السهرة (اختياري، يعتمد على الوقت فقط)
  const featuredMatches = sortedTodayMatches.filter(match => {
    try {
      const [hours] = match.time.split(':').map(Number);
      return hours >= 16; 
    } catch (e) { return false; }
  });

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
