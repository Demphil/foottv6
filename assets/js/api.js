// --- 1. Cache Configuration ---

import { getChannelByTeam } from './chaine.js'; 



const CACHE_EXPIRY_MS = 2 * 60 * 1000; 

const CACHE_KEY_TODAY = 'matches_cache_today_v5';

const CACHE_KEY_TOMORROW = 'matches_cache_tomorrow_v5';



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



export const MOROCCO_TIME_ZONE = 'Africa/Casablanca';

function moroccoParts(date = new Date(), timeZone = MOROCCO_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date);

  return Object.fromEntries(parts
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value }) => [type, Number(value)]));
}

export function getMoroccoWallClockNow() {
  const now = moroccoParts();
  return new Date(Date.UTC(now.year, now.month - 1, now.day, now.hour, now.minute, now.second));
}

export function getMoroccoDateForTime(hours, minutes, dayOffset = 0) {
  const now = moroccoParts();
  return new Date(Date.UTC(now.year, now.month - 1, now.day + dayOffset, hours, minutes, 0));
}

function parseClock(timeString) {
  const cleanedString = String(timeString || '').replace(/\s+/g, ' ').trim();
  const match = cleanedString.match(/(\d{1,2})\s*:\s*(\d{2})\s*([AP]M|ص|م)?/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const ampm = match[3] || '';

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) return null;
  if (/PM|م/i.test(ampm) && hours !== 12) hours += 12;
  if (/AM|ص/i.test(ampm) && hours === 12) hours = 0;
  if (!ampm && hours >= 1 && hours <= 11) hours += 12;

  return { hours, minutes };
}

function formatDisplayTime(hours, minutes) {
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function timeZoneOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value }) => [type, Number(value)]));
  const asUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
  return (asUtc - date.getTime()) / 60000;
}

function sourceWallClockToUtc(year, month, day, hours, minutes, sourceTimeZone) {
  const guess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const offset = timeZoneOffsetMinutes(guess, sourceTimeZone);
  return new Date(guess.getTime() - offset * 60000);
}

function convertSourceToMoroccoTime(timeString, sourceTimeZone = MOROCCO_TIME_ZONE, sourceDayOffset = 0) {
  try {
    const parsed = parseClock(timeString);
    if (!parsed) return { formatted: '--:--', rawMinutes: 9999, moroccoDayShift: 0, isValidTime: false };

    const sourceNow = moroccoParts(new Date(), sourceTimeZone);
    const moroccoNow = moroccoParts();
    const utcDate = sourceWallClockToUtc(
      sourceNow.year,
      sourceNow.month,
      sourceNow.day + sourceDayOffset,
      parsed.hours,
      parsed.minutes,
      sourceTimeZone
    );
    const moroccoTime = moroccoParts(utcDate);
    const moroccoTodayStart = Date.UTC(moroccoNow.year, moroccoNow.month - 1, moroccoNow.day, 0, 0, 0);
    const moroccoDateStart = Date.UTC(moroccoTime.year, moroccoTime.month - 1, moroccoTime.day, 0, 0, 0);
    const moroccoDayOffset = Math.round((moroccoDateStart - moroccoTodayStart) / 86400000);
    const moroccoDayShift = moroccoDayOffset - sourceDayOffset;

    return {
      formatted: formatDisplayTime(moroccoTime.hour, moroccoTime.minute),
      rawMinutes: moroccoTime.hour * 60 + moroccoTime.minute,
      moroccoDayShift,
      isValidTime: true
    };
  } catch (error) {
    return { formatted: '--:--', rawMinutes: 9999, moroccoDayShift: 0, isValidTime: false };
  }
}

// --- 3. API Functions ---

const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

