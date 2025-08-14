// --- 1. Cache Configuration ---
const CACHE_EXPIRY_MS = 5 * 60 * 60 * 1000;
const CACHE_KEY_TODAY = 'matches_cache_today';
const CACHE_KEY_TOMORROW = 'matches_cache_tomorrow';

function setCache(key, data) {
  const cacheItem = { timestamp: Date.now(), data: data };
  localStorage.setItem(key, JSON.stringify(cacheItem));
  console.log(`💾 Data for '${key}' saved to cache.`);
}

function getCache(key) {
  const cachedItem = localStorage.getItem(key);
  if (!cachedItem) return null;
  const { timestamp, data } = JSON.parse(cachedItem);
  if ((Date.now() - timestamp) > CACHE_EXPIRY_MS) {
    localStorage.removeItem(key);
    return null;
  }
  return data;
}

function convertKsaToMoroccoTime(timeString) {
  try {
    if (!timeString || !timeString.includes(':')) return timeString;
    const [timePart, ampm] = timeString.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (ampm && ampm.toUpperCase().includes('PM') && hours !== 12) hours += 12;
    if (ampm && ampm.toUpperCase().includes('AM') && hours === 12) hours = 0;
    hours -= 2;
    if (hours < 0) hours += 24;
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes}`;
  } catch (error) {
    return timeString;
  }
}

// --- 2. API Functions (Now with Caching) ---
const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

export async function getTodayMatches() {
  const cachedMatches = getCache(CACHE_KEY_TODAY);
  if (cachedMatches) {
    console.log("⚡ Loading today's matches from cache.");
    return cachedMatches;
  }
  console.log("🌐 Fetching today's matches from network.");
  const targetUrl = 'https://kora-match.com?show=matchs';
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
  const targetUrl = 'https://kora-match.com/matches-tomorrow/';
  const newMatches = await fetchMatches(targetUrl);
  if (newMatches.length > 0) setCache(CACHE_KEY_TOMORROW, newMatches);
  return newMatches;
}

// --- 3. Core Fetching and Parsing Logic ---
async function fetchMatches(targetUrl) {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const html = await response.text();
    
    // --- أداة المساعدة 1: طباعة جزء من HTML ---
    console.log("--- Raw HTML Received (first 1000 chars) ---");
    console.log(html.substring(0, 1000));
    console.log("-------------------------------------------");

    return parseMatches(html);
  } catch (error) {
    console.error("Failed to fetch via worker:", error);
    return [];
  }
}

function parseMatches(html) {
  const translations = { /* ... Your full list of leagues and teams ... */ };
  const translate = (text) => { /* ... */ return text; };

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];

  // --- أداة المساعدة 2: التحقق من المحدد الرئيسي ---
  const mainSelector = '.AY_Match'; // <--- هذا هو المحدد الذي سنغيره
  const matchElements = doc.querySelectorAll(mainSelector);
  console.log(`Found ${matchElements.length} match elements using selector: "${mainSelector}"`);

  if (matchElements.length === 0) {
      console.error("CRITICAL: Main selector did not find any matches. You must find the new correct selector.");
  }
  
  matchElements.forEach(matchEl => {
      try {
          // ... (بقية الكود يبقى كما هو حاليًا)
          const homeTeamName = matchEl.querySelector('.MT_Team.TM1 .TM_Name')?.textContent?.trim();
          const awayTeamName = matchEl.querySelector('.MT_Team.TM2 .TM_Name')?.textContent?.trim();
          if (!homeTeamName || !awayTeamName) return;
          // ...
          matches.push({ /* ... */ });
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
  return `https://kora-match.com${src.startsWith('/') ? '' : '/'}${src}`;
}
