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
  const now = getMoroccoWallClockNow();
  const matchDate = match.scheduledAt ? new Date(match.scheduledAt) : now;
  const diffMins = (matchDate - now) / 60000;

  let timeText = match.time;
  let statusBadge = '';
  let matchStatusClass = '';
  
  let hrefAttribute = `href="${watchUrl || '#'}" target="_blank"`;
  let clickAction = '';
  let isClickableClass = watchUrl ? 'clickable' : 'not-clickable';

  // شرط فتح رابط المباراة عند البث أو تبقي 15 دقيقة أو أقل
    if (match.isLive || diffMins <= 15) {
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
  } else if (!isResolved && !watchUrl) {
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
    match.isLive ? 'live' : 'scheduled',
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
  const nextSignature = nextMatches.map(matchRenderSignature).join('||');
  if (container.dataset.matchSignature === nextSignature) return;

  const currentCards = new Map();
  container.querySelectorAll('article[data-match-id]').forEach((article) => {
    const link = article.closest('a.match-card-link');
    if (link) currentCards.set(article.dataset.matchId, link);
  });
  const nextIds = new Set(nextMatches.map(matchIdentity));

  for (const [matchId, link] of currentCards) {
    if (!nextIds.has(matchId)) link.remove();
  }

  const emptyMessage = container.querySelector('.no-matches');
  if (!nextMatches.length) {
    if (emptyMessage) {
      if (emptyMessage.textContent !== message) emptyMessage.innerHTML = `<i class="fas fa-futbol"></i><p>${message}</p>`;
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'no-matches';
      placeholder.innerHTML = `<i class="fas fa-futbol"></i><p>${message}</p>`;
      container.appendChild(placeholder);
    }
    container.dataset.matchSignature = nextSignature;
    return;
    }

  emptyMessage?.remove();
  for (const match of nextMatches) {
    const matchId = matchIdentity(match);
    const nextElement = createMatchElement(match);
    const currentElement = currentCards.get(matchId);
    if (currentElement) {
      const currentSignature = currentElement.dataset.renderSignature;
      if (currentSignature !== matchRenderSignature(match)) currentElement.replaceWith(nextElement);
    } else {
      container.appendChild(nextElement);
    }
    const element = container.querySelector(`article[data-match-id="${CSS.escape(matchId)}"]`)?.closest('a.match-card-link');
    if (element) {
      element.dataset.renderSignature = matchRenderSignature(match);
      container.appendChild(element);
    }
  }
  container.dataset.matchSignature = nextSignature;
}

// --- 5. الدالة الرئيسية (Load & Sort) ---
async function loadAndRenderMatches() {
  const [rawTodayMatches, rawTomorrowMatches] = await Promise.all([
    getTodayMatches(),
    getTomorrowMatches()
  ]);

  const allMatches = [...rawTodayMatches, ...rawTomorrowMatches]
    .filter(match => match?.scheduledAt && !Number.isNaN(new Date(match.scheduledAt).getTime()))
    .filter(match => /^https?:\/\//i.test(match.homeTeam?.logo || '') && /^https?:\/\//i.test(match.awayTeam?.logo || ''));
  const now = getMoroccoWallClockNow();

  const trueTodayMatches = [];
  const trueTomorrowMatches = [];

    // توزيع المباريات على الأيام بشكل صحيح بتوقيت المغرب
    const seenMatches = new Set();
    allMatches.forEach(match => {
      const matchKey = match.matchId || match.match_id || `${match.homeTeam.name}-${match.awayTeam.name}-${match.scheduledAt?.slice(0, 10) || 'undated'}`;
      if (seenMatches.has(matchKey)) return;
      seenMatches.add(matchKey);
      const matchDate = new Date(match.scheduledAt);
      const diffMins = (matchDate - now) / 60000;
      const isLive = match.isLive || (diffMins <= 0 && diffMins > -140);

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

      const diffA = (new Date(a.scheduledAt) - now) / 60000;
      const diffB = (new Date(b.scheduledAt) - now) / 60000;

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
      
      return new Date(a.scheduledAt) - new Date(b.scheduledAt);
  }

  trueTodayMatches.sort(sortMatches);
  trueTomorrowMatches.sort(sortMatches);

  // الفلترة الصحيحة للقسم العلوي لعرض المباريات التي لم تنتهِ
  const featuredMatches = trueTodayMatches.filter(match => {
      const diffMins = (new Date(match.scheduledAt) - now) / 60000;
      const isLive = match.isLive || (diffMins <= 0 && diffMins > -140);
      const isFinished = diffMins <= -140 && !isLive;
      return !isFinished; 
  });

  // العرض في الأقسام
  renderSection(DOM.featuredContainer, featuredMatches, 'لا توجد مباريات بارزة أو جارية حالياً.');
  renderSection(DOM.broadcastContainer, trueTodayMatches, 'لا توجد مباريات هامة اليوم.');
  renderSection(DOM.todayContainer, trueTodayMatches, 'لا توجد مباريات اليوم.');
  renderSection(DOM.tomorrowContainer, trueTomorrowMatches, 'لا توجد مباريات غداً.');
  hideLoading();
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