const MATCH_SOURCES = [
  { name: 'yallashoot2day', baseUrl: 'https://yallashoot2day.online/', timeZone: 'Asia/Riyadh', tomorrowPath: 'matches-tomorrow/' },
  { name: 'm8nstar', baseUrl: 'https://m8nstar.com/', timeZone: 'Asia/Riyadh', tomorrowPath: 'matches-tomorrow/' },
  { name: 'livehd77', baseUrl: 'https://livehd77.me/', timeZone: 'Asia/Riyadh', tomorrowPath: 'matches-tomorrow/' },
  { name: 'shooot', baseUrl: 'https://shooot.mov/', timeZone: 'Asia/Riyadh', tomorrowPath: 'matches-tomorrow/' },
  { name: 'yacinee-tv', baseUrl: 'https://yacinee-tv.net/', timeZone: 'Asia/Riyadh', tomorrowPath: null },
  { name: 'siir-tv', baseUrl: 'https://siir-tv.co/', timeZone: 'Asia/Riyadh', tomorrowPath: 'matches-tomorrow/' },
  { name: 'sirrtv', baseUrl: 'https://www.sirrtv.online/', timeZone: 'Asia/Riyadh', tomorrowPath: null },
  { name: 'syr-live', baseUrl: 'https://m.syr.live/', timeZone: 'Asia/Riyadh', tomorrowPath: 'matches-tomorrow/' },
  { name: 'sportcityplus', baseUrl: 'https://sportcityplus.com/', timeZone: 'Asia/Riyadh', tomorrowPath: 'matches-tomorrow/' },
  { name: 'socceritv', baseUrl: 'https://socceritv.com/', timeZone: 'Asia/Riyadh', tomorrowPath: 'matches-tomorrow/' }
];

