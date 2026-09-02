// --- 1. Cache Configuration ---

import { getChannelByTeam } from './chaine.js'; 



const CACHE_EXPIRY_MS = 2 * 60 * 1000; 

const CACHE_KEY_TODAY = 'matches_cache_today';

const CACHE_KEY_TOMORROW = 'matches_cache_tomorrow';



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



export const MOROCCO_TIME_ZONE = 'Africa/Casablanca';

function moroccoParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MOROCCO_TIME_ZONE,
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

// --- 3. API Functions ---

const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

const MATCH_SOURCES = [
  { name: 'yallashoot2day', baseUrl: 'https://yallashoot2day.online/' },
  { name: 'm8nstar', baseUrl: 'https://m8nstar.com/' },
  { name: 'livehd77', baseUrl: 'https://livehd77.me/' },
  { name: 'shooot', baseUrl: 'https://shooot.mov/' },
  { name: 'yacinee-tv', baseUrl: 'https://yacinee-tv.net/' },
  { name: 'siir-tv', baseUrl: 'https://siir-tv.co/' },
  { name: 'sirrtv', baseUrl: 'https://www.sirrtv.online/' },
  { name: 'syr-live', baseUrl: 'https://m.syr.live/' },
  { name: 'sportcityplus', baseUrl: 'https://sportcityplus.com/' },
  { name: 'socceritv', baseUrl: 'https://socceritv.com/' }
];



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

      const matchId = `${match.homeTeam.name}_vs_${match.awayTeam.name}`.toLowerCase().trim();

      if (!seen.has(matchId)) {

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

        const isLive = match.isLive || (match.score && match.score !== 'VS') || (diff <= 0 && diff > -130);

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

  

  const { matches: newMatches } = await loadFromSources('tomorrow');


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

    console.error(`Source request failed for ${targetUrl}: ${error.message}`);
    return '';

  }

}



async function loadFromSources(day) {
  const path = day === 'tomorrow' ? 'matches-tomorrow/' : '';
  const results = await Promise.all(MATCH_SOURCES.map(async (source) => {
    const targetUrl = new URL(path, source.baseUrl).href;
    const html = await fetchHtml(targetUrl);
    return { source, matches: parseMatches(html, source.baseUrl) };
  }));
  const merged = [];
  const seen = new Set();
  const failures = [];

  for (const { source, matches } of results) {
    if (!matches.length) {
      failures.push(source.name);
      continue;
    }
    for (const match of matches) {
      const key = `${match.homeTeam.name}|${match.awayTeam.name}`.toLocaleLowerCase('ar').trim();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({ ...match, sourceName: source.name });
      }
    }
  }

  console.info(`[matches] ${day} sources: ${MATCH_SOURCES.length}, usable: ${MATCH_SOURCES.length - failures.length}, matches: ${merged.length}`);
  return { matches: merged, source: merged[0]?.sourceName || null, failures };
}

// --- 4. Core Parsing Logic ---
const MATCH_SELECTORS = [
  '.AY_Match',
  '.match-container',
  '.match-card',
  '.match-item',
  'article[class*="match"]',
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

function liveStatusFrom(matchEl) {
  const className = typeof matchEl.className === 'string' ? matchEl.className : '';
  const statusText = textFrom(matchEl, ['.MT_Stat', '.match-status', '.status', '.date']);
  return /\blive\b|started|جارية|جاري|مباشر|الآن|الان/i.test(`${className} ${statusText}`);
}

function findMatchElements(doc) {
  for (const selector of MATCH_SELECTORS) {
    const elements = doc.querySelectorAll(selector);
    if (elements.length) return elements;
  }
  return [];
}

export function parseMatches(html, sourceBaseUrl = MATCH_SOURCES[0].baseUrl) {
  if (!html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  
  const matchElements = findMatchElements(doc);
  
  matchElements.forEach(matchEl => {
    try {
      // استخراج الفِرق
      const homeTeamEl = firstElement(matchEl, [
        '.right-team', '.team-home', '.team1', '.MT_Team.TM1', ...HOME_TEAM_SELECTORS
      ]);
      const awayTeamEl = firstElement(matchEl, [
        '.left-team', '.team-away', '.team2', '.MT_Team.TM2', ...AWAY_TEAM_SELECTORS
      ]);

      const homeTeamName = homeTeamEl ? homeTeamEl.textContent.trim() : '';
      const awayTeamName = awayTeamEl ? awayTeamEl.textContent.trim() : '';
      
      if (!homeTeamName || !awayTeamName) return;
      
      // استخراج رابط البث
      const matchLink = linkFrom(matchEl, sourceBaseUrl);
      if (!matchLink) return;
      
      // استخراج التوقيت أو النتيجة من منطقة المنتصف
      let score = 'VS';
      let originalTime = '--:--';
      
      const centerEl = matchEl.querySelector('.match-center');
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

      const timeData = convertSourceToMoroccoTime(originalTime);
      
      // استخراج معلومات القناة والمعلق والبطولة
      let channelFromSite = '';
      let commentator = '';
      let league = '';
      
      const infoEl = matchEl.querySelector('.match-info');
      if (infoEl) {
        // الموقع الجديد قد يضع البيانات داخل قوائم <ul> و <li> أو <div> مباشرة
        const infoItems = infoEl.querySelectorAll('li');
        if (infoItems.length >= 3) {
            channelFromSite = infoItems[0].textContent.trim();
            commentator = infoItems[1].textContent.trim();
            league = infoItems[infoItems.length - 1].textContent.trim();
        } else {
            // في حال عدم وجود قائمة، نسحب النص بالكامل كإسم للبطولة
            league = infoEl.textContent.replace(/\s+/g, ' ').trim();
        }
      }

      // جلب القناة من الملف المحلي في حال لم يوفرها الموقع المصدر
      let finalChannel = channelFromSite;
      if (!finalChannel || finalChannel.includes('غير معروف') || finalChannel === '') {
         finalChannel = getChannelByTeam(homeTeamName, awayTeamName);
      }

      matches.push({
        homeTeam: { name: homeTeamName, logo: extractImageUrl(homeTeamEl?.querySelector('img'), sourceBaseUrl) },
        awayTeam: { name: awayTeamName, logo: extractImageUrl(awayTeamEl?.querySelector('img'), sourceBaseUrl) },
        time: timeData.formatted,
        rawMinutes: timeData.rawMinutes,
        score: scoreFrom(matchEl),
        isLive: liveStatusFrom(matchEl),
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
