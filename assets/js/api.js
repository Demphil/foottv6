// --- 1. Cache Configuration ---
const CACHE_EXPIRY_MS = 5 * 60 * 60 * 1000; // 5 hours
const CACHE_KEY_TODAY = 'matches_cache_today';
const CACHE_KEY_TOMORROW = 'matches_cache_tomorrow';

function setCache(key, data) {
  const cacheItem = {
    timestamp: Date.now(),
    data: data,
  };
  localStorage.setItem(key, JSON.stringify(cacheItem));
  console.log(`💾 Data for '${key}' saved to cache.`);
}

function getCache(key) {
  const cachedItem = localStorage.getItem(key);
  if (!cachedItem) return null;

  const { timestamp, data } = JSON.parse(cachedItem);
  const age = Date.now() - timestamp;

  if (age > CACHE_EXPIRY_MS) {
    localStorage.removeItem(key);
    return null;
  }

  return data;
}

// --- 2. Timezone Conversion Function (Updated) ---
function convertSourceToMoroccoTime(timeString) {
  try {
    if (!timeString || !timeString.includes(':')) {
      return timeString;
    }
    let hours, minutes, ampm;
    if (timeString.includes('PM') || timeString.includes('AM')) {
      const [timePart, ampmPart] = timeString.split(' ');
      [hours, minutes] = timePart.split(':').map(Number);
      ampm = ampmPart.toUpperCase();
      if (ampm.includes('PM') && hours !== 12) hours += 12;
      if (ampm.includes('AM') && hours === 12) hours = 0;
    } else {
      [hours, minutes] = timeString.split(':').map(Number);
    }
    if (isNaN(hours) || isNaN(minutes)) return timeString;
    hours -= 1;
    if (hours < 0) hours += 24;
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes}`;
  } catch (error) {
    return timeString;
  }
}

// --- 3. دالة التحقق من المباراة الجارية (نسخة محسنة) ---
function isMatchLive(moroccoTimeString) {
    try {
        if (!moroccoTimeString || !moroccoTimeString.includes(':')) return false;
        const [hours, minutes] = moroccoTimeString.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return false;
        
        const matchStartTimeInMinutes = hours * 60 + minutes;
        const windowStartTime = matchStartTimeInMinutes - 10;
        const windowEndTime = matchStartTimeInMinutes + 135; // ساعتان و 15 دقيقة

        const now = new Date();
        const localTimezoneOffset = now.getTimezoneOffset();
        const moroccoTimezoneOffset = -60; // UTC+1
        
        const nowUtc = now.getTime() + (localTimezoneOffset * 60000);
        const moroccoNow = new Date(nowUtc + (moroccoTimezoneOffset * 60000));
        const currentTimeInMinutes = moroccoNow.getHours() * 60 + moroccoNow.getMinutes();

        return (currentTimeInMinutes >= windowStartTime && currentTimeInMinutes <= windowEndTime);
    } catch (e) {
        console.error("Error in isMatchLive:", e);
        return false;
    }
}


// --- 4. API Functions ---
const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

export async function getTodayMatches() {
  const cachedMatches = getCache(CACHE_KEY_TODAY);
  if (cachedMatches) {
    console.log("⚡ Loading today's matches from cache.");
    return cachedMatches.map(match => ({
        ...match,
        is_live: isMatchLive(match.time)
    }));
  }
  console.log("🌐 Fetching today's matches from network.");
  const targetUrl = 'https://www.kora-live.im/';
  const newMatches = await fetchMatches(targetUrl, false);
  if (newMatches.length > 0) setCache(CACHE_KEY_TODAY, newMatches);
  return newMatches;
}

export async function getTomorrowMatches() {
  const cachedMatches = getCache(CACHE_KEY_TOMORROW);
  if (cachedMatches) {
    console.log("⚡ Loading tomorrow's matches from cache.");
    return cachedMatches;
  }
  console.log("🌐 Fetching tomorrow's matches from network.");
  const targetUrl = 'https://www.kora-live.im/matches-tomorrow/';
  const newMatches = await fetchMatches(targetUrl, true);
  if (newMatches.length > 0) setCache(CACHE_KEY_TOMORROW, newMatches);
  return newMatches;
}

// --- 5. Core Fetching and Parsing Logic ---
async function fetchMatches(targetUrl, isTomorrow = false) {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const html = await response.text();
    return parseMatches(html, isTomorrow);
  } catch (error) {
    console.error("Failed to fetch via worker:", error);
    return [];
  }
}

/**
 * دالة تحليل HTML (محدثة لتكون أكثر مرونة)
 */
function parseMatches(html, isTomorrow = false) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  
  // --- التعديل هنا: البحث عن عدة محددات شائعة ---
  const matchElements = doc.querySelectorAll('.AY_Match, .match-item, .match-card');
  console.log(`Found ${matchElements.length} potential match elements.`);

  matchElements.forEach(matchEl => {
    try {
      // --- محاولة المحددات الأصلية أولاً ---
      let homeTeamName = matchEl.querySelector('.MT_Team.TM1 .TM_Name')?.textContent?.trim();
      let awayTeamName = matchEl.querySelector('.MT_Team.TM2 .TM_Name')?.textContent?.trim();
      let originalTime = matchEl.querySelector('.MT_Time')?.textContent?.trim();
      let scoreSpans = matchEl.querySelectorAll('.MT_Result .RS-goals');
      let infoListItems = matchEl.querySelectorAll('.MT_Info ul li');

      // --- محاولة المحددات الاحتياطية إذا فشلت الأصلية ---
      if (!homeTeamName) homeTeamName = matchEl.querySelector('.team-home .team-name')?.textContent?.trim();
      if (!awayTeamName) awayTeamName = matchEl.querySelector('.team-away .team-name')?.textContent?.trim();
      if (!originalTime) originalTime = matchEl.querySelector('.match-time, .time')?.textContent?.trim();
      if (scoreSpans.length === 0) scoreSpans = matchEl.querySelectorAll('.score-container .score');
      if (infoListItems.length === 0) infoListItems = matchEl.querySelectorAll('.match-details li');

      if (!homeTeamName || !awayTeamName) return;

      const matchLink = matchEl.querySelector('a')?.href;
      if (!matchLink) return;

      let score = 'VS';
      if (scoreSpans.length === 2) {
        const score1 = parseInt(scoreSpans[0].textContent.trim(), 10);
        const score2 = parseInt(scoreSpans[1].textContent.trim(), 10);
        if (!isNaN(score1) && !isNaN(score2)) score = `${score1} - ${score2}`;
      }
      
      const moroccoTime = convertSourceToMoroccoTime(originalTime || '--:--');
      const is_live = !isTomorrow && isMatchLive(moroccoTime);

      const channel = infoListItems[0]?.textContent?.trim() || '';
      const commentator = infoListItems[1]?.textContent?.trim() || '';
      const league = infoListItems[infoListItems.length - 1]?.textContent?.trim() || 'League';
      
      matches.push({
        homeTeam: { name: homeTeamName, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img, .team-home img')) },
        awayTeam: { name: awayTeamName, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img, .team-away img')) },
        time: moroccoTime,
        score: score,
        league: league,
        channel: channel.includes('غير معروف') ? '' : channel,
        commentator: commentator.includes('غير معروف') ? '' : commentator,
        matchLink: matchLink,
        is_live: is_live
      });
    } catch (e) {
      console.error('Failed to parse a single match element:', e);
    }
  });
  console.log(`Successfully parsed ${matches.length} matches.`);
  return matches;
}

function extractImageUrl(imgElement) {
  if (!imgElement) return '';
  const src = imgElement.dataset.src || imgElement.getAttribute('src') || '';
  if (src.startsWith('http') || src.startsWith('//')) return src;
  return `https://www.kora-live.im/${src.startsWith('/') ? '' : '/'}${src}`;
}

