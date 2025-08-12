// --- 1. Cache Configuration ---
// Set cache to expire after 5 hours
const CACHE_EXPIRY_MS = 5 * 60 * 60 * 1000;
const CACHE_KEY_TODAY = 'matches_cache_today';
const CACHE_KEY_TOMORROW = 'matches_cache_tomorrow';

/**
 * Stores data in localStorage with a timestamp.
 */
function setCache(key, data) {
  const cacheItem = {
    timestamp: Date.now(),
    data: data,
  };
  localStorage.setItem(key, JSON.stringify(cacheItem));
  console.log(`💾 Data for '${key}' saved to cache.`);
}

/**
 * Retrieves data from localStorage if it's not expired.
 */
function getCache(key) {
  const cachedItem = localStorage.getItem(key);
  if (!cachedItem) return null;

  const { timestamp, data } = JSON.parse(cachedItem);
  const age = Date.now() - timestamp;

  if (age > CACHE_EXPIRY_MS) {
    localStorage.removeItem(key);
    return null; // Cache is expired
  }

  return data; // Cache is fresh
}


// --- 2. API Functions (Now with Caching) ---

// Use your new, reliable Cloudflare Worker
const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

/**
 * Fetches today's matches, using cache first.
 */
export async function getTodayMatches() {
  const cachedMatches = getCache(CACHE_KEY_TODAY);
  if (cachedMatches) {
    console.log("⚡ Loading today's matches from cache.");
    return cachedMatches;
  }

  console.log("🌐 Fetching today's matches from network.");
  const targetUrl = 'https://goalkooora.live-kooora.com/?show=matchs';
  const newMatches = await fetchMatches(targetUrl);
  
  if (newMatches.length > 0) {
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

  console.log("🌐 Fetching tomorrow's matches from network.");
  const targetUrl = 'https://goalkooora.live-kooora.com/matches-tomorrowkora/';
  const newMatches = await fetchMatches(targetUrl);
  
  if (newMatches.length > 0) {
    setCache(CACHE_KEY_TOMORROW, newMatches);
  }
  return newMatches;
}


// --- 3. Core Fetching and Parsing Logic ---

async function fetchMatches(targetUrl) {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const html = await response.text();
    return parseMatches(html);
  } catch (error) {
    console.error("Failed to fetch via worker:", error);
    return [];
  }
}

// In api.js

function parseMatches(html) {
  // --- Start of Translation Logic ---
  const translations = { /* ... Your full list of leagues and teams ... */ };
  const translate = (arabicText) => {
    for (const key in translations) {
      if (arabicText.includes(key)) return translations[key];
    }
    return arabicText;
  };
  // --- End of Translation Logic ---

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  const matchElements = doc.querySelectorAll('.AY_Match');
  
  matchElements.forEach(matchEl => {
      try {
          const homeTeamName = matchEl.querySelector('.MT_Team.TM1 .TM_Name')?.textContent?.trim();
          const awayTeamName = matchEl.querySelector('.MT_Team.TM2 .TM_Name')?.textContent?.trim();
          if (!homeTeamName || !awayTeamName) return;

          const matchLink = matchEl.querySelector('a[title^="مشاهدة مباراة"]')?.href;
          if (!matchLink) return;

          // --- Improved Score and Time Parsing Logic ---
          let score = 'VS';
          const scoreSpans = matchEl.querySelectorAll('.MT_Result .RS-goals');
          if (scoreSpans.length === 2) {
              const score1 = parseInt(scoreSpans[0].textContent.trim(), 10);
              const score2 = parseInt(scoreSpans[1].textContent.trim(), 10);
              // Ensure both scores are valid numbers before creating the string
              if (!isNaN(score1) && !isNaN(score2)) {
                  score = `${score1} - ${score2}`;
              }
          }
          const time = matchEl.querySelector('.MT_Time')?.textContent?.trim() || '--:--';
          // --- End of Improved Logic ---

          const infoListItems = matchEl.querySelectorAll('.MT_Info ul li');
          const channel = infoListItems[0]?.textContent?.trim() || '';
          const commentator = infoListItems[1]?.textContent?.trim() || '';
          const arabicLeague = infoListItems[infoListItems.length - 1]?.textContent?.trim() || 'League';
          
          matches.push({
            homeTeam: { name: translate(homeTeamName), logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img')) },
            awayTeam: { name: translate(awayTeamName), logo: extractImageUrl(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img')) },
            time: time,
            score: score,
            league: translate(arabicLeague),
            channel: channel.includes('غير معروف') ? '' : channel,
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
  return `https://goalkooora.live-kooora.com${src.startsWith('/') ? '' : '/'}${src}`;
}
