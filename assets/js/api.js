// --- 1. Cache Configuration ---
import { getChannelByTeam } from './chaine.js'; 

const CACHE_EXPIRY_MS = 2 * 60 * 1000; // دقيقتان كاش لضمان التحديث اللحظي للأهداف والمباريات الجارية
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
function convertSourceToMoroccoTime(timeString) {
  try {
    if (!timeString || !timeString.includes(':')) {
      return { formatted: timeString, rawMinutes: 9999, originalHour: 12 };
    }

    const cleanedString = timeString.replace(/\s+/g, ' ').trim();
    const [timePart, ampm] = cleanedString.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (ampm) {
      if (ampm.toUpperCase().includes('PM') && hours !== 12) hours += 12;
      if (ampm.toUpperCase().includes('AM') && hours === 12) hours = 0;
    }

    const originalHour = hours;

    // طرح ساعتين ثابتتين للتحويل الفعلي إلى توقيت المغرب الحالي (UTC+1)
    hours -= 2; 

    if (hours < 0) {
      hours += 24;
    }
    
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    
    return {
      formatted: `${formattedHours}:${formattedMinutes}`,
      rawMinutes: hours * 60 + minutes,
      originalHour: originalHour
    };
  } catch (error) {
    return { formatted: timeString, rawMinutes: 9999, originalHour: 12 };
  }
}

// --- 3. API Functions ---
const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';
const BASE_SITE_URL = 'https://koorasport.net';

export async function getTodayMatches() {
  const cachedMatches = getCache(CACHE_KEY_TODAY);
  if (cachedMatches) {
    return cachedMatches;
  }
  
  console.log("🌐 Executing Full-Spectrum Match Sync...");
  
  try {
    // جلب القوائم الثلاث معاً بالتوازي لضمان الإحاطة بالمباريات الجارية أياً كان سياق وقت السيرفر
    const [todayHtml, yesterdayHtml, tomorrowHtml] = await Promise.all([
      fetchHtml(`${BASE_SITE_URL}/`),
      fetchHtml(`${BASE_SITE_URL}/matches-yesterday/`),
      fetchHtml(`${BASE_SITE_URL}/matches-tomorrow/`)
    ]);

    const todayList = parseMatches(todayHtml);
    const yesterdayList = parseMatches(yesterdayHtml);
    const tomorrowList = parseMatches(tomorrowHtml);

    // دمج شامل لجميع القوائم
    const allMatches = [...yesterdayList, ...todayList, ...tomorrowList];

    // فلترة دقيقة وصارمة لمنع أي تكرار بناءً على أسماء الفرق المتواجهة
    const uniqueMatches = [];
    const seen = new Set();

    allMatches.forEach(match => {
      const matchId = `${match.homeTeam.name}_vs_${match.awayTeam.name}`.toLowerCase().trim();
      if (!seen.has(matchId)) {
        seen.add(matchId);
        uniqueMatches.push(match);
      }
    });

    // ترتيب تصاعدي من الصباح الباكر وحتى أواخر الليل
    uniqueMatches.sort((a, b) => a.rawMinutes - b.rawMinutes);

    if (uniqueMatches.length > 0) {
      setCache(CACHE_KEY_TODAY, uniqueMatches);
    }
    return uniqueMatches;

  } catch (error) {
    console.error("Error during match synchronization:", error);
    return [];
  }
}

export async function getTomorrowMatches() {
  const cachedMatches = getCache(CACHE_KEY_TOMORROW);
  if (cachedMatches) {
    return cachedMatches;
  }
  
  console.log("🌐 Fetching pure tomorrow's list...");
  const html = await fetchHtml(`${BASE_SITE_URL}/matches-tomorrow/`);
  let newMatches = parseMatches(html);
  
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
        originalHour: timeData.originalHour, 
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
  let src = imgElement.dataset.src || imgElement.getAttribute('src') || '';
  if (src.startsWith('http') || src.startsWith('//')) return src;
  
  src = src.startsWith('/') ? src.substring(1) : src;
  return `${BASE_SITE_URL}/${src}`;
}
