// assets/js/api.js
import { normalizeChannelName } from './chaine.js'; 

const CACHE_EXPIRY_MS = 5 * 60 * 60 * 1000; 
const CACHE_KEY_TODAY = 'matches_cache_today';
const CACHE_KEY_TOMORROW = 'matches_cache_tomorrow';
const GEMINI_WORKER_URL = 'https://gemini-kora.koora-live.workers.dev/'; // تأكد من الرابط
const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

// --- دوال الكاش والوقت ---
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

// --- الدوال الرئيسية ---
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
    return await parseMatchesAndBatchFetch(html);
  } catch (e) {
    console.error("Fetch error:", e);
    return [];
  }
}

// 🔥 الدالة الجديدة التي تدعم الحزمة الواحدة 🔥
async function parseMatchesAndBatchFetch(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matchElements = Array.from(doc.querySelectorAll('.AY_Match'));
  
  // 1. استخراج البيانات الأساسية أولاً
  const matchesData = matchElements.map((matchEl, index) => {
    try {
        const homeTeam = matchEl.querySelector('.MT_Team.TM1 .TM_Name')?.textContent?.trim();
        const awayTeam = matchEl.querySelector('.MT_Team.TM2 .TM_Name')?.textContent?.trim();
        if (!homeTeam || !awayTeam) return null;

        const infos = matchEl.querySelectorAll('.MT_Info ul li');
        const league = infos[infos.length - 1]?.textContent?.trim() || 'League';

        return {
            id: `match_${index}`, // معرف مؤقت
            element: matchEl,
            title: `${homeTeam} vs ${awayTeam}`,
            league: league,
            homeTeam, awayTeam
        };
    } catch (e) { return null; }
  }).filter(m => m !== null);

  if (matchesData.length === 0) return [];

  // 2. إعداد قائمة لإرسالها لـ Gemini (طلب واحد فقط!)
  const payload = {
      matches: matchesData.map(m => ({ id: m.id, title: m.title, league: m.league }))
  };

  let channelsMap = {};
  
  try {
      console.log("🚀 Sending Batch Request to Gemini...");
      const response = await fetch(GEMINI_WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      
      if (response.ok) {
          channelsMap = await response.json();
          console.log("✅ Batch Reply:", channelsMap);
      } else {
          console.error("Worker Error:", await response.text());
      }
  } catch (err) {
      console.error("Batch Fetch Failed:", err);
  }

  // 3. دمج النتائج وبناء الكائنات النهائية
  const finalMatches = matchesData.map(mData => {
      const matchEl = mData.element;
      
      // استخراج باقي التفاصيل (وقت، نتيجة، صور)
      const link = matchEl.querySelector('a')?.href;
      const timeEl = matchEl.querySelector('.MT_Time')?.textContent?.trim() || '--:--';
      const time = convertSourceToMoroccoTime(timeEl);
      let score = 'VS';
      const scores = matchEl.querySelectorAll('.MT_Result .RS-goals');
      if (scores.length === 2) score = `${scores[0].textContent} - ${scores[1].textContent}`;
      const infos = matchEl.querySelectorAll('.MT_Info ul li');
      const commentator = infos[1]?.textContent?.trim() || '';

      // جلب القناة من خريطة Gemini أو استخدام الافتراضي
      let channel = channelsMap[mData.id] || "beIN Sports 1";
      
      // تنظيف الاسم لضمان تطابقه مع streams.js
      if (normalizeChannelName) {
          channel = normalizeChannelName(channel) || channel;
      }

      return {
        homeTeam: { name: mData.homeTeam, logo: extractImg(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img')) },
        awayTeam: { name: mData.awayTeam, logo: extractImg(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img')) },
        time, score, league: mData.league,
        channel: channel,
        commentator,
        matchLink: link
      };
  });

  return finalMatches;
}

function extractImg(img) {
  if (!img) return '';
  const src = img.dataset.src || img.getAttribute('src') || '';
  if (src.startsWith('http')) return src;
  return `https://www.koora3ala100.com/${src.startsWith('/')?'':'/'}${src}`;
}
