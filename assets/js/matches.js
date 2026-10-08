// assets/js/matches.js

import {
  getTodayMatches,
  getTomorrowMatches,
  getCachedMatchSnapshot,
  getMoroccoWallClockNow,
  getMoroccoDay,
  getMoroccoDateKey,
  getNextMoroccoDayDelay
} from './api.js?v=20261008-retention-storage';
import { frontendMatchState } from '../../shared/match-lifecycle.mjs?v=20261004-day-retention';

const STREAM_API_ORIGIN = window.__MATCHES_API_ORIGIN__ || 'https://stream-api.koratv.click';
const PLAYER_ORIGIN = 'https://fabor.sbs';
const PLAYER_PATH = '/739184.html';

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
        const titleElement = modal.querySelector('h2, h3');
        if (titleElement) titleElement.innerText = 'حالة البث المباشر';
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

// تصحيح التوقيت الذكي لتجاهل أخطاء قاعدة البيانات والمسافات المخفية (مثل 12:00)
function matchStartDate(match) {
  if (match?.scheduledAt) {
    const scheduledDate = new Date(match.scheduledAt);
    if (!Number.isNaN(scheduledDate.getTime())) return scheduledDate;
  }

  if (match?.time && match.time !== 'مباشر الآن' && match.time.includes(':')) {
    // إزالة ^ و $ من البحث لكي نلتقط الوقت حتى لو كان محاطاً بمسافات مخفية
    const timeMatch = String(match.time).match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      let hour = Number(timeMatch[1]);
      const minute = Number(timeMatch[2]);
      
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
    }
  }

  return null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  if (!text || /^null$/i.test(text) || /^undefined$/i.test(text)) return fallback;
  return text;
}

function cleanScore(value) {
  const score = cleanText(value);
  if (!score || /^vs$/i.test(score) || /null|undefined/i.test(score)) return 'VS';
  const parts = score.split('-').map((part) => cleanText(part));
  if (parts.length >= 2 && parts[0] !== '' && parts[1] !== '') return `${parts[0]} - ${parts[1]}`;
  return 'VS';
}

function liveMinuteText(match, matchDate) {
  const explicit = match.liveMinute == null ? NaN : Number(match.liveMinute);
  const extra = Math.max(0, Number(match.liveExtraMinute) || 0);
  return Number.isFinite(explicit) && explicit >= 0 ? `${Math.round(explicit)}${extra ? `+${extra}` : ''}'` : 'مباشر';
}

function scoreMarkup(value) {
  const parts = String(value || '').match(/^(\d+)\s*-\s*(\d+)$/);
  return parts ? `<span class="team-score-pair"><span data-score-side="home">${parts[1]}</span><span aria-hidden="true">-</span><span data-score-side="away">${parts[2]}</span></span>` : 'VS';
}

function cardsTotal(cards) {
  if (typeof cards === 'number') return Number.isFinite(cards) ? cards : 0;
  if (!cards || typeof cards !== 'object') return 0;
  const home = Number(cards.home ?? cards.homeTeam ?? cards.local ?? 0);
  const away = Number(cards.away ?? cards.awayTeam ?? cards.visitor ?? 0);
  return (Number.isFinite(home) ? home : 0) + (Number.isFinite(away) ? away : 0);
}