function normalizeMatchName(value) {
  return String(value || '')
    .toLocaleLowerCase('ar')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

function matchKey(match) {
  const teams = [
    normalizeMatchName(match.homeTeam?.name),
    normalizeMatchName(match.awayTeam?.name)
  ].filter(Boolean).sort();
  return teams.join('|');
}

const MISSING_CHANNEL_VALUES = new Set(['', 'غيرمحدد', 'غيرمعروف', 'unknown', 'na', '-']);

const CHANNEL_NAME_ALIASES = new Map([
  ['bein 4k', 'beIN 4K HDR'],
  ['beIN 4K', 'beIN 4K HDR'],
  ['beIN Sports 3 HD', 'beIN SPORTS HD 3'],
  ['beIN SPORTS 3 HD', 'beIN SPORTS HD 3'],
  ['beIN Sports 2 HD', 'beIN SPORTS HD 2'],
  ['beIN SPORTS 2 HD', 'beIN SPORTS HD 2'],
  ['beIN Sports 1 HD', 'beIN SPORTS HD 1'],
  ['beIN SPORTS 1 HD', 'beIN SPORTS HD 1'],
  ['SSC Sport 1HD', 'SSC 1 HD'],
  ['SSC 1', 'SSC 1 HD'],
  ['SSC Extra 1 HD', 'SSC Sport 2HD'],
  ['ON Sport 1', 'On Time Sports 1'],
  ['ON TIME SPORTS 1', 'On Time Sports 1'],
  ['ON Sport 2', 'ON TIME SPORTS 2']
]);

function isMissingChannel(value) {
  return MISSING_CHANNEL_VALUES.has(normalizeMatchName(value));
}

function normalizeChannelName(value) {
  const cleaned = String(value || '')
    .replace(/[📺🎤🏆]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || isMissingChannel(cleaned)) return '';
  const direct = CHANNEL_NAME_ALIASES.get(cleaned);
  if (direct) return direct;
  const normalized = normalizeMatchName(cleaned);
  for (const [alias, channel] of CHANNEL_NAME_ALIASES.entries()) {
    if (normalizeMatchName(alias) === normalized) return channel;
  }
  return cleaned;
}

function firstMeaningfulText(elements) {
  for (const element of elements) {
    const value = normalizeChannelName(element?.textContent || '');
    if (value) return value;
  }
  return '';
}

function extractIconField(matchEl, icon) {
  const iconElement = [...matchEl.querySelectorAll('span, i, svg, div')]
    .find((element) => (element.textContent || '').trim() === icon);
  if (!iconElement) return '';

  const parentText = normalizeChannelName(iconElement.parentElement?.textContent || '');
  if (parentText) return parentText;

  const siblingText = firstMeaningfulText([
    iconElement.nextElementSibling,
    iconElement.parentElement?.nextElementSibling
  ]);
  return siblingText;
}

function extractChannelFromMatch(matchEl) {
  const explicit = firstMeaningfulText([
    ...matchEl.querySelectorAll('.match-channel, .channel, .match-tv, .tv-channel, [class*="channel"]')
  ]);
  if (explicit) return explicit;

  const matchInfoItems = matchEl.querySelectorAll('.match-info li');
  if (matchInfoItems.length) {
    const fromInfoList = normalizeChannelName(matchInfoItems[0].textContent || '');
    if (fromInfoList) return fromInfoList;
  }

  const m8nstarField = firstMeaningfulText([
    ...matchEl.querySelectorAll('.mc-div .flex-1:first-child .font-medium, .mc-div .flex-1:first-child span:last-child')
  ]);
  if (m8nstarField) return m8nstarField;

  return extractIconField(matchEl, '📺');
}

function inferChannelFromLeague(league) {
  const normalizedLeague = normalizeMatchName(league);
  if (!normalizedLeague) return '';
  if (/السعوديه|دوريروشن|كاسالملك|كاسالسوبرالسعودي/.test(normalizedLeague)) return 'SSC 1 HD';
  if (/مصر|الدوريالمصري|كاسمصر|رابطهالانديه/.test(normalizedLeague)) return 'On Time Sports 1';
  if (/تركيا|التركي/.test(normalizedLeague)) return 'beIN SPORTS HD 2';
  if (/انجلترا|الانجليزي|اسبانيا|الاسباني|فرنسا|الفرنسي|ايطاليا|الايطالي|المانيا|الالماني|ابطالاوروبا|الدوريالاوروبي|المؤتمر/.test(normalizedLeague)) return 'beIN SPORTS HD 1';
  if (/افريقيا|ابطالافريقيا|الكونفدراليه|تصفياتافريقيا/.test(normalizedLeague)) return 'beIN SPORTS HD';
  return '';
}

function preferMatch(current, next) {
  if (!current) return next;
  const currentValid = current.isValidTime !== false && current.time !== '--:--';
  const nextValid = next.isValidTime !== false && next.time !== '--:--';
  if (next.channel && !current.channel) return next;
  if (nextValid && !currentValid) return next;
  if (next.matchLink && !current.matchLink) return next;
  return current;
}



export async function getTodayMatches() {

  const cachedMatches = getCache(CACHE_KEY_TODAY);

  if (cachedMatches) return cachedMatches;

  

  try {

    // جلب الصفحة الرئيسية فقط لمنع دخول المباريات القديمة

    const { matches: finalMatches } = await loadFromSources('today');




    // تصفية التكرار إن وجد

    const uniqueMatches = [];

    const seen = new Set();



    finalMatches.forEach(match => {

      const matchId = matchKey(match);

      if (matchId && !seen.has(matchId)) {

        seen.add(matchId);

        uniqueMatches.push(match);

      }

    });



    // 🌟 منطق الفرز الذكي المطلوب 🌟

    const now = getMoroccoWallClockNow();

    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();



    uniqueMatches.sort((a, b) => {

      const hasChannelA = a.channel && !['غير محدد', 'Unknown', 'غير معروف', ''].includes(a.channel.trim());

      const hasChannelB = b.channel && !['غير محدد', 'Unknown', 'غير معروف', ''].includes(b.channel.trim());



      const diffA = a.rawMinutes - currentMinutes;

      const diffB = b.rawMinutes - currentMinutes;



      const getRank = (match, diff, hasChannel) => {

        // 1. القناة غير متوفرة تُرمى في الأسفل تماماً

        if (!hasChannel) return 4;



        // 2. المباراة جارية الآن (نتيجة مسجلة أو التوقيت الحالي بين البداية والنهاية)

        const isLive = match.isLive || (diff <= 0 && diff > -130);

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

    console.error(`Today matches fetch failed: ${error.message}`);
    return [];

  }

}



export async function getTomorrowMatches() {

  const cachedMatches = getCache(CACHE_KEY_TOMORROW);

  if (cachedMatches) return cachedMatches;

  try {
    const { matches: newMatches } = await loadFromSources('tomorrow');


    newMatches.sort((a, b) => a.rawMinutes - b.rawMinutes);



    if (newMatches.length > 0) setCache(CACHE_KEY_TOMORROW, newMatches);

    return newMatches;
  } catch (error) {
    console.error(`Tomorrow matches fetch failed: ${error.message}`);
    return [];
  }

}



async function fetchHtml(targetUrl) {

  try {

    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);

    if (!response.ok) throw new Error(`Status: ${response.status}`);

    return await response.text();

  } catch (error) {

    console.error(`Source request failed for ${targetUrl}: ${error.message}`);
    return '';

  }

}



async function loadFromSources(day) {
  const activeSources = day === 'tomorrow'
    ? MATCH_SOURCES.filter((source) => source.tomorrowPath !== null)
    : MATCH_SOURCES;
  const results = await Promise.all(activeSources.map(async (source) => {
    const path = day === 'tomorrow' ? (source.tomorrowPath || 'matches-tomorrow/') : '';
    const targetUrl = new URL(path, source.baseUrl).href;
    const html = await fetchHtml(targetUrl);
    return { source, matches: parseMatches(html, source, day === 'tomorrow' ? 1 : 0) };
  }));
  const merged = [];
  const seen = new Map();
  const failures = [];

  for (const { source, matches } of results) {
    if (!matches.length) {
      failures.push(source.name);
      continue;
    }
    for (const match of matches) {
      const key = matchKey(match);
      if (!key) continue;
      const incoming = { ...match, sourceName: source.name };
      if (!seen.has(key)) {
        seen.set(key, merged.length);
        merged.push(incoming);
      } else {
        const index = seen.get(key);
        merged[index] = preferMatch(merged[index], incoming);
      }
    }
  }

  console.info(`[matches] ${day} sources: ${activeSources.length}, usable: ${activeSources.length - failures.length}, matches: ${merged.length}`);
  return { matches: merged, source: merged[0]?.sourceName || null, failures };
}

// --- 4. Core Parsing Logic ---
const MATCH_SELECTORS = [
  '.mc.mc-classic',
  '.mc',
  '.AY_Match',
  '.match-container',
  '.match-card',
  '.match-item',
  'article[class*="match"]',
  'article.match',
  '[id^="m-"]',
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
  '.match-team.team1 .team-name',
  '.match-team.team1 .TM_Name',
  '.right-team .team-name',
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
  '.match-team.team2 .team-name',
  '.match-team.team2 .TM_Name',
  '.left-team .team-name',
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

function linkFrom(matchEl, sourceBaseUrl) {
  const anchor = [...matchEl.querySelectorAll('a[href]')].find((element) => {
    const href = element.getAttribute('href') || '';
    return href && href !== '#' && !href.toLowerCase().startsWith('javascript:');
  });
  if (!anchor) return '';
  return new URL(anchor.getAttribute('href'), sourceBaseUrl).href;
}

function scoreFrom(matchEl, isLive) {
  if (!isLive) return 'VS';
  const scoreElements = matchEl.querySelectorAll('.MT_Result .RS-goals, .score-home, .score-away');
  if (scoreElements.length >= 2) {
    const scores = [...scoreElements].slice(0, 2).map((element) => parseInt(element.textContent.trim(), 10));
    if (scores.every((value) => !Number.isNaN(value))) return `${scores[0]} - ${scores[1]}`;
  }

  const scoreText = textFrom(matchEl, ['.MT_Result', '.match-score', '.score', '.result']);
  const scorePair = scoreText.match(/\b(\d+)\s*[-:]\s*(\d+)\b/);
  return scorePair ? `${scorePair[1]} - ${scorePair[2]}` : 'VS';
}

function liveStatusFrom(matchEl) {
  const className = typeof matchEl.className === 'string' ? matchEl.className : '';
  const statusText = textFrom(matchEl, ['.MT_Stat', '.match-status', '.status', '.date']);
  const hasLiveClass = /\b(is-live|live-now|match-live|started|in-progress)\b/i.test(className);
  const hasLiveText = /جارية|جاري|مباشر|الآن|الان|بدأت|الشوط/i.test(statusText);
  return hasLiveClass || hasLiveText;
}

function findMatchElements(doc) {
  for (const selector of MATCH_SELECTORS) {
    const elements = doc.querySelectorAll(selector);
    if (elements.length) return elements;
  }
  return [];
}

export function parseMatches(html, sourceInput = MATCH_SOURCES[0], sourceDayOffset = 0) {
  if (!html) return [];
  const source = typeof sourceInput === 'string' ? { baseUrl: sourceInput, timeZone: MOROCCO_TIME_ZONE } : sourceInput;
  const sourceBaseUrl = source.baseUrl || MATCH_SOURCES[0].baseUrl;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  
  const matchElements = findMatchElements(doc);
  
  matchElements.forEach(matchEl => {
    try {
      // استخراج الفِرق
      const homeTeamEl = firstElement(matchEl, [
        '.right-team', '.team-home', '.team1', '.MT_Team.TM1', '.mg-2m:first-child', ...HOME_TEAM_SELECTORS
      ]);
      const awayTeamEl = firstElement(matchEl, [
        '.left-team', '.team-away', '.team2', '.MT_Team.TM2', '.mg-2m:last-child', ...AWAY_TEAM_SELECTORS
      ]);

      const homeTeamName = textFrom(homeTeamEl || matchEl, ['.team-name, .TM_Name, .mt-name'], homeTeamEl ? homeTeamEl.textContent.trim() : '');
      const awayTeamName = textFrom(awayTeamEl || matchEl, ['.team-name, .TM_Name, .mt-name'], awayTeamEl ? awayTeamEl.textContent.trim() : '');
      
      if (!homeTeamName || !awayTeamName) return;
      
      // استخراج رابط البث
      const matchLink = linkFrom(matchEl, sourceBaseUrl);
      if (!matchLink) return;
      
      // استخراج التوقيت أو النتيجة من منطقة المنتصف
      let score = 'VS';
      let originalTime = '--:--';
      
      const centerEl = matchEl.querySelector('.match-center, .mg-1m, .mc-time, .match-time');
      const centerText = centerEl ? centerEl.textContent.trim() : '';

      // البحث عن التوقيت (يحتوي على نقطتين رأسيتين)
      const timeMatch = centerText.match(/\d{1,2}:\d{2}/);
      if (timeMatch) {
          originalTime = timeMatch[0];
      }
      
      // البحث عن النتيجة (تحتوي على شرطة بين أرقام)
      const scoreMatch = centerText.match(/\d+\s*-\s*\d+/);
      if (scoreMatch) {
          score = scoreMatch[0];
      }

      const isLive = liveStatusFrom(matchEl);
      const timeData = convertSourceToMoroccoTime(originalTime, source.timeZone || MOROCCO_TIME_ZONE, sourceDayOffset);
      
      // استخراج معلومات القناة والمعلق والبطولة
      let channelFromSite = extractChannelFromMatch(matchEl);
      let commentator = '';
      let league = '';
      
      league = textFrom(matchEl, ['.match-league, .league, .league-info, .mc-league']);

      const infoEl = matchEl.querySelector('.match-info');
      if (infoEl) {
        // الموقع الجديد قد يضع البيانات داخل قوائم <ul> و <li> أو <div> مباشرة
        const infoItems = infoEl.querySelectorAll('li');
        if (infoItems.length >= 3) {
            channelFromSite = channelFromSite || infoItems[0].textContent.trim();
            commentator = infoItems[1].textContent.trim();
            league = infoItems[infoItems.length - 1].textContent.trim();
        } else {
            // في حال عدم وجود قائمة، نسحب النص بالكامل كإسم للبطولة
            league = league || infoEl.textContent.replace(/\s+/g, ' ').trim();
        }
      }
      if (!league) league = extractIconField(matchEl, '🏆');
      if (!commentator) commentator = extractIconField(matchEl, '🎤');

      // جلب القناة من الملف المحلي في حال لم يوفرها الموقع المصدر
      let finalChannel = normalizeChannelName(channelFromSite);
      if (!finalChannel) {
         finalChannel = normalizeChannelName(getChannelByTeam(homeTeamName, awayTeamName));
      }
      if (!finalChannel) {
         finalChannel = inferChannelFromLeague(league);
      }
      if (!finalChannel) {
         finalChannel = 'beIN SPORTS HD';
      }

      matches.push({
        homeTeam: { name: homeTeamName, logo: extractImageUrl(homeTeamEl?.querySelector('img'), sourceBaseUrl) },
        awayTeam: { name: awayTeamName, logo: extractImageUrl(awayTeamEl?.querySelector('img'), sourceBaseUrl) },
        time: timeData.formatted,
        rawMinutes: timeData.rawMinutes,
        moroccoDayShift: timeData.moroccoDayShift,
        isValidTime: timeData.isValidTime,
        score: scoreFrom(matchEl, isLive),
        isLive,
        league,
        channel: finalChannel,
        commentator: commentator.includes('غير معروف') ? '' : commentator,
        matchLink: matchLink
      });
    } catch (e) {
        console.error("خطأ في معالجة مباراة:", e);
    }
  });
  return matches;
}


function extractImageUrl(imgElement, sourceBaseUrl) {

  if (!imgElement) return '';

  let src = imgElement.dataset.src || imgElement.getAttribute('src') || '';

  if (src.startsWith('http') || src.startsWith('//')) return src;

  src = src.startsWith('/') ? src.substring(1) : src;

  return new URL(src, sourceBaseUrl).href;

}
