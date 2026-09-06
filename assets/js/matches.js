// assets/js/matches.js

import {
  getTodayMatches,
  getTomorrowMatches,
  getMoroccoWallClockNow,
  getMoroccoDay
} from './api.js';
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

// --- 3. دالة بناء بطاقة المباراة (Render) ---
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

  // استخدام التاريخ الفعلي المدمج داخل كائن المباراة
  const now = new Date();
  const matchDate = matchStartDate(match) || now;
  const diffMins = (matchDate - now) / 60000;
  const withinMatchWindow = diffMins <= 15 && diffMins >= -180;
  const isLive = diffMins <= 0 && diffMins >= -180;

  let timeText = match.time;
  let statusBadge = '';
  let matchStatusClass = '';
  
    let hrefAttribute = `href="${watchUrl || '#'}" target="_blank"`;
  let clickAction = '';
    let isClickableClass = watchUrl && withinMatchWindow ? 'clickable' : 'not-clickable';

    if (withinMatchWindow && watchUrl) {
      if (diffMins >= 0) {
          timeText = '<span class="soon-text-blink">ستبدأ قريباً</span>';
          statusBadge = '<span class="live-badge soon">قريباً</span>';
      } else if (isLive) {
           statusBadge = '<span class="live-badge live">جاري الآن</span>';
           matchStatusClass = 'is-live';
           if (match.score && match.score.includes('-')) {
               timeText = `<span class="live-score">${match.score}</span>`;
           }
      }
    } else if (watchUrl) {
      hrefAttribute = 'href="javascript:void(0)"';
      clickAction = 'onclick="return false"';
    } else if (!isResolved && !watchUrl) {
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
      <article class="match-card ${matchStatusClass}" data-match-id="${stableId}">
        ${!hasStreams ? '<span class="no-stream-badge">Stream Unavailable</span>' : ''}
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

// --- 4. دالة تعبئة الأقسام ---
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

// --- 5. الدالة الرئيسية (Load & Sort) ---
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

    // توزيع المباريات على الأيام بشكل صحيح بتوقيت المغرب
    const seenMatches = new Set();
    allMatches.forEach(match => {
      const matchKey = match.matchId || match.match_id || `${match.homeTeam.name}-${match.awayTeam.name}-${match.scheduledAt?.slice(0, 10) || 'undated'}`;
      if (seenMatches.has(matchKey)) return;
      seenMatches.add(matchKey);
      const matchDate = matchStartDate(match);
      const diffMins = (matchDate - now) / 60000;
      const isLive = diffMins <= 0 && diffMins >= -180;

      const day = getMoroccoDay(match.scheduledAt, new Date());
      if (day === 'today' || (isLive && day === 'today')) trueTodayMatches.push(match);
      else if (day === 'tomorrow') trueTomorrowMatches.push(match);
  });

  // دالة الترتيب
  function sortMatches(a, b) {
      const matchSpecificKeyA = `${a.homeTeam.name}-${a.awayTeam.name}`;
      const watchUrlA = Array.isArray(a.streams) && a.streams.length > 0;

      const matchSpecificKeyB = `${b.homeTeam.name}-${b.awayTeam.name}`;
      const watchUrlB = Array.isArray(b.streams) && b.streams.length > 0;

      const diffA = (matchStartDate(a) - now) / 60000;
      const diffB = (matchStartDate(b) - now) / 60000;

      const getRank = (diff, hasStream, isLive) => {
          if (!hasStream) return 4; 
          if (isLive || (diff < 0 && diff > -140)) return 1;
          if (diff >= 0 && diff <= 45) return 2; 
          if (diff > 45) return 3; 
          return 5;
      };

      const rankA = getRank(diffA, !!watchUrlA, diffA <= 0 && diffA >= -180);
      const rankB = getRank(diffB, !!watchUrlB, diffB <= 0 && diffB >= -180);

      if (rankA !== rankB) return rankA - rankB;
      
      return matchStartDate(a) - matchStartDate(b);
  }

  trueTodayMatches.sort(sortMatches);
  trueTomorrowMatches.sort(sortMatches);

  // الفلترة الصحيحة للقسم العلوي لعرض المباريات التي لم تنتهِ
  const featuredMatches = trueTodayMatches.filter(match => {
      const diffMins = (matchStartDate(match) - now) / 60000;
      const isFinished = diffMins <= -180;
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
