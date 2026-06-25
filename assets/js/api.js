// --- 1. Cache Configuration ---
import { getChannelByTeam } from './chaine.js'; 

const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 دقائق كاش لتحديث مباشر وسريع
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
 * Converts Saudi Time (UTC+3) to Morocco Summer Time (UTC+1).
 * Returns formatted string and raw minutes for accurate sorting.
 */
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

    // طرح ساعتين (توقيت مكة UTC+3 مقابل توقيت المغرب الحالي UTC+1)
    hours -= 1; 

    if (hours < 0) {
      hours += 24;
    }
    
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
const BASE_SITE_URL = 'https://koora-euro.com';

export async function getTodayMatches() {
  const cachedMatches = getCache(CACHE_KEY_TODAY);
  if (cachedMatches) {
    console.log("⚡ Loading today's matches from cache.");
    return cachedMatches;
  }
  
  console.log("🌐 Fetching live match lists...");
  
  // 1. جلب الصفحة الرئيسية دائماً
  const todayHtml = await fetchHtml(`${BASE_SITE_URL}/`);
  let finalMatches = parseMatches(todayHtml);

  // 2. فحص ذكي: إذا دخلنا في الليل بتوقيت المغرب (بين 20:00 و 23:59)
  // نقوم فوراً بجلب صفحة الغد الخاصة بالسيرفر لأن مباراة الـ 23:00 هربت إلى هناك برمجياً
  const now = new Date();
  const moroccoHour = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Casablanca',
    hour: 'numeric',
    hour12: false
  }).format(now), 10);

  if (moroccoHour >= 20 || moroccoHour < 3) {
    console.log("🌙 Late night mode: Syncing midnight matches...");
    const tomorrowHtml = await fetchHtml(`${BASE_SITE_URL}/matches-tomorrow`);
    const tomorrowList = parseMatches(tomorrowHtml);
    
    // نأخذ فقط المباريات التي توقيتها الأصلي في السيرفر فجراً (00:00 إلى 03:00) لأنها تساوي (22:00 و 23:00) في المغرب
    const midnightMatches = tomorrowList.filter(m => m.rawMinutes >= 1320 || m.rawMinutes <= 180);
    
    // دمج مباشر بدون شروط فلترة معقدة تحذفها
    finalMatches = [...finalMatches, ...midnightMatches];
  }

  // 3. تنظيف نهائي وبسيط جداً للتكرار بالاسم الكامل للمباراة
  const uniqueMatches = [];
  const seen = new Set();
  
  finalMatches.forEach(match => {
    const id = `${match.homeTeam.name}-${match.awayTeam.name}`.toLowerCase();
    if (!seen.has(id)) {
      seen.add(id);
      uniqueMatches.push(match);
    }
  });

  // ترتيب تصاعدي حسب الوقت
  uniqueMatches.sort((a, b) => a.rawMinutes - b.rawMinutes);

  if (uniqueMatches.length > 0) setCache(CACHE_KEY_TODAY, uniqueMatches);
  return uniqueMatches;
}

export async function getTomorrowMatches() {
  const cachedMatches = getCache(CACHE_KEY_TOMORROW);
  if (cachedMatches) {
    console.log("⚡ Loading tomorrow's matches from cache.");
    return cachedMatches;
  }
  
  const html = await fetchHtml(`${BASE_SITE_URL}/matches-tomorrow`);
  const newMatches = parseMatches(html);
  newMatches.sort((a, b) => a.rawMinutes - b.rawMinutes);

  if (newMatches.length > 0) setCache(CACHE_KEY_TOMORROW, newMatches);
  return newMatches;
}

async function fetchHtml(targetUrl) {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.text();
  } catch (error) {
    console.error(`Failed to fetch URL: ${targetUrl}`, error);
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
      const timeData = convertSourceToMoroccoTime(originalTime);
      
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
        time: timeData.formatted, 
        rawMinutes: timeData.rawMinutes, 
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

// تعديل جلب مسار الشعار ليتوافق مع دومين koora-euro بشكل صحيح وديناميكي
function extractImageUrl(imgElement) {
  if (!imgElement) return '';
  let src = imgElement.dataset.src || imgElement.getAttribute('src') || '';
  if (src.startsWith('http') || src.startsWith('//')) return src;
  
  // تنظيف السلاش المزدوج
  src = src.startsWith('/') ? src.substring(1) : src;
  return `${BASE_SITE_URL}/${src}`;
}
