// api.js
import { getChannelInfo } from './chaine.js'; 

const CACHE_EXPIRY_MS = 5 * 60 * 60 * 1000; 
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

// --- Timezone Function (توقيت المغرب: طرح ساعتين) ---
function convertSourceToMoroccoTime(timeString) {
  try {
    if (!timeString || !timeString.includes(':')) return timeString;
    const [timePart, ampm] = timeString.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (ampm && ampm.toUpperCase().includes('PM') && hours !== 12) hours += 12;
    if (ampm && ampm.toUpperCase().includes('AM') && hours === 12) hours = 0;

    hours -= 2; // تعديل التوقيت
    if (hours < 0) hours += 24;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch (error) {
    return timeString;
  }
}

// --- API Functions ---
const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

export async function getTodayMatches() {
  const cachedMatches = getCache(CACHE_KEY_TODAY);
  if (cachedMatches) return cachedMatches;
  const newMatches = await fetchMatches('https://www.live-match-tv.net/');
  if (newMatches.length > 0) setCache(CACHE_KEY_TODAY, newMatches);
  return newMatches;
}

export async function getTomorrowMatches() {
  const cachedMatches = getCache(CACHE_KEY_TOMORROW);
  if (cachedMatches) return cachedMatches;
  const newMatches = await fetchMatches('https://www.live-match-tv.net/matches-tomorrow/');
  if (newMatches.length > 0) setCache(CACHE_KEY_TOMORROW, newMatches);
  return newMatches;
}

// --- Fetch Logic ---
async function fetchMatches(targetUrl) {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const html = await response.text();
    return parseMatches(html);
  } catch (error) {
    console.error("Failed to fetch:", error);
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
      
      let score = 'VS';
      const scoreSpans = matchEl.querySelectorAll('.MT_Result .RS-goals');
      if (scoreSpans.length === 2) {
        const s1 = parseInt(scoreSpans[0].textContent.trim(), 10);
        const s2 = parseInt(scoreSpans[1].textContent.trim(), 10);
        if (!isNaN(s1) && !isNaN(s2)) score = `${s1} - ${s2}`;
      }

      const time = convertSourceToMoroccoTime(matchEl.querySelector('.MT_Time')?.textContent?.trim() || '--:--');
      const infoList = matchEl.querySelectorAll('.MT_Info ul li');
      const league = infoList[infoList.length - 1]?.textContent?.trim() || 'League';
      const commentator = infoList[1]?.textContent?.trim() || '';

      // --- جلب الرابط من chaine.js ---
      const myChannelInfo = getChannelInfo(homeTeamName, awayTeamName);
      
      // طباعة في الكونسول لنعرف هل وجد الرابط أم لا
      console.log(`Match: ${homeTeamName} vs ${awayTeamName} | Link Found: ${myChannelInfo.link}`);

      // تحديد الرابط النهائي
      let finalLink = myChannelInfo.link;
      if (!finalLink || finalLink === '#' || finalLink === '') {
           // محاولة استخدام رابط الموقع الأصلي كاحتياط
           finalLink = matchEl.querySelector('a')?.href || '';
      }

      matches.push({
        homeTeam: { name: homeTeamName, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img')) },
        awayTeam: { name: awayTeamName, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img')) },
        time: time, 
        score: score,
        league: league,
        
        // 👇 الحل هنا: نضع مسافة فارغة بدلاً من نص فارغ تماماً
        // هذا يخدع الموقع ليعتقد أن هناك قناة فيقوم بتفعيل الزر
        channel: ' ', 
        
        commentator: commentator.includes('غير معروف') ? '' : commentator,
        matchLink: finalLink 
      });
    } catch (e) {
      console.error('Error parsing match:', e);
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
