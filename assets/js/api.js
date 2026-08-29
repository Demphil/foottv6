// --- 1. Cache Configuration ---
import { getChannelByTeam } from './chaine.js'; 

const CACHE_EXPIRY_MS = 2 * 60 * 1000; 
const CACHE_KEY_TODAY = 'matches_cache_v2_today';
const CACHE_KEY_TOMORROW = 'matches_cache_v2_tomorrow';

function setCache(key, data) {
  const cacheItem = { timestamp: Date.now(), data: data };
  localStorage.setItem(key, JSON.stringify(cacheItem));
}

function getCache(key) {
  const cachedItem = localStorage.getItem(key);
  if (!cachedItem) return null;
  const { timestamp, data } = JSON.parse(cachedItem);
  if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
    localStorage.removeItem(key);
    return null;
  }
  return data;
}

// --- 2. Timezone Conversion Function ---
function convertSourceToMoroccoTime(timeString) {
  try {
    if (!timeString || !timeString.includes(':')) {
      return { formatted: timeString, rawMinutes: 9999 };
    }

    const cleanedString = timeString.replace(/\s+/g, ' ').trim();
    const [timePart, ampm] = cleanedString.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (ampm) {
      if (ampm.toUpperCase().includes('PM') && hours !== 12) hours += 12;
      if (ampm.toUpperCase().includes('AM') && hours === 12) hours = 0;
    }

    hours -= 2; 
    if (hours < 0) hours += 24;
    
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    
    return {
      formatted: `${formattedHours}:${formattedMinutes}`,
      rawMinutes: hours * 60 + minutes
    };
  } catch (error) {
    return { formatted: timeString, rawMinutes: 9999 };
  }
}

// --- 3. API Functions ---
const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';
const BASE_SITE_URL = 'https://koralovear.xyz';

export async function getTodayMatches() {
  const cachedMatches = getCache(CACHE_KEY_TODAY);
  if (cachedMatches) return cachedMatches;
  
  try {
    // جلب الصفحة الرئيسية فقط لمنع دخول المباريات القديمة
    const todayHtml = await fetchHtml(`${BASE_SITE_URL}/`);
    let finalMatches = parseMatches(todayHtml);

    // تصفية التكرار إن وجد
    const uniqueMatches = [];
    const seen = new Set();

    finalMatches.forEach(match => {
      const matchId = `${match.homeTeam.name}_vs_${match.awayTeam.name}`.toLowerCase().trim();
      if (!seen.has(matchId)) {
        seen.add(matchId);
        uniqueMatches.push(match);
      }
    });

    // 🌟 منطق الفرز الذكي المطلوب 🌟
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    uniqueMatches.sort((a, b) => {
      const hasChannelA = a.channel && !['غير محدد', 'Unknown', 'غير معروف', ''].includes(a.channel.trim());
      const hasChannelB = b.channel && !['غير محدد', 'Unknown', 'غير معروف', ''].includes(b.channel.trim());

      const diffA = a.rawMinutes - currentMinutes;
      const diffB = b.rawMinutes - currentMinutes;

      const getRank = (match, diff, hasChannel) => {
        // 1. القناة غير متوفرة تُرمى في الأسفل تماماً
        if (!hasChannel) return 4;

        // 2. المباراة جارية الآن (نتيجة مسجلة أو التوقيت الحالي بين البداية والنهاية)
        const isLive = (match.score && match.score !== 'VS') || (diff <= 0 && diff > -130);
        if (isLive) return 1;

        // 3. ستبدأ قريباً (خلال 45 دقيقة قادمة)
        if (diff > 0 && diff <= 45) return 2;

        // 4. قادمة لاحقاً في اليوم
        return 3;
      };

      const rankA = getRank(a, diffA, hasChannelA);
      const rankB = getRank(b, diffB, hasChannelB);

      if (rankA !== rankB) return rankA - rankB;
      return a.rawMinutes - b.rawMinutes;
    });

    if (uniqueMatches.length > 0) setCache(CACHE_KEY_TODAY, uniqueMatches);
    return uniqueMatches;

  } catch (error) {
    return [];
  }
}

export async function getTomorrowMatches() {
  const cachedMatches = getCache(CACHE_KEY_TOMORROW);
  if (cachedMatches) return cachedMatches;
  
  const html = await fetchHtml(`${BASE_SITE_URL}/matches-tomorrow/`);
  let newMatches = parseMatches(html);
  newMatches.sort((a, b) => a.rawMinutes - b.rawMinutes);

  if (newMatches.length > 0) setCache(CACHE_KEY_TOMORROW, newMatches);
  return newMatches;
}

async function fetchHtml(targetUrl) {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    return await response.text();
  } catch (error) {
    return '';
  }
}

// --- 4. Core Parsing Logic ---
const MATCH_SELECTORS = [
  '.AY_Match',
  '.match-card',
  '.match-item',
  'article.match',
  '[data-match-id]',
  '[data-match]'
];

