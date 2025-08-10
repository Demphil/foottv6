// --- Cache Configuration ---
const CACHE_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 ساعات بالمللي ثانية
const CACHE_KEY_TODAY = 'matches_cache_today';
const CACHE_KEY_TOMORROW = 'matches_cache_tomorrow';

/**
 * Stores data in localStorage with a timestamp.
 * @param {string} key The key for the cache.
 * @param {any} data The data to store.
 */
function setCache(key, data) {
  const cacheItem = {
    timestamp: Date.now(),
    data: data,
  };
  localStorage.setItem(key, JSON.stringify(cacheItem));
}

/**
 * Retrieves data from localStorage if it's not expired.
 * @param {string} key The key for the cache.
 * @returns {any|null} The cached data or null if not found/expired.
 */
function getCache(key) {
  const cachedItem = localStorage.getItem(key);
  if (!cachedItem) {
    return null; // لا يوجد شيء في الذاكرة
  }

  const { timestamp, data } = JSON.parse(cachedItem);
  const age = Date.now() - timestamp;

  if (age > CACHE_EXPIRY_MS) {
    // البيانات قديمة، احذفها وأرجع null
    localStorage.removeItem(key);
    return null;
  }

  // البيانات صالحة، أرجعها
  return data;
}

// --- API Functions with Caching Logic ---

const PROXY_SERVERS = [
  'https://corsproxy.io/?',
  'https://proxy.cors.sh/',
  'https://api.allorigins.win/raw?url=',
];

/**
 * Fetches today's matches, using cache first.
 */
export async function getTodayMatches() {
  const cachedMatches = getCache(CACHE_KEY_TODAY);
  if (cachedMatches) {
    console.log("⚡ Loading today's matches from cache.");
    return cachedMatches;
  }

  console.log("🌐 Cache for today is empty or expired. Fetching from network.");
  const targetUrl = 'https://kooora.live-kooora.com/?show=matchs';
  const newMatches = await fetchMatches(targetUrl);
  
  if (newMatches.length > 0) {
    console.log("💾 Saving today's matches to cache.");
    setCache(CACHE_KEY_TODAY, newMatches);
  }
  return newMatches;
}

/**
 * Fetches tomorrow's matches, using cache first.
 */
export async function getTomorrowMatches() {
  const cachedMatches = getCache(CACHE_KEY_TOMORROW);
  if (cachedMatches) {
    console.log("⚡ Loading tomorrow's matches from cache.");
    return cachedMatches;
  }

  console.log("🌐 Cache for tomorrow is empty or expired. Fetching from network.");
  const targetUrl = 'https://kooora.live-kooora.com/?show=matchs&d=1';
  const newMatches = await fetchMatches(targetUrl);
  
  if (newMatches.length > 0) {
    console.log("💾 Saving tomorrow's matches to cache.");
    setCache(CACHE_KEY_TOMORROW, newMatches);
  }
  return newMatches;
}

// --- Core Fetching and Parsing Logic (No changes needed below) ---

async function fetchMatches(targetUrl) {
  for (const proxy of PROXY_SERVERS) {
    const url = `${proxy}${encodeURIComponent(targetUrl)}`;
    try {
      const response = await fetch(url, { headers: { 'Origin': window.location.origin } });
      if (!response.ok) throw new Error(`Proxy request failed with status: ${response.status}`);
      const html = await response.text();
      if (html.length < 500) throw new Error("Received an empty or invalid HTML response.");
      const matches = parseMatches(html);
      return matches;
    } catch (error) {
      console.error(`Proxy ${proxy} failed:`, error.message);
    }
  }
  console.error("All proxies failed.");
  return [];
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

          const infoListItems = matchEl.querySelectorAll('.MT_Info ul li');
          const channel = infoListItems[0]?.textContent?.trim() || '';
          const commentator = infoListItems[1]?.textContent?.trim() || '';
          const league = infoListItems[infoListItems.length - 1]?.textContent?.trim() || 'بطولة';
          
          matches.push({
            homeTeam: { name: homeTeamName, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img')) },
            awayTeam: { name: awayTeamName, logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img')) },
            time: matchEl.querySelector('.MT_Time')?.textContent?.trim() || '--:--',
            score: (spans => spans.length === 2 ? `${spans[0].textContent.trim()} - ${spans[1].textContent.trim()}` : 'VS')(matchEl.querySelectorAll('.MT_Result .RS-goals')),
            league: league,
            channel: channel.includes('غير معروف') ? '' : channel,
            commentator: commentator.includes('غير معروف') ? '' : commentator,
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
  return `https://kooora.live-kooora.com${src.startsWith('/') ? '' : '/'}${src}`;
}
