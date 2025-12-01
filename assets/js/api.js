// assets/js/api.js

// نستورد دالة Gemini من ملف chaine.js
import { getChannelFromGemini } from './chaine.js'; 

const CACHE_EXPIRY_MS = 5 * 60 * 60 * 1000; 
const CACHE_KEY_TODAY = 'matches_cache_today';
const CACHE_KEY_TOMORROW = 'matches_cache_tomorrow';
const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

// --- (دوال الكاش والوقت بقيت كما هي دون تغيير) ---
function setCache(key, data) { localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data })); }
function getCache(key) {
  const item = localStorage.getItem(key); if (!item) return null;
  const { timestamp, data } = JSON.parse(item);
  if (Date.now() - timestamp > CACHE_EXPIRY_MS) { localStorage.removeItem(key); return null; }
  return data;
}
function convertSourceToMoroccoTime(timeString) {
    try {
        if (!timeString || !timeString.includes(':')) return timeString;
        const [timePart, ampm] = timeString.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (ampm && ampm.toUpperCase().includes('PM') && hours !== 12) hours += 12;
        if (ampm && ampm.toUpperCase().includes('AM') && hours === 12) hours = 0;
        hours -= 2; 
        if (hours < 0) hours += 24;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } catch (e) { return timeString; }
}

// --- دوال الجلب ---
export async function getTodayMatches() {
  const cached = getCache(CACHE_KEY_TODAY);
  if (cached) return cached;
  const matches = await fetchMatches('https://www.koora3ala100.com/');
  if (matches.length) setCache(CACHE_KEY_TODAY, matches);
  return matches;
}

export async function getTomorrowMatches() {
  const cached = getCache(CACHE_KEY_TOMORROW);
  if (cached) return cached;
  const matches = await fetchMatches('https://www.koora3ala100.com/matches-tomorrow/');
  if (matches.length) setCache(CACHE_KEY_TOMORROW, matches);
  return matches;
}

async function fetchMatches(targetUrl) {
  try {
    const res = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    const html = await res.text();
    return await parseMatches(html);
  } catch (e) { console.error(e); return []; }
}

async function parseMatches(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matchElements = Array.from(doc.querySelectorAll('.AY_Match'));
  
  const matchesPromises = matchElements.map(async (matchEl) => {
    try {
      const homeTeam = matchEl.querySelector('.MT_Team.TM1 .TM_Name')?.textContent?.trim();
      const awayTeam = matchEl.querySelector('.MT_Team.TM2 .TM_Name')?.textContent?.trim();
      
      if (!homeTeam || !awayTeam) return null;
      
      const link = matchEl.querySelector('a')?.href;
      
      // الوقت
      const timeEl = matchEl.querySelector('.MT_Time')?.textContent?.trim() || '--:--';
      const time = convertSourceToMoroccoTime(timeEl);

      // النتيجة
      let score = 'VS';
      const scores = matchEl.querySelectorAll('.MT_Result .RS-goals');
      if (scores.length === 2) score = `${scores[0].textContent} - ${scores[1].textContent}`;

      // معلومات الدوري والمعلق (نحتاج الدوري لنرسله لـ Gemini)
      const infos = matchEl.querySelectorAll('.MT_Info ul li');
      const commentator = infos[1]?.textContent?.trim() || '';
      const league = infos[infos.length - 1]?.textContent?.trim() || '';

      // 🔥 هنا طلبنا: تجاهل قناة الموقع، واسأل Gemini عن القناة 🔥
      const geminiChannel = await getChannelFromGemini(homeTeam, awayTeam, league);

      return {
        homeTeam: { name: homeTeam, logo: extractImg(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img')) },
        awayTeam: { name: awayTeam, logo: extractImg(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img')) },
        time, score, league,
        channel: geminiChannel, // القناة القادمة من Gemini
        commentator,
        matchLink: link
      };
    } catch (e) { return null; }
  });

  return (await Promise.all(matchesPromises)).filter(m => m);
}

function extractImg(img) {
  if (!img) return '';
  const src = img.dataset.src || img.getAttribute('src') || '';
  if (src.startsWith('http')) return src;
  return `https://www.koora3ala100.com/${src.startsWith('/')?'':'/'}${src}`;
}
