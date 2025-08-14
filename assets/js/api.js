// --- 1. Cache Configuration ---
const CACHE_EXPIRY_MS = 5 * 60 * 60 * 1000;
const CACHE_KEY_TODAY = &#39;matches_cache_today&#39;
const CACHE_KEY_TOMORROW = &#39;matches_cache_tomorrow&#39;

function setCache(key, data) {
const cacheItem = { timestamp: Date.now(), data: data };
localStorage.setItem(key, JSON.stringify(cacheItem));
console.log(`💾 Data for '${key}' saved to cache.`);
}

function getCache(key) {
const cachedItem = localStorage.getItem(key);
if (\!cachedItem) return null;
const { timestamp, data } = JSON.parse(cachedItem);
if ((Date.now() - timestamp) \> CACHE\_EXPIRY\_MS) {
localStorage.removeItem(key);
return null;
}
return data;
}

function convertKsaToMoroccoTime(timeString) {
try {
if (\!timeString || \!timeString.includes(':')) return timeString;
const [timePart, ampm] = timeString.split(' ');
let [hours, minutes] = timePart.split(':').map(Number);
if (ampm && ampm.toUpperCase().includes('PM') && hours \!== 12) hours += 12;
if (ampm && ampm.toUpperCase().includes('AM') && hours === 12) hours = 0;
hours -= 2;
if (hours \< 0) hours += 24;
const formattedHours = String(hours).padStart(2, '0');
const formattedMinutes = String(minutes).padStart(2, '0');
return `${formattedHours}:${formattedMinutes}`;
} catch (error) {
return timeString;
}
}

// --- 2. API Functions (Now with Caching) ---
const PROXY\_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

export async function getTodayMatches() {
const cachedMatches = getCache(CACHE\_KEY\_TODAY);
if (cachedMatches) {
console.log("⚡ Loading today's matches from cache.");
return cachedMatches;
}
console.log("🌐 Fetching today's matches from network.");
const targetUrl = 'https://kora-match.com?show=matchs';
const newMatches = await fetchMatches(targetUrl);
if (newMatches.length \> 0) setCache(CACHE\_KEY\_TODAY, newMatches);
return newMatches;
}

export async function getTomorrowMatches() {
const cachedMatches = getCache(CACHE\_KEY\_TOMORROW);
if (cachedMatches) {
console.log("⚡ Loading tomorrow's matches from cache.");
return cachedMatches;
}
console.log("🌐 Fetching tomorrow's matches from network.");
const targetUrl = 'https://kora-match.com/matches-tomorrow/';
const newMatches = await fetchMatches(targetUrl);
if (newMatches.length \> 0) setCache(CACHE\_KEY\_TOMORROW, newMatches);
return newMatches;
}

// --- 3. Core Fetching and Parsing Logic ---
async function fetchMatches(targetUrl) {
try {
const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
if (\!response.ok) throw new Error(`Request failed: ${response.status}`);
const html = await response.text();
return parseMatches(html);
} catch (error) {
console.error("Failed to fetch via worker:", error);
return [];
}
}

function parseMatches(html) {
const translations = { /\* ... Your full list of leagues and teams ... \*/ };
const translate = (text) =\> {
for (const key in translations) {
if (text.includes(key)) return translations[key];
}
return text;
};

const parser = new DOMParser();
const doc = parser.parseFromString(html, 'text/html');
const matches = [];

const mainSelector = '.AY\_Match';
const matchElements = doc.querySelectorAll(mainSelector);

matchElements.forEach(matchEl =\> {
try {
const homeTeamName = matchEl.querySelector('.MT\_Team.TM1 .TM\_Name')?.textContent?.trim();
const awayTeamName = matchEl.querySelector('.MT\_Team.TM2 .TM\_Name')?.textContent?.trim();
