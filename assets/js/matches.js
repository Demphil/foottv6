// assets/js/matches.js

import {
  getTodayMatches,
  getTomorrowMatches,
  getMoroccoWallClockNow,
  getMoroccoDay
} from './api.js';
import { streamLinks } from './streams.js';

const publicSupabaseConfig = window.__SUPABASE_CONFIG__ || {};
const supabaseClient = window.supabase?.createClient && publicSupabaseConfig.url && publicSupabaseConfig.anonKey
  ? window.supabase.createClient(publicSupabaseConfig.url, publicSupabaseConfig.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

if (!supabaseClient) console.info('[MATCHES] Public Supabase client is not configured; using the server match feed.');

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

window.openWaitModal = function(message) {
    const modal = document.getElementById('wait-modal');
    if (modal) {
        // إذا كان هناك نص مخصص للنافذة يمكننا وضعه (اختياري)
        const msgElement = modal.querySelector('p');
        if (msgElement && message) msgElement.innerText = message;
        modal.style.display = 'flex';
    } else if (message) {
        alert(message);
    }
}

window.closeWaitModal = function() {
    const modal = document.getElementById('wait-modal');
    if (modal) modal.style.display = 'none';
}

function matchStartDate(match) {
  if (match?.scheduledAt) {
    const scheduledDate = new Date(match.scheduledAt);
    if (!Number.isNaN(scheduledDate.getTime())) return scheduledDate;
  }

  const timeMatch = String(match?.time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return null;
  const localDate = new Date();
  localDate.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
  return localDate;
}

function renderMatch(match) {
  if (!match || !match.homeTeam || !match.awayTeam) return '';

  const { homeTeam, awayTeam } = match;
  const homeTeamName = homeTeam.name;
  const awayTeamName = awayTeam.name;
  const homeLogo = homeTeam.logo || 'assets/images/default-logo.jpg';
  const awayLogo = awayTeam.logo || 'assets/images/default-logo.jpg';
  const matchSpecificKey = `${homeTeamName}-${awayTeamName}`;
  const matchId = `${homeTeamName}_vs_${awayTeamName}`
    .toLocaleLowerCase('ar').trim().replace(/\s+/g, '_');
  const stableId = match.matchId || match.match_id || `${matchId}-${match.scheduledAt?.slice(0, 10) || 'undated'}`;
  
  const hasStreams = Array.isArray(match.streams) && match.streams.length > 0;
  const isResolved = match.status === 'PASSED_STAGING' || hasStreams;
  const fallbackWatchUrl = streamLinks[match.channel] || streamLinks[matchSpecificKey];
  
  const watchUrl = isResolved
    ? `watch.html?id=${encodeURIComponent(stableId)}`
    : fallbackWatchUrl
      ? `${fallbackWatchUrl}${fallbackWatchUrl.includes('?') ? '&' : '?'}matchId=${encodeURIComponent(stableId)}`
      : '';

  const now = new Date();
  const matchDate = matchStartDate(match) || now;
  const diffMins = (matchDate - now) / 60000;
  const isLive = diffMins <= 0 && diffMins >= -180;
  const isSoon = diffMins > 0 && diffMins <= 20;
  
  // شرط الدخول: قبل المباراة بـ 20 دقيقة أو أثناء البث
  const withinMatchWindow = diffMins <= 20 && diffMins >= -180; 

  const channelName = typeof match.channel === 'string' && match.channel.trim()
    && !['غير محدد', 'Unknown', 'غير معروف'].includes(match.channel.trim())
    ? match.channel.trim()
    : 'تحدد لاحقاً';

  let timeText = match.time;
  let statusBadge = '';
  let matchStatusClass = '';
  
  let hrefAttribute = `href="javascript:void(0)"`;
  let clickAction = `onclick="openWaitModal()"`;
  let isClickableClass = 'not-clickable';

  if (watchUrl) {
      if (withinMatchWindow) {
          // رابط متاح والوقت مسموح
          hrefAttribute = `href="${watchUrl}" target="_blank"`;
          clickAction = '';
          isClickableClass = 'clickable';
      } else {
          // رابط متاح ولكن الوقت مبكر جداً
          clickAction = `onclick="openWaitModal('ستتوفر صفحة المشاهدة قبل بداية المباراة بـ 20 دقيقة.')"`;
          isClickableClass = 'clickable early-click'; 
      }
  }

  if (isSoon) {
      timeText = '<span class="soon-text-blink">ستبدأ قريباً</span>';
      statusBadge = '<span class="live-badge soon">قريباً</span>';
  } else if (isLive) {
      statusBadge = '<span class="live-badge live">جاري الآن</span>';
      matchStatusClass = 'is-live';
      if (match.score && match.score.includes('-')) {
          timeText = `<span class="live-score">${match.score}</span>`;
      }
  }

  const matchDetailsHTML = `
    <div class="match-detail-item">
      <i class="fas fa-tv" aria-hidden="true"></i>
      <span>${channelName}</span>
    </div>
    ${match.commentator ? `
      <div class="match-detail-item">
        <i class="fas fa-microphone-alt" aria-hidden="true"></i>
        <span>${match.commentator}</span>
      </div>
    ` : ''}
  `;

  return `
    <a ${hrefAttribute} ${clickAction} class="match-card-link ${isClickableClass}">
      <article class="match-card ${matchStatusClass}" data-match-id="${stableId}">
        ${!hasStreams && !fallbackWatchUrl ? '<span class="no-stream-badge">غير جاهز الان</span>' : ''}
        ${statusBadge}
        <div class="league-info"><span>${match.league}</span></div>
        <div class="teams">
          <div class="team">
            <img src="${homeLogo}" alt="${homeTeamName}" loading="lazy" onerror="this.src='assets/images/default-logo.jpg';">
            <span class="team-name">${homeTeamName}</span>
          </div>
          <div class="match-info">
            <span class="score">${match.score}</span>
            <span class="time">${timeText}</span>
          </div>
          <div class="team">
            <img src="${awayLogo}" alt="${awayTeamName}" loading="lazy" onerror="this.src='assets/images/default-logo.jpg';">
            <span class="team-name">${awayTeamName}</span>
          </div>
        </div>
        ${matchDetailsHTML.trim() ? `<div class="match-details-extra">${matchDetailsHTML}</div>` : ''}
      </article>
    </a>
  `;
}

function matchIdentity(match) {
  return match.matchId || match.match_id || `${match.homeTeam.name}-${match.awayTeam.name}-${match.scheduledAt?.slice(0, 10) || 'undated'}`;
}

function matchRenderSignature(match) {
  return [
    matchIdentity(match),
    match.scheduledAt || '',
    match.time || '',
    match.score || '',
    matchStartDate(match) && matchStartDate(match) <= new Date() ? 'live' : 'scheduled',
    match.channel || '',
    Array.isArray(match.streams) ? match.streams.map((stream) => stream.url || '').join(',') : '',
    match.homeTeam?.logo || '',
    match.awayTeam?.logo || ''
  ].join('|');
}

function createMatchElement(match) {
  const template = document.createElement('template');
  template.innerHTML = renderMatch({ ...match, matchId: matchIdentity(match) }).trim();
  return template.content.firstElementChild;
}

function renderSection(container, matches, message) {
    if (!container) return;
  const nextMatches = matches || [];
  container.innerHTML = '';
  container.dataset.matchSignature = nextMatches.map(matchRenderSignature).join('||');
  if (!nextMatches.length) {
    container.innerHTML = `<div class="no-matches"><i class="fas fa-futbol"></i><p>${message}</p></div>`;
    return;
  }

  for (const match of nextMatches) {
    const element = createMatchElement(match);
    element.dataset.renderSignature = matchRenderSignature(match);
    container.appendChild(element);
  }
}

async function loadAndRenderMatches() {
  const [rawTodayMatches, rawTomorrowMatches] = await Promise.all([
    getTodayMatches(),
    getTomorrowMatches()
  ]);

  hideLoading();
  const allMatches = [...rawTodayMatches, ...rawTomorrowMatches]
    .filter(match => match?.homeTeam?.name && match?.awayTeam?.name && matchStartDate(match));
  const now = new Date();

  const trueTodayMatches = [];
  const trueTomorrowMatches = [];

  const seenMatches = new Set();
  allMatches.forEach(match => {
      const matchKey = match.matchId || match.match_id || `${match.homeTeam.name}-${match.awayTeam.name}-${match.scheduledAt?.slice(0, 10) || 'undated'}`;
      if (seenMatches.has(matchKey)) return;
      seenMatches.add(matchKey);
      
      const day = getMoroccoDay(match.scheduledAt, new Date());
      if (day === 'today') trueTodayMatches.push(match);
      else if (day === 'tomorrow') trueTomorrowMatches.push(match);
  });

  // الترتيب الذكي الجديد حسب الأولوية
  function sortMatches(a, b) {
      const diffA = (matchStartDate(a) - now) / 60000;
      const diffB = (matchStartDate(b) - now) / 60000;

      const hasLinkA = (Array.isArray(a.streams) && a.streams.length > 0) || a.status === 'PASSED_STAGING';
      const hasLinkB = (Array.isArray(b.streams) && b.streams.length > 0) || b.status === 'PASSED_STAGING';

      const getTier = (diff, hasLink) => {
        if (!hasLink) return 5;                  // بدون روابط (تذهب للأسفل دائماً)
        if (diff <= 0 && diff >= -180) return 1; // جارية الآن
        if (diff > 0 && diff <= 60) return 2;    // ستبدأ خلال ساعة أو أقل
        if (diff > 60) return 3;                 // ستبدأ بعد أكثر من ساعة
        return 4;                                // منتهية
      };

      const tierA = getTier(diffA, hasLinkA);
      const tierB = getTier(diffB, hasLinkB);

      // الفرز بالدرجات أولاً
      if (tierA !== tierB) return tierA - tierB;
      
      // إذا تساوت الدرجة، رتبها زمنياً
      return matchStartDate(a) - matchStartDate(b);
  }

  trueTodayMatches.sort(sortMatches);
  trueTomorrowMatches.sort(sortMatches);

  // تم إلغاء التقسيم (featuredPool) لكي تظهر جميع المباريات في القائمة العلوية
  renderSection(DOM.featuredContainer, trueTodayMatches, 'لا توجد مباريات جارية أو قادمة اليوم.');
  renderSection(DOM.broadcastContainer, trueTodayMatches, 'لا توجد مباريات هامة اليوم.');
  renderSection(DOM.todayContainer, trueTodayMatches, 'لا توجد مباريات اليوم.');
  renderSection(DOM.tomorrowContainer, trueTomorrowMatches, 'لا توجد مباريات غداً.');
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