function cardsSide(cards, side) {
  if (!cards || typeof cards !== 'object') return 0;
  const value = side === 'home'
    ? Number(cards.home ?? cards.homeTeam ?? cards.local ?? 0)
    : Number(cards.away ?? cards.awayTeam ?? cards.visitor ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function renderLiveData(match, matchDate, isLive) {
  if (!isLive && match.playbackState !== 'ended') return '';
  const goals = Array.isArray(match.goals) ? match.goals.filter((goal) => goal?.player) : [];
  const yellow = cardsTotal(match.yellowCards);
  const red = cardsTotal(match.redCards);
  return `
    ${yellow > 0 || red > 0 ? `<div class="match-card-counts" aria-label="البطاقات">
      ${yellow > 0 ? `<span><i class="card-dot yellow" aria-hidden="true"></i>${yellow}<span class="sr-only">بطاقات صفراء</span></span>` : ''}
      ${red > 0 ? `<span><i class="card-dot red" aria-hidden="true"></i>${red}<span class="sr-only">بطاقات حمراء</span></span>` : ''}
    </div>` : ''}
    ${goals.length ? `<div class="match-scorers" tabindex="0" aria-label="مسجلو الأهداف">
      ${goals.map((goal) => `<span><i class="fas fa-futbol" aria-hidden="true"></i>${goal.minute ? escapeHtml(goal.minute) + "' " : ''}${escapeHtml(goal.player)}</span>`).join('')}
    </div>` : ''}
  `;
}

function renderApiFootballMap(match, isLive, isEnded) {
  const goals = Array.isArray(match.goals) ? match.goals.filter((goal) => goal?.player) : [];
  const nodes = [
    { key: 'live', label: 'مباشر', detail: isLive ? `الدقيقة ${liveMinuteText(match, matchStartDate(match))}` : isEnded ? 'انتهت المباراة' : 'لم تبدأ المباراة بعد' },
    { key: 'events', label: 'أحداث', detail: goals.length ? goals.map((goal) => `${goal.minute ? goal.minute + "' " : ''}${goal.player}`).join(' · ') : 'لا توجد أحداث أهداف مسجلة بعد' },
    { key: 'statistics', label: 'إحصائيات', detail: `بطاقات صفراء: ${cardsTotal(match.yellowCards)} · بطاقات حمراء: ${cardsTotal(match.redCards)}` },
    { key: 'teams', label: 'الفرق', detail: '' }
  ];
  return `
    <div class="api-football-map" role="tablist" aria-label="تفاصيل المباراة">
      ${nodes.map((node) => `<button type="button" class="api-map-node" data-endpoint="${node.key}" data-detail="${escapeHtml(node.detail)}" role="tab" aria-selected="false">${node.label}</button>`).join('')}
    </div>
    <div class="api-map-detail" role="tabpanel" aria-live="polite" hidden></div>
  `;
}

function renderMatch(match) {
  if (!match || !match.homeTeam || !match.awayTeam) return '';

  const normalizedScore = cleanScore(match.score);
  const { homeTeam, awayTeam } = match;
  const homeTeamName = homeTeam.name;
  const awayTeamName = awayTeam.name;
  const homeLogo = homeTeam.logo || 'assets/images/default-logo.jpg';
  const awayLogo = awayTeam.logo || 'assets/images/default-logo.jpg';
  const matchId = `${homeTeamName}_vs_${awayTeamName}`
    .toLocaleLowerCase('ar').trim().replace(/\s+/g, '_');
  const stableId = match.matchId || match.match_id || `${matchId}-${match.scheduledAt?.slice(0, 10) || 'undated'}`;
  const publicWatchId = opaqueWatchId(stableId);
  const watchUrl = playerUrlForMatch(stableId);
  
  // ==========================================
  // 🚀 الإصلاح الجذري لمشكلة منتصف الليل والتوقيت
  // ==========================================
  const now = new Date();
  let matchDate = null;

  try {
      if (typeof matchStartDate === 'function') {
          matchDate = matchStartDate(match);
      }
      if (!matchDate && match.scheduledAt) {
          matchDate = new Date(match.scheduledAt);
      }
  } catch (e) {}
  
  let diffMins;
  // إذا كان الوقت سليماً وقابلاً للقراءة، نحسب الفارق
  if (matchDate && !isNaN(matchDate.getTime())) {
      diffMins = (matchDate - now) / 60000;
  } else if (match.time === 'مباشر الآن' || match.time === 'جاري الآن') {
      diffMins = 0;
  } else {
      // 🛡️ الحماية: إذا فشل النظام في معرفة الوقت (بسبب تغيير اليوم)،
      // نعتبر المباراة بعيدة جداً (9999 دقيقة) كي لا تفتح بالخطأ أبداً!
      diffMins = 9999; 
  }

  const lifecycleState = frontendMatchState(match, diffMins);
  match = { ...match, playbackState: lifecycleState };
  const isEnded = lifecycleState === 'ended';
  const isLive = lifecycleState === 'live';
  const isSoon = diffMins > 0 && diffMins <= 60; 
  const hasKnownSource = match.sourceAvailable === true || Boolean(match.channelName);
  const canOpenSecurePlayer = isLive && !isEnded;
  const disabledReason = isEnded
    ? 'ended'
    : !isLive
      ? 'upcoming'
      : !hasKnownSource
        ? 'channel_unavailable'
        : 'source_unavailable';
  const linkAttributes = canOpenSecurePlayer
    ? `href="${watchUrl}" target="_blank" rel="noopener noreferrer" data-secure-match-id="${encodeURIComponent(stableId)}"`
    : `href="javascript:void(0)" data-disabled-reason="${disabledReason}"`;
  const linkClass = canOpenSecurePlayer ? 'clickable' : 'not-clickable';

  let timeText = cleanText(match.time, '');
  
  if (match.time !== 'مباشر الآن' && match.time !== 'تحدد لاحقا') {
      if (matchDate && !isNaN(matchDate.getTime())) {
          timeText = matchDate.toLocaleTimeString('ar-EG-u-nu-latn', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
          });
      }
  }

  let statusBadge = '';
  let matchStatusClass = '';
  
  if (isEnded) {
      statusBadge = '<span class="live-badge ended">انتهت</span>';
      timeText = 'انتهت';
      matchStatusClass = 'is-ended';
  } else if (isSoon) {
      timeText = '<span class="soon-text-blink">تبدأ قريباً</span>';
      statusBadge = '<span class="live-badge soon">قريباً</span>';
  } else if (isLive) {
      statusBadge = '<span class="live-badge live">جارية</span>';
      matchStatusClass = 'is-live';
      timeText = liveMinuteText(match, matchDate);
  }
  if (!timeText) timeText = matchDate && !isNaN(matchDate.getTime()) ? matchDate.toLocaleTimeString('ar-EG-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) : 'تحدد لاحقاً';

  return `
    <div class="match-card-link ${linkClass}">
      <article class="match-card ${matchStatusClass}" data-match-id="${stableId}" data-watch-id="${publicWatchId}">
        ${statusBadge}
        <a ${linkAttributes} class="match-watch-link"><div class="teams">
          <div class="team">
            <img src="${homeLogo}" alt="${homeTeamName}" loading="lazy" onerror="this.src='assets/images/default-logo.jpg';">
            <span class="team-name">${homeTeamName}</span>
          </div>
          <div class="match-info">
            <span class="score">${scoreMarkup(normalizedScore)}</span>
            <span class="time">${timeText}</span>
          </div>
          <div class="team">
            <img src="${awayLogo}" alt="${awayTeamName}" loading="lazy" onerror="this.src='assets/images/default-logo.jpg';">
            <span class="team-name">${awayTeamName}</span>
          </div>
        </div></a>
        ${renderLiveData(match, matchDate, isLive)}
        ${renderApiFootballMap(match, isLive, isEnded)}
      </article>
    </div>
  `;
}

function normalizeMatchName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/سان دي(?:ي)?[غج]و/gi, 'سان دييغو')
    .toLocaleLowerCase('ar');
}

