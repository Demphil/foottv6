// List of proxy servers to try in order.
const PROXY_SERVERS = [
  'https://corsproxy.io/?',              // A reliable alternative
  'https://proxy.cors.sh/',              // Another good alternative
  'https://api.allorigins.win/raw?url=', // Kept as a last resort in case it comes back online
];

/**
 * Fetches and exports today's matches.
 */
export async function getTodayMatches() {
  const targetUrl = 'https://kooora.live-kooora.com/?show=matchs';
  return fetchMatches(targetUrl);
}

/**
 * Fetches and exports tomorrow's matches.
 */
export async function getTomorrowMatches() {
  const targetUrl = 'https://kooora.live-kooora.com/?show=matchs&d=1';
  return fetchMatches(targetUrl);
}

/**
 * Main function to fetch and parse matches, with proxy fallback logic.
 * @param {string} targetUrl The URL to scrape.
 * @returns {Promise<Array>} A promise that resolves to an array of matches.
 */
async function fetchMatches(targetUrl) {
  // Loop through each proxy server until one succeeds.
  for (const proxy of PROXY_SERVERS) {
    const url = `${proxy}${encodeURIComponent(targetUrl)}`;
    try {
      console.log(`Trying proxy: ${proxy}`);
      
      const response = await fetch(url, {
        headers: {
            // Some proxies require an Origin header.
            'Origin': window.location.origin
        }
      });
      
      if (!response.ok) {
        // If the response is not OK (e.g., 404, 500), throw an error to try the next proxy.
        throw new Error(`Proxy request failed with status: ${response.status}`);
      }
      
      const html = await response.text();
      if (html.length < 500) {
        throw new Error("Received an empty or invalid HTML response.");
      }

      // If we get here, the proxy worked. Parse the matches and return them.
      const matches = parseMatches(html);
      console.log(`Successfully fetched and parsed ${matches.length} matches using ${proxy}`);
      return matches;

    } catch (error) {
      // If a proxy fails, log the error and the loop will continue to the next one.
      console.error(`Proxy ${proxy} failed:`, error.message);
    }
  }

  // If all proxies in the list have failed.
  console.error("All proxies failed. Could not fetch match data.");
  alert("حدث خطأ في جلب البيانات من المصدر. يرجى المحاولة مرة أخرى لاحقاً.");
  return []; // Return an empty array so the app doesn't crash.
}

/**
 * Parses the HTML string to extract match details. (No changes needed here)
 * @param {string} html The raw HTML content of the page.
 * @returns {Array} An array of match objects.
 */
function parseMatches(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  const matchElements = doc.querySelectorAll('.AY_Match');
  
  if (matchElements.length === 0) {
    console.error("CRITICAL: No matches found using selector '.AY_Match'.");
    return [];
  }

  matchElements.forEach(matchEl => {
      try {
          const homeTeamName = matchEl.querySelector('.MT_Team.TM1 .TM_Name')?.textContent?.trim();
          const awayTeamName = matchEl.querySelector('.MT_Team.TM2 .TM_Name')?.textContent?.trim();

          if (!homeTeamName || !awayTeamName) return;

          const homeTeamLogo = extractImageUrl(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img'));
          const awayTeamLogo = extractImageUrl(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img'));
          const time = matchEl.querySelector('.MT_Time')?.textContent?.trim() || '--:--';
          const scoreSpans = matchEl.querySelectorAll('.MT_Result .RS-goals');
          const score = scoreSpans.length === 2 
              ? `${scoreSpans[0].textContent.trim()} - ${scoreSpans[1].textContent.trim()}`
              : 'VS';
          const infoListItems = matchEl.querySelectorAll('.MT_Info ul li');
          const channel = infoListItems[0]?.textContent?.trim() || '';
          const commentator = infoListItems[1]?.textContent?.trim() || '';
          const league = infoListItems[infoListItems.length - 1]?.textContent?.trim() || 'بطولة';
          
           matches.push({
              homeTeam: { name: homeTeamName, logo: homeTeamLogo },
              awayTeam: { name: awayTeamName, logo: awayTeamLogo },
              time: time,
              score: score,
              league: league,
              channel: channel.includes('غير معروف') ? '' : channel,
              commentator: commentator.includes('غير معروف') ? '' : commentator,
          });
      } catch (e) {
          console.error('Failed to parse a single match element:', e, matchEl);
      }
  });

  return matches;
}

/**
 * Correctly resolves the full image URL. (No changes needed here)
 */
function extractImageUrl(imgElement) {
  if (!imgElement) return '';
  const src = imgElement.dataset.src || imgElement.getAttribute('src') || '';
  if (src.startsWith('http') || src.startsWith('//')) {
    return src;
  }
  return `https://kooora.live-kooora.com${src.startsWith('/') ? '' : '/'}${src}`;
}
