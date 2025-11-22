// api.js
import { getChannelInfo } from './chaine.js'; 

const CACHE_EXPIRY_MS = 5 * 60 * 60 * 1000; 
const CACHE_KEY_TODAY = 'matches_cache_today';
const CACHE_KEY_TOMORROW = 'matches_cache_tomorrow';

// ... (دوال الكاش والوقت تبقى كما هي) ...
function setCache(key, data) { localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data })); }
function getCache(key) { 
    const item = localStorage.getItem(key); 
    if(!item) return null; 
    const {timestamp, data} = JSON.parse(item);
    if(Date.now() - timestamp > CACHE_EXPIRY_MS) { localStorage.removeItem(key); return null; }
    return data;
}
function convertSourceToMoroccoTime(t) {
    try {
        if(!t || !t.includes(':')) return t;
        const [time, ampm] = t.split(' ');
        let [h, m] = time.split(':').map(Number);
        if(ampm?.toUpperCase().includes('PM') && h!==12) h+=12;
        if(ampm?.toUpperCase().includes('AM') && h===12) h=0;
        h-=2; if(h<0) h+=24;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    } catch { return t; }
}

const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

export async function getTodayMatches() {
  const c = getCache(CACHE_KEY_TODAY); if(c) return c;
  const m = await fetchMatches('https://www.live-match-tv.net/');
  if(m.length>0) setCache(CACHE_KEY_TODAY, m); return m;
}

export async function getTomorrowMatches() {
  const c = getCache(CACHE_KEY_TOMORROW); if(c) return c;
  const m = await fetchMatches('https://www.live-match-tv.net/matches-tomorrow/');
  if(m.length>0) setCache(CACHE_KEY_TOMORROW, m); return m;
}

async function fetchMatches(url) {
  try {
    const res = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`);
    if(!res.ok) throw new Error(res.status);
    return parseMatches(await res.text());
  } catch(e) { console.error(e); return []; }
}

function parseMatches(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  
  doc.querySelectorAll('.AY_Match').forEach(matchEl => {
    try {
      const hTeam = matchEl.querySelector('.MT_Team.TM1 .TM_Name')?.textContent?.trim();
      const aTeam = matchEl.querySelector('.MT_Team.TM2 .TM_Name')?.textContent?.trim();
      if (!hTeam || !aTeam) return;

      let score = 'VS';
      const sSpans = matchEl.querySelectorAll('.MT_Result .RS-goals');
      if (sSpans.length === 2) score = `${sSpans[0].textContent} - ${sSpans[1].textContent}`;

      const time = convertSourceToMoroccoTime(matchEl.querySelector('.MT_Time')?.textContent?.trim());
      const info = matchEl.querySelectorAll('.MT_Info ul li');
      const league = info[info.length-1]?.textContent?.trim() || 'League';
      const comm = info[1]?.textContent?.trim() || '';

      // جلب المعلومات من chaine.js
      const chInfo = getChannelInfo(hTeam, aTeam);
      
      // الرابط النهائي: إذا لم نجده في ملفاتنا، نستخدم رابط الموقع
      let finalLink = chInfo.link;
      if (!finalLink || finalLink === '#' || finalLink === '') {
          finalLink = matchEl.querySelector('a')?.href || '#';
      }

      matches.push({
        homeTeam: { name: hTeam, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img')) },
        awayTeam: { name: aTeam, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img')) },
        time: time,
        score: score,
        league: league,
        
        // 🔥 التعديل هنا 🔥: مسافة فارغة لتشغيل الزر وإخفاء النص
        channel: ' ', 
        
        commentator: comm.includes('غير معروف') ? '' : comm,
        matchLink: finalLink
      });
    } catch (e) { console.error(e); }
  });
  return matches;
}

function extractImageUrl(img) {
  if (!img) return '';
  const src = img.dataset.src || img.getAttribute('src') || '';
  return src.startsWith('http') ? src : `https://www.live-match-tv.net/${src.startsWith('/') ? '' : '/'}${src}`;
}