const HOME_TEAM_SELECTORS = [
  '.MT_Team.TM1 .TM_Name',
  '[data-team="home"] .TM_Name',
  '[data-team="home"] .team-name',
  '.home-team .TM_Name',
  '.home-team .team-name',
  '.team-home .team-name',
  '.team1 .TM_Name',
  '.team1 .team-name',
  '.TM1 .TM_Name',
  '.TM1 .team-name'
];

const AWAY_TEAM_SELECTORS = [
  '.MT_Team.TM2 .TM_Name',
  '[data-team="away"] .TM_Name',
  '[data-team="away"] .team-name',
  '.away-team .TM_Name',
  '.away-team .team-name',
  '.team-away .team-name',
  '.team2 .TM_Name',
  '.team2 .team-name',
  '.TM2 .TM_Name',
  '.TM2 .team-name'
];

function firstElement(root, selectors) {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (element) return element;
  }
  return null;
}

function textFrom(root, selectors, fallback = '') {
  return firstElement(root, selectors)?.textContent?.replace(/\s+/g, ' ').trim() || fallback;
}

function linkFrom(matchEl) {
  const anchor = [...matchEl.querySelectorAll('a[href]')].find((element) => {
    const href = element.getAttribute('href') || '';
    return href && href !== '#' && !href.toLowerCase().startsWith('javascript:');
  });
  if (!anchor) return '';
  return new URL(anchor.getAttribute('href'), BASE_SITE_URL).href;
}

function scoreFrom(matchEl) {
  const scoreElements = matchEl.querySelectorAll('.MT_Result .RS-goals, .score-home, .score-away');
  if (scoreElements.length >= 2) {
    const scores = [...scoreElements].slice(0, 2).map((element) => parseInt(element.textContent.trim(), 10));
    if (scores.every((value) => !Number.isNaN(value))) return `${scores[0]} - ${scores[1]}`;
  }

  const scoreText = textFrom(matchEl, ['.MT_Result', '.match-score', '.score', '.result']);
  const scorePair = scoreText.match(/\b(\d+)\s*[-:]\s*(\d+)\b/);
  return scorePair ? `${scorePair[1]} - ${scorePair[2]}` : 'VS';
}

export function parseMatches(html) {
  if (!html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  const seenElements = new Set();
  const matchElements = MATCH_SELECTORS.flatMap((selector) => [...doc.querySelectorAll(selector)])
    .filter((matchEl) => {
      if (seenElements.has(matchEl)) return false;
      seenElements.add(matchEl);
      return true;
    });

  matchElements.forEach((matchEl) => {
    try {
      const homeTeamElement = firstElement(matchEl, HOME_TEAM_SELECTORS);
      const awayTeamElement = firstElement(matchEl, AWAY_TEAM_SELECTORS);
      const homeTeamName = homeTeamElement?.textContent?.replace(/\s+/g, ' ').trim();
      const awayTeamName = awayTeamElement?.textContent?.replace(/\s+/g, ' ').trim();
      const matchLink = linkFrom(matchEl);
      if (!homeTeamName || !awayTeamName || !matchLink) return;

      const originalTime = textFrom(matchEl, [
        '.MT_Time',
        '[data-time]',
        '.match-time',
        '.time',
        '.date-time',
        '[class*="time"]'
      ], '--:--');
      const timeData = convertSourceToMoroccoTime(originalTime);
      const infoListItems = matchEl.querySelectorAll('.MT_Info ul li, .match-info li');
      const channelFromSite = textFrom(matchEl, [
        '.channel',
        '.broadcast',
        '[data-channel]',
        '[class*="channel"]'
      ]) || infoListItems[0]?.textContent?.trim() || '';
      const commentator = textFrom(matchEl, ['.commentator', '.commentator-name', '[class*="commentator"]'])
        || infoListItems[1]?.textContent?.trim() || '';
      const league = textFrom(matchEl, ['.league', '.competition', '.tournament', '[class*="league"]'])
        || infoListItems[infoListItems.length - 1]?.textContent?.trim() || 'League';

      const finalChannel = channelFromSite && !channelFromSite.includes('غير معروف')
        ? channelFromSite
        : getChannelByTeam(homeTeamName, awayTeamName);

      matches.push({
        homeTeam: { name: homeTeamName, logo: extractImageUrl(homeTeamElement?.querySelector('img')) },
        awayTeam: { name: awayTeamName, logo: extractImageUrl(awayTeamElement?.querySelector('img')) },
        time: timeData.formatted,
        rawMinutes: timeData.rawMinutes,
        score: scoreFrom(matchEl),
        league,
        channel: finalChannel,
        commentator: commentator.includes('غير معروف') ? '' : commentator,
        matchLink
      });
    } catch (error) {
      console.warn('Unable to parse one match card', error);
    }
  });
  return matches;
}

function extractImageUrl(imgElement) {
  if (!imgElement) return '';
  let src = imgElement.dataset.src || imgElement.getAttribute('src') || '';
  if (src.startsWith('http') || src.startsWith('//')) return src;
  src = src.startsWith('/') ? src.substring(1) : src;
  return `${BASE_SITE_URL}/${src}`;
}