function matchCanonicalKey(match) {
  const first = normalizeMatchName(match.homeTeam?.name || match.homeTeam);
  const second = normalizeMatchName(match.awayTeam?.name || match.awayTeam);
  const teams = [first, second].sort().join('|');
  const date = String(match.scheduledAt || '').slice(0, 10) || String(match.time || '');
  return `${teams}|${date}`;
}

function matchCompletenessScore(match) {
  let score = 0;
  if (match.resourceStatus === 'ASSIGNED') score += 100;
  if (match.playbackState === 'live') score += 14;
  if (match.playbackState === 'ended') score += 8;
  if (match.homeTeam?.logo) score += 4;
  if (match.awayTeam?.logo) score += 4;
  if (match.score && match.score !== 'VS') score += 5;
  if (Number.isFinite(Number(match.liveMinute))) score += 3;
  if (cardsTotal(match.yellowCards) || cardsTotal(match.redCards)) score += 3;
  if (Array.isArray(match.goals) && match.goals.length) score += 2;
  return score;
}

function dedupeMatches(matches) {
  const byKey = new Map();
  for (const match of matches) {
    const key = matchCanonicalKey(match);
    const current = byKey.get(key);
    if (!current || matchCompletenessScore(match) > matchCompletenessScore(current)) {
      byKey.set(key, match);
    }
  }
  return [...byKey.values()];
}

