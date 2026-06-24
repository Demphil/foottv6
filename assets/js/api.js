// --- 1. Cache Configuration ---
import { getChannelByTeam } from './chaine.js'; 

const CACHE_EXPIRY_MS = 15 * 60 * 1000; // تقليل الكاش لـ 15 دقيقة لتحديث النتائج والأهداف فوراً
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
 * Converts a time string from Source (Mecca Time - UTC+3) to Morocco Time (UTC+1).
 */
function convertSourceToMoroccoTime(timeString) {
  try {
    if (!timeString || !timeString.includes(':')) {
      return timeString;
    }

    const cleanedString = timeString.replace(/\s+/g, ' ').trim();
    const [timePart, ampm] = cleanedString.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (ampm) {
      if (ampm.toUpperCase().includes('PM') && hours !== 12) hours += 12;
      if (ampm.toUpperCase().includes('AM') && hours === 12) hours = 0;
    }

    // طرح ساعتين للتحويل من توقيت مكة إلى توقيت المغرب الحالي
    hours -= 2; 

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
  const todayUrl = 'https://koora-euro.com/matches-today/';
  const tomorrowUrl = 'https://koora-euro.com/matches-tomorrow/';
  
  // جلب البيانات من الصفتين (اليوم والغد) معاً لحل مشكلة اختفاء مباريات الليل
  const [todayHtml, tomorrowHtml] = await Promise.all([
    fetchHtml(todayUrl),
    fetchHtml(tomorrowUrl)
  ]);
  
  const todayMatches = parseMatches(todayHtml);
  const tomorrowMatches = parseMatches(tomorrowHtml);
  
  // تصفية مباريات الغد: نأخذ فقط المباريات التي تبدأ فجراً بتوقيت مكة (بين 12 ليلاً و 3 صباحاً)
  // لأنها تعني الساعة 10 و 11 ليلاً بتوقيت المغرب الحالي
  const lateNightMatches = tomorrowMatches.filter(match => {
    // نقوم بفحص الوقت الأصلي للمباراة قبل التحويل
    return match.isLateNightSource; 
  });

  // دمج القائمتين لمنع اختفاء أي مباراة
  const finalMatches = [...todayMatches, ...lateNightMatches];

  if (finalMatches.length > 0) setCache(CACHE_KEY_TODAY, finalMatches);
  return finalMatches;
}

export async function getTomorrowMatches() {
  const cachedMatches = getCache(CACHE_KEY_TOMORROW);
  if (cachedMatches) {
    console.log("⚡ Loading tomorrow's matches from cache.");
    return cachedMatches;
  }
  console.log("🌐 Fetching tomorrow's matches from network.");
  const targetUrl = 'https://www.liverscore.net/matches-tomorrow/';
  const html = await fetchHtml(targetUrl);
  const newMatches = parseMatches(html);
  
  // في قائمة الغد، نقوم بإخفاء المباريات التي دمجناها بالفعل في قائمة اليوم منعاً للتكرار
  const filteredTomorrow = newMatches.filter(match => !match.isLateNightSource);

  if (filteredTomorrow.length > 0) setCache(CACHE_KEY_TOMORROW, filteredTomorrow);
  return filteredTomorrow;
}

// دالة مساعدة لجلب الـ HTML فقط
async function fetchHtml(targetUrl) {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.text();
  } catch (error) {
    console.error("Failed to fetch via worker:", error);
    return '';
  }
}

// --- 4. Core Parsing Logic ---
function parseMatches(html) {
  if (!html) return [];
  
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
      
      // فحص هل وقت المباراة في مكة يقع بين 00:00 و 03:00 صباحاً (والذي يعني 22:00 و 23:00 في المغرب)
      let isLateNightSource = false;
      if (originalTime.includes(':')) {
        const cleanedString = originalTime.replace(/\s+/g, ' ').trim();
        const [timePart, ampm] = cleanedString.split(' ');
        let [h] = timePart.split(':').map(Number);
        if (ampm) {
          if (ampm.toUpperCase().includes('PM') && h !== 12) h += 12;
          if (ampm.toUpperCase().includes('AM') && h === 12) h = 0;
        }
        if (h >= 0 && h < 3) {
          isLateNightSource = true;
        }
      }

      const moroccoTime = convertSourceToMoroccoTime(originalTime);
      
      const infoListItems = matchEl.querySelectorAll('.MT_Info ul li');
      let channelFromSite = infoListItems[0]?.textContent?.trim() || '';
      const commentator = infoListItems[1]?.textContent?.trim() || '';
      const league = infoListItems[infoListItems.length - 1]?.textContent?.trim() || 'League';

      let finalChannel = channelFromSite;
      if (!finalChannel || finalChannel.includes('غير معروف') || finalChannel === '') {
         finalChannel = getChannelByTeam(homeTeamName, awayTeamName);
      }

      matches.push({
        homeTeam: { name: homeTeamName, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img')) },
        awayTeam: { name: awayTeamName, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img')) },
        time: moroccoTime, 
        score: score,
        league: league,
        channel: finalChannel, 
        commentator: commentator.includes('غير معروف') ? '' : commentator,
        matchLink: matchLink,
        isLateNightSource: isLateNightSource // علامة مخفية للتحكم بالدمج
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
  return `https://koora-euro.com/${src.startsWith('/') ? '' : '/'}${src}`;
}
