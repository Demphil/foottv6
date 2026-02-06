// --- 1. Cache Configuration ---
import { getChannelByTeam } from './chaine.js'; // استيراد الدالة

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
 * Converts a time string from Source to Morocco (UTC+1).
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

    // --- التعديل الجديد هنا ---
    // قمنا بتغيير الطرح ليصبح ساعتين بدلاً من ساعة واحدة
    hours -= 1; 

    // معالجة الحالة إذا أصبح الوقت سالباً (مثلاً الساعة 1 ليلاً ناقص ساعتين تصبح 23)
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

// --- 3. API Functions ---
const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

export async function getTodayMatches() {
  const cachedMatches = getCache(CACHE_KEY_TODAY);
  if (cachedMatches) {
    console.log("⚡ Loading today's matches from cache.");
    return cachedMatches;
  }
  console.log("🌐 Fetching today's matches from network.");
  const targetUrl = 'https://www.yalla-kora-live.online/';
  const newMatches = await fetchMatches(targetUrl);
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
  const targetUrl = 'https://www.yalla-kora-live.online/matches-tomorrow/';
  const newMatches = await fetchMatches(targetUrl);
  if (newMatches.length > 0) setCache(CACHE_KEY_TOMORROW, newMatches);
  return newMatches;
}

// --- 4. Core Fetching and Parsing Logic ---
async function fetchMatches(targetUrl) {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const html = await response.text();
    return parseMatches(html);
  } catch (error) {
    console.error("Failed to fetch via worker:", error);
    return [];
  }
}

function parseMatches(html) {
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
      
      const infoListItems = matchEl.querySelectorAll('.MT_Info ul li');
      
      let channelFromSite = infoListItems[0]?.textContent?.trim() || '';
      const commentator = infoListItems[1]?.textContent?.trim() || '';
      const league = infoListItems[infoListItems.length - 1]?.textContent?.trim() || 'League';

      // --- جلب القناة من القائمة النصية ---
      let finalChannel = channelFromSite;
      if (!finalChannel || finalChannel.includes('غير معروف') || finalChannel === '') {
         // نرسل أسماء الفرق للدالة لتبحث عنها داخل النص الذي لصقته
         finalChannel = getChannelByTeam(homeTeamName, awayTeamName);
      }
      // ---------------------------------

      matches.push({
        homeTeam: { name: homeTeamName, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img')) },
        awayTeam: { name: awayTeamName, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img')) },
        time: moroccoTime, 
        score: score,
        league: league,
        channel: finalChannel, 
        commentator: commentator.includes('غير معروف') ? '' : commentator,
        matchLink: matchLink
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
  return `https://www.yalla-kora-live.online/${src.startsWith('/') ? '' : '/'}${src}`;
}