function matchIdentity(match) {
  return match.matchId || match.match_id || `${match.homeTeam.name}-${match.awayTeam.name}-${match.scheduledAt?.slice(0, 10) || 'undated'}`;
}

function opaqueWatchId(value) {
  let hash = 0xcbf29ce484222325n;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return String(hash).padStart(20, '0');
}

function playerUrlForMatch(matchId) {
  const url = new URL(PLAYER_PATH, PLAYER_ORIGIN);
  url.searchParams.set('match', opaqueWatchId(matchId));
  return url.href;
}

function setupSecurePlayerLinks() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('.match-watch-link[data-disabled-reason]');
    if (!link) return;
    event.preventDefault();
    const messages = {
      upcoming: 'سيُفتح البث قبل بداية المباراة بعشرين دقيقة.',
      ended: 'انتهت المباراة وتم إغلاق البث.',
      channel_unavailable: 'لم تُحدد القناة الناقلة بعد.',
      source_unavailable: 'القناة معروفة لكن مصدر التشغيل لم يجهز بعد. سيتم تحديثها تلقائياً.'
    };
    window.openWaitModal?.(messages[link.dataset.disabledReason] || 'البث غير متاح حالياً.');
  });
}

function activateApiMapNode(node) {
  const card = node.closest('.match-card');
  if (!card) return;
  card.querySelectorAll('.api-map-node').forEach((item) => {
    item.classList.toggle('is-selected', item === node);
    item.setAttribute('aria-selected', String(item === node));
  });
  card.querySelector('.teams')?.classList.toggle('is-highlighted', node.dataset.endpoint === 'teams');
  const detail = card.querySelector('.api-map-detail');
  if (!detail) return;
  const scorers = card.querySelector('.match-scorers');
  const expanded = Boolean(card.closest('.match-dialog'));
  if (expanded && scorers) scorers.hidden = node.dataset.endpoint !== 'events';
  detail.hidden = node.dataset.endpoint === 'teams' || (expanded && Boolean(scorers) && node.dataset.endpoint === 'events');
  detail.textContent = node.dataset.detail || '';
}

let matchDialog;
let matchDialogTrigger;

function fillMatchDialog(card, endpoint) {
  const copy = card.cloneNode(true);
  // The expanded card displays data only; opening a tab never allocates a stream.
  copy.querySelectorAll('.match-watch-link').forEach((link) => {
    const header = document.createElement('div');
    header.className = 'match-watch-link';
    header.append(...link.childNodes);
    link.replaceWith(header);
  });
  copy.querySelector('.match-scorers')?.removeAttribute('tabindex');
  matchDialog.querySelector('.match-dialog-content').replaceChildren(copy);
  const selected = [...copy.querySelectorAll('.api-map-node')].find((node) => node.dataset.endpoint === endpoint);
  if (selected) activateApiMapNode(selected);
}

