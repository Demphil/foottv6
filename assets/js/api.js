// --- 1. Cache Configuration ---
import { getChannelByTeam } from './chaine.js'; 

const CACHE_EXPIRY_MS = 5 * 60 * 60 * 1000; // 5 hours

// دالة ذكية للحصول على المفتاح الصحيح للكاش بناءً على التوقيت الرياضي (الفجر هو الحد الفاصل)
function getAdjustedCacheKeys() {
  const now = new Date();
  
  // تحويل الوقت الحالي لمعرفة الساعة في المغرب بدقة
  const moroccoHour = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Casablanca',
    hour: 'numeric',
    hour12: false
  }).format(now), 10);

  // إذا كنا بعد منتصف الليل وقبل الـ 3 صباحاً، نعتبر كاش "اليوم" هو كاش الأمس رياضياً
  if (moroccoHour >= 0 && moroccoHour < 3) {
    return {
      todayKey: 'matches_cache_yesterday_shifted', // مفتاح بديل لمنع تداخل التواريخ
      tomorrowKey: 'matches_cache_today' // مباريات الغد تصبح هي مباريات اليوم الحالي
    };
  }

  return {
    todayKey: 'matches_cache_today',
    tomorrowKey: 'matches_cache_tomorrow'
  };
}

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
 * Converts a time string from Source (Saudi Arabia/Mecca Time - UTC+3) to Morocco Time.
 * Handles midnight roll-overs accurately by looking at the logical sport day.
 */
function convertSourceToMoroccoTime(timeString, isTomorrow = false) {
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

    const targetDateInMecca = new Date();
    
    // تعديل سياق التاريخ بناءً على الساعة الحالية في المغرب
    const moroccoHour = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Casablanca',
      hour: 'numeric', hour12: false
    }).format(targetDateInMecca), 10);

    // إذا تصفح المستخدم بعد منتصف الليل (00:00 - 03:00) ومباراة اليوم الأمس لا زالت تعرض
    if (moroccoHour >= 0 && moroccoHour < 3 && !isTomorrow) {
      targetDateInMecca.setDate(targetDateInMecca.getDate() - 1); 
    } else if (isTomorrow) {
      targetDateInMecca.setDate(targetDateInMecca.getDate() + 1);
    }

    const meccaFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric', month: 'numeric', day: 'numeric'
    });
    
    const parts = meccaFormatter.formatToParts(targetDateInMecca);
    const year = parseInt(parts.find(p => p.type === 'year').value, 10);
    const month = parseInt(parts.find(p => p.type === 'month').value, 10) - 1;
    const day = parseInt(parts.find(p => p.type === 'day').value, 10);

    // توقيت مكة UTC+3 وبالتالي نطرح 3 ساعات للوصول لـ UTC الموحد
    const matchDateUTC = new Date(Date.UTC(year, month, day, hours - 3, minutes));

    const moroccoFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Casablanca',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return moroccoFormatter.format(matchDateUTC);
  } catch (error) {
    console.error("Error converting time:", error);
    return timeString; 
  }
}

// --- 3. API Functions ---
const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

export async function getTodayMatches() {
  const { todayKey } = getAdjustedCacheKeys();
  const cachedMatches = getCache(todayKey);
  
  if (cachedMatches) {
    console.log(`⚡ Loading today's matches from cache key: ${todayKey}`);
    return cachedMatches;
  }
  
  console.log("🌐 Fetching today's matches from network.");
  const targetUrl = 'https://www.liverscore.net/';
  const newMatches = await fetchMatches(targetUrl, false);
  if (newMatches.length > 0) setCache(todayKey, newMatches);
  return newMatches;
}

export async function getTomorrowMatches() {
  const { tomorrowKey } = getAdjustedCacheKeys();
  const cachedMatches = getCache(tomorrowKey);
  
  if (cachedMatches) {
    console.log(`⚡ Loading tomorrow's matches from cache key: ${tomorrowKey}`);
    return cachedMatches;
  }
  
  console.log("🌐 Fetching tomorrow's matches from network.");
  const targetUrl = 'https://www.liverscore.net/matches-tomorrow/';
  const newMatches = await fetchMatches(targetUrl, true);
  if (newMatches.length > 0) setCache(tomorrowKey, newMatches);
  return newMatches;
}

// --- 4. Core Fetching and Parsing Logic ---
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
      const moroccoTime = convertSourceToMoroccoTime(originalTime, isTomorrow);
      
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
  return `https://www.liverscore.net/${src.startsWith('/') ? '' : '/'}${src}`;
}
