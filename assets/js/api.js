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

// --- 2. Timezone Conversion Function ---
/**
 * Converts a time string from Source (likely UTC+2) to Morocco (UTC+1).
 * @param {string} timeString - The time string, e.g., "09:30 PM".
 * @returns {string} The converted time string, e.g., "20:30".
 */
function convertSourceToMoroccoTime(timeString) {
  try {
    if (!timeString || !timeString.includes(':')) {
      return timeString;
    }

    const [timePart, ampm] = timeString.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (ampm && ampm.toUpperCase().includes('PM') && hours !== 12) {
      hours += 12;
    }
    if (ampm && ampm.toUpperCase().includes('AM') && hours === 12) {
      hours = 0;
    }

    // Subtract 1 hour for Morocco time
    hours -= 1;

    if (hours < 0) {
      hours += 24;
    }

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}`;
  } catch (error) {
    return timeString;
  }
}

// --- 3. دالة التحقق من المباراة الجارية ---
/**
 * يتحقق مما إذا كانت المباراة جارية الآن (بتوقيت المغرب)
 * @param {string} moroccoTimeString - The time string in Morocco time, e.g., "20:30"
 * @returns {boolean} True if the match is live
 */
function isMatchLive(moroccoTimeString) {
    try {
        if (!moroccoTimeString || !moroccoTimeString.includes(':')) {
            return false;
        }

        // تحويل وقت المباراة (مثل "20:30") إلى دقائق
        const [hours, minutes] = moroccoTimeString.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return false;
        
        const matchStartTimeInMinutes = hours * 60 + minutes;
        
        // حساب وقت انتهاء المباراة (نفترض ساعتين)
        const matchEndTimeInMinutes = matchStartTimeInMinutes + 120; // 120 دقيقة

        // الحصول على الوقت الحالي بتوقيت المغرب (UTC+1)
        const now = new Date();
        const localTimezoneOffset = now.getTimezoneOffset(); // فارق التوقيت المحلي بالدقائق
        const moroccoTimezoneOffset = -60; // UTC+1
        
        const nowUtc = now.getTime() + (localTimezoneOffset * 60000);
        const moroccoNow = new Date(nowUtc + (moroccoTimezoneOffset * 60000));

        const currentTimeInMinutes = moroccoNow.getHours() * 60 + moroccoNow.getMinutes();

        // التحقق مما إذا كان الوقت الحالي يقع بين بداية ونهاية المباراة
        return (
            currentTimeInMinutes >= matchStartTimeInMinutes &&
            currentTimeInMinutes <= matchEndTimeInMinutes
        );
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
    // إعادة التحقق من المباريات الجارية عند التحميل من الكاش
    return cachedMatches.map(match => ({
        ...match,
        is_live: isMatchLive(match.time)
    }));
  }
  console.log("🌐 Fetching today's matches from network.");
  const targetUrl = 'https://www.live-match-tv.net/';
  const newMatches = await fetchMatches(targetUrl, false); // false = ليس الغد
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
  const targetUrl = 'https://www.live-match-tv.net/matches-tomorrow/';
  const newMatches = await fetchMatches(targetUrl, true); // true = مباريات الغد
  if (newMatches.length > 0) setCache(CACHE_KEY_TOMORROW, newMatches);
  return newMatches;
}

// --- 5. Core Fetching and Parsing Logic ---
async function fetchMatches(targetUrl, isTomorrow = false) {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const html = await response.text();
    return parseMatches(html, isTomorrow); // تمرير العلامة
  } catch (error) {
    console.error("Failed to fetch via worker:", error);
    return [];
  }
}

function parseMatches(html, isTomorrow = false) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  const matchElements = doc.querySelectorAll('.AY_Match');
  
  matchElements.forEach(matchEl => {
    try {
      const homeTeamName = matchEl.querySelector('.MT_Team.TM1 .TM_Name')?.textContent?.trim();
      const awayTeamName = matchEl.querySelector('.MT_Team.TM2 .TM_Name')?.textContent?.trim();
      if (!homeTeamName || !awayTeamName) return;

      const matchLink = matchEl.querySelector('a')?.href;
      if (!matchLink) return;

      let score = 'VS';
      const scoreSpans = matchEl.querySelectorAll('.MT_Result .RS-goals');
      if (scoreSpans.length === 2) {
        const score1 = parseInt(scoreSpans[0].textContent.trim(), 10);
        const score2 = parseInt(scoreSpans[1].textContent.trim(), 10);
        if (!isNaN(score1) && !isNaN(score2)) score = `${score1} - ${score2}`;
      }
      
      const originalTime = matchEl.querySelector('.MT_Time')?.textContent?.trim() || '--:--';
      const moroccoTime = convertSourceToMoroccoTime(originalTime);
      
      // التحقق مما إذا كانت المباراة جارية (فقط لمباريات اليوم)
      const is_live = !isTomorrow && isMatchLive(moroccoTime);

      const infoListItems = matchEl.querySelectorAll('.MT_Info ul li');
      const channel = infoListItems[0]?.textContent?.trim() || '';
      const commentator = infoListItems[1]?.textContent?.trim() || '';
      const league = infoListItems[infoListItems.length - 1]?.textContent?.trim() || 'League';
      
      matches.push({
        homeTeam: { name: homeTeamName, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img')) },
        awayTeam: { name: awayTeamName, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img')) },
        time: moroccoTime, // استخدام توقيت المغرب
        score: score,
        league: league,
        channel: channel.includes('غير معروف') ? '' : channel,
        commentator: commentator.includes('غير معروف') ? '' : commentator,
        matchLink: matchLink,
        is_live: is_live // <-- إضافة الخاصية الجديدة
      });
    } catch (e) {
      console.error('Failed to parse a single match element:', e);
    }
  });
  return matches;
}

function extractImageUrl(imgElement) {
  if (!imgElement) return '';
  const src = imgElement.dataset.src || imgElement.getAttribute('src') || '';
  if (src.startsWith('http') || src.startsWith('//')) return src;
  return `https://www.live-match-tv.net/${src.startsWith('/') ? '' : '/'}${src}`;
}