function openMatchDetails(node) {
  if (node.closest('.match-dialog')) { activateApiMapNode(node); return; }
  const card = node.closest('.match-card');
  if (!card) return;
  if (!matchDialog) {
    matchDialog = document.createElement('dialog');
    matchDialog.className = 'match-dialog';
    matchDialog.setAttribute('aria-label', 'تفاصيل المباراة');
    matchDialog.innerHTML = '<button type="button" class="match-dialog-close" aria-label="إغلاق" title="إغلاق"><span aria-hidden="true">×</span></button><div class="match-dialog-content"></div>';
    document.body.append(matchDialog);
    matchDialog.querySelector('.match-dialog-close').addEventListener('click', () => matchDialog.close());
    matchDialog.addEventListener('click', (event) => {
      const bounds = matchDialog.getBoundingClientRect();
      if (event.target === matchDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) matchDialog.close();
    });
    matchDialog.addEventListener('close', () => {
      document.body.classList.remove('match-dialog-open');
      if (matchDialogTrigger?.isConnected) matchDialogTrigger.focus();
      else document.querySelector(`.match-card[data-match-id="${CSS.escape(matchDialog.dataset.matchId)}"] .api-map-node`)?.focus();
    });
  }
  matchDialogTrigger = node;
  matchDialog.dataset.matchId = card.dataset.matchId;
  fillMatchDialog(card, node.dataset.endpoint);
  document.body.classList.add('match-dialog-open');
  matchDialog.showModal();
  matchDialog.querySelector('.api-map-node.is-selected')?.focus();
}

function refreshMatchDialog() {
  if (!matchDialog?.open) return;
  const card = [...document.querySelectorAll('.tab-content .match-card')].find((item) => item.dataset.matchId === matchDialog.dataset.matchId);
  if (!card) { matchDialog.close(); return; }
  const focusedTab = document.activeElement?.closest('.api-map-node')?.dataset.endpoint;
  const selected = matchDialog.querySelector('.api-map-node.is-selected')?.dataset.endpoint || 'live';
  fillMatchDialog(card, selected);
  if (focusedTab) matchDialog.querySelector(`[data-endpoint="${focusedTab}"]`)?.focus({ preventScroll: true });
}

function setupApiFootballDetails() {
  document.addEventListener('click', (event) => {
    const node = event.target.closest?.('.api-map-node');
    if (!node) return;
    event.preventDefault();
    event.stopPropagation();
    openMatchDetails(node);
  });
  document.addEventListener('keydown', (event) => {
    const node = event.target.closest?.('.api-map-node');
    if (!node) return;
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const nodes = [...node.parentElement.querySelectorAll('.api-map-node')];
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? nodes.length - 1
        : (nodes.indexOf(node) + (event.key === 'ArrowLeft' ? 1 : -1) + nodes.length) % nodes.length;
      nodes[index].focus();
      if (node.closest('.match-dialog')) activateApiMapNode(nodes[index]);
      return;
    }
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    openMatchDetails(node);
  });
}

