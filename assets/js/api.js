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
 * دالة ذكية لحساب أولوية المباراة للترتيب
 * 1. ستبدأ خلال 5 دقائق أو أقل -> الأولوية الأولى
 * 2. جارية حالياً -> الأولوية الثانية
 * 3. ستبدأ لاحقاً -> الأولوية الثالثة
 * 4. انتهت -> الأولوية الأخيرة
 */
function sortMatchesByPriority(a, b) {
    const now = new Date();
    
    // دالة مساعدة لتحويل وقت المباراة (HH:MM) إلى كائن تاريخ
    const getMatchDate = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const dateA = getMatchDate(a.time);
    const dateB = getMatchDate(b.time);

    // الفرق بالدقائق (الموجب يعني في المستقبل، السالب يعني بدأت)
    const diffA = (dateA - now) / 60000; 
    const diffB = (dateB - now) / 60000;

    // دالة لتحديد "رتبة" المباراة بناءً على طلبك
    const getRank = (diff, score) => {
        // الحالة 1: ستبدأ خلال 0 إلى 5 دقائق (الأهم)
        if (diff >= 0 && diff <= 5) return 1;
        
        // الحالة 2: المباراة جارية (بدأت منذ أقل من 130 دقيقة والنتيجة ليست VS)
        // أو بدأت للتو (diff سالب)
        const isLive = diff < 0 && diff > -130; 
        if (isLive) return 2;

        // الحالة 3: مباريات المستقبل (أكثر من 5 دقائق)
        if (diff > 5) return 3;

        // الحالة 4: مباريات انتهت (مر عليها أكثر من ساعتين)
        return 4;
    };

    const rankA = getRank(diffA, a.score);
    const rankB = getRank(diffB, b.score);

    // الترتيب حسب الرتبة أولاً
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

  // إضافة علامة "LIVE" أو "SOON" لتمييز المباريات المهمة بصرياً
  let statusBadge = '';
  const [h, m] = match.time.split(':').map(Number);
  const matchDate = new Date(); matchDate.setHours(h, m, 0, 0);
  const diffMins = (matchDate - new Date()) / 60000;

  if (diffMins >= 0 && diffMins <= 5) {
      statusBadge = '<span class="live-badge soon">سيبدأ قريباً</span>';
  } else if (diffMins < 0 && diffMins > -130) {
      statusBadge = '<span class="live-badge live">جاري الآن</span>';
  }

  const matchDetailsHTML = `
    ${match.channel ? `<div class="match-detail-item"><i class="fas fa-tv"></i><span>${match.channel}</span></div>` : ''}
    ${match.commentator ? `<div class="match-detail-item"><i class="fas fa-microphone-alt"></i><span>${match.commentator}</span></div>` : ''}
  `;

  return `
    <a href="${watchUrl || '#'}" target="_blank" rel="noopener noreferrer" class="match-card-link ${isClickable}">
      <article class="match-card">
        ${!watchUrl ? '<span class="no-stream-badge">Stream Unavailable</span>' : ''}
        ${statusBadge} <div class="league-info"><span>${match.league}</span></div>
        <div class="teams">
          <div class="team">
            <img src="${homeLogo}" alt="${match.homeTeam.name}" loading="lazy" onerror="this.src='assets/images/default-logo.png';">
            <span class="team-name">${match.homeTeam.name}</span>
          </div>
          <div class="match-info">
            <span class="score">${match.score}</span>
            <span class="time">${match.time}</span>
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

  // --- تطبيق الترتيب الذكي هنا ---
  // نقوم بنسخ المصفوفة وترتيبها حتى لا نؤثر على البيانات الأصلية بشكل خاطئ
  const sortedTodayMatches = [...todayMatches].sort(sortMatchesByPriority);

  // فلترة مباريات السهرة (اختياري)
  const featuredMatches = sortedTodayMatches.filter(match => {
    try {
      const [hours] = match.time.split(':').map(Number);
      return hours >= 16; 
    } catch (e) { return false; }
  });

  // 1. مباريات السهرة (مرتبة بالأولوية أيضاً)
  renderSection(DOM.featuredContainer, featuredMatches, 'No evening matches today.');
  
  // 2. أهم المباريات (مرتبة: 5 دقائق > جاري > قادم)
  renderSection(DOM.broadcastContainer, sortedTodayMatches, 'No key matches scheduled for today.');
  
  // 3. جدول اليوم
  renderSection(DOM.todayContainer, sortedTodayMatches, 'No matches scheduled for today.');
  
  // 4. جدول الغد (يبقى بالترتيب الزمني العادي)
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