function matchRenderSignature(match) {
  return [
    matchIdentity(match),
    match.scheduledAt || '',
    match.time || '',
    match.score || '',
    match.playbackState || '',
    Number.isFinite(Number(match.liveMinute)) ? String(match.liveMinute) : '',
    JSON.stringify(match.yellowCards || null),
    JSON.stringify(match.redCards || null),
    JSON.stringify(match.goals || null),
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

function compareBroadcastPriority(a, b, now = new Date()) {
  const start = match => matchStartDate(match)?.getTime() || 0;
  const phase = match => frontendMatchState(match, (start(match) - now.getTime()) / 60000);
  const group = match => phase(match) === 'ended' ? 4
    : (match.resourceStatus === 'WAITING' && match.sourceReady !== true)
      || (phase(match) === 'live' && match.resourceStatus !== 'ASSIGNED' && match.sourceReady !== true) ? 3
    : phase(match) === 'live' ? 0
    : start(match) <= now.getTime() + 60 * 60000 ? 1 : 2;
  const difference = group(a) - group(b);
  if (difference) return difference;
  const timeDifference = group(a) === 0 ? start(b) - start(a) : start(a) - start(b);
  if (timeDifference) return timeDifference;
  if (group(a) === 0) {
    const rank = match => Number(match.broadcastRank) > 0 ? Number(match.broadcastRank) : Number.MAX_SAFE_INTEGER;
    return rank(a) - rank(b);
  }
  return 0;
}

function renderMatchCollections(rawTodayMatches, rawTomorrowMatches) {
  hideLoading();
  const allMatches = dedupeMatches([...rawTodayMatches, ...rawTomorrowMatches]
    .filter(match => match?.homeTeam?.name && match?.awayTeam?.name && matchStartDate(match)));
  const now = new Date();

  const trueTodayMatches = [];
  const trueTomorrowMatches = [];

  allMatches.forEach(match => {
      const day = getMoroccoDay(match.scheduledAt, new Date());
      if (day === 'today') trueTodayMatches.push(match);
      else if (day === 'tomorrow') trueTomorrowMatches.push(match);
  });

  function sortMatches(a, b) {
      return compareBroadcastPriority(a, b, now);
  }

  trueTodayMatches.sort(sortMatches);
  trueTomorrowMatches.sort(sortMatches);

  renderSection(DOM.featuredContainer, trueTodayMatches, 'لا توجد مواجهات جارية أو قادمة اليوم.');
  renderSection(DOM.broadcastContainer, trueTodayMatches, 'لا توجد مواجهات اليوم.');
  renderSection(DOM.todayContainer, trueTodayMatches, 'لا توجد مواجهات اليوم.');
  renderSection(DOM.tomorrowContainer, trueTomorrowMatches, 'لا توجد مواجهات غداً.');
  refreshMatchDialog();
}

async function loadAndRenderMatches(options = {}) {
  const [rawTodayMatches, rawTomorrowMatches] = await Promise.all([
    getTodayMatches(options),
    getTomorrowMatches(options)
  ]);

  renderMatchCollections(rawTodayMatches, rawTomorrowMatches);
}

function renderCachedMatchesImmediately() {
  const snapshot = getCachedMatchSnapshot();
  if (!snapshot.today.length && !snapshot.tomorrow.length) return false;
  renderMatchCollections(snapshot.today, snapshot.tomorrow);
  return true;
}

window.refreshLiveMatches = () => loadAndRenderMatches({ force: true }).catch(error => {
  console.error('[MATCHES] manual refresh failed:', error);
});

function startLiveRefresh() {
    let displayedDay = getMoroccoDateKey(), rolloverTimer;
    const checkDayChange = () => {
        const nextDay = getMoroccoDateKey();
        if (nextDay === displayedDay) return false;
        displayedDay = nextDay;
        const snapshot = getCachedMatchSnapshot();
        renderMatchCollections(snapshot.today, snapshot.tomorrow);
        return true;
    };
    const scheduleRollover = () => {
        clearTimeout(rolloverTimer);
        rolloverTimer = setTimeout(() => {
            checkDayChange();
            loadAndRenderMatches({ force: true }).catch(error => console.warn('[MATCHES] day rollover failed:', error));
            scheduleRollover();
        }, getNextMoroccoDayDelay());
    };
    scheduleRollover();
    window.addEventListener('pagehide', () => clearTimeout(rolloverTimer));
    window.addEventListener('pageshow', event => { if (event.persisted) { checkDayChange(); scheduleRollover(); } });
    const updates = new EventSource(`${STREAM_API_ORIGIN}/api/broadcast-events`);
    let revision;
    updates.addEventListener('control', event => {
        try {
            const next = JSON.parse(event.data).revision;
            if (revision !== undefined && next !== revision) window.refreshLiveMatches();
            revision = next;
        } catch {}
    });
    window.addEventListener('pagehide', () => updates.close(), { once: true });
    setInterval(() => {
        if (document.hidden) return;
        checkDayChange();
        loadAndRenderMatches({ force: true }).catch(error => {
            console.warn('[MATCHES] live refresh failed:', error);
        });
    }, 30000);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkDayChange();
            loadAndRenderMatches({ force: true }).catch(error => {
                console.warn('[MATCHES] resume refresh failed:', error);
            });
        }
    });
}

function setupTabs() {
    const handleTabClick = (activeTab, inactiveTab, activeContainer, inactiveContainer) => {
        if (!activeTab || !inactiveTab || !activeContainer || !inactiveContainer) return;
        activeTab.classList.add('active');
        inactiveTab.classList.remove('active');
        activeContainer.classList.add('active');
        inactiveContainer.classList.remove('active');
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
  setupSecurePlayerLinks();
  setupApiFootballDetails();
    renderCachedMatchesImmediately();
    loadAndRenderMatches().catch(error => {
        console.error("An error occurred while loading matches:", error);
        hideLoading();
    });
    startLiveRefresh();
});
