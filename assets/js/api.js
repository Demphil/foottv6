// A reliable proxy
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

/**
 * Fetches today's matches.
 */
export async function getTodayMatches() {
  const targetUrl = 'https://kooora.live-kooora.com/?show=matchs';
  return fetchMatches(targetUrl);
}

/**
 * Fetches tomorrow's matches.
 */
export async function getTomorrowMatches() {
  const targetUrl = 'https://kooora.live-kooora.com/?show=matchs&d=1';
  return fetchMatches(targetUrl);
}

/**
 * Main function to fetch and parse matches from a target URL.
 * @param {string} targetUrl The URL to scrape.
 * @returns {Promise<Array>} A promise that resolves to an array of matches.
 */
async function fetchMatches(targetUrl) {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) {
      throw new Error(`Network response was not ok, status: ${response.status}`);
    }
    
    const html = await response.text();
    // If the received HTML is too short, it's likely an error page from the proxy or target.
    if (html.length < 500) {
        throw new Error("Received an empty or invalid HTML response.");
    }

    const matches = parseMatches(html);
    console.log(`Successfully parsed ${matches.length} matches from ${targetUrl}`);
    
    return matches;
  } catch (error) {
    console.error(`Error fetching matches from ${targetUrl}:`, error);
    // Return an empty array on failure so the UI can show a "no matches" message.
    return []; 
  }
}

/**
 * Parses the HTML string to extract match details.
 * THIS IS THE MOST CRITICAL PART - SELECTORS MUST MATCH THE TARGET SITE'S HTML.
 * @param {string} html The raw HTML content of the page.
 * @returns {Array} An array of match objects.
 */
function parseMatches(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const matches = [];
  
  // Find all league containers first, then find matches within each. This is more stable.
  const leagueSections = doc.querySelectorAll('.match-container'); // Assuming a main container for each league
  
  if (leagueSections.length === 0) {
    console.warn("Could not find any '.match-container' elements. The site structure may have changed. Falling back to a general selector.");
    // Fallback if the primary structure isn't found
    const allMatches = doc.querySelectorAll('.matche'); // A common class name for a single match row
    if (allMatches.length === 0) {
        console.error("CRITICAL: No match elements found with any selector. Parsing failed.");
        return [];
    }
    return parseSingleMatch(allMatches, 'بطولة غير محددة'); // Parse them with a default league name
  }

  leagueSections.forEach(section => {
    const leagueName = section.querySelector('.leage_name, .league-title')?.textContent?.trim() || 'بطولة';
    const matchElements = section.querySelectorAll('.matche'); // Find matches inside this league
    matches.push(...parseSingleMatch(matchElements, leagueName));
  });

  return matches;
}

/**
 * Helper function to parse a collection of match elements.
 * @param {NodeListOf<Element>} elements - The match elements to parse.
 * @param {string} leagueName - The name of the league for these matches.
 * @returns {Array} An array of parsed match objects.
 */
function parseSingleMatch(elements, leagueName) {
    const parsed = [];
    elements.forEach(matchEl => {
        try {
            const homeTeamName = matchEl.querySelector('.team_s:first-child .team-name')?.textContent?.trim() || 'فريق 1';
            const awayTeamName = matchEl.querySelector('.team_s:last-child .team-name')?.textContent?.trim() || 'فريق 2';
            const homeTeamLogo = extractImageUrl(matchEl.querySelector('.team_s:first-child img'));
            const awayTeamLogo = extractImageUrl(matchEl.querySelector('.team_s:last-child img'));
            const time = matchEl.querySelector('.match_time, .time')?.textContent?.trim() || '--:--';
            const score = matchEl.querySelector('.match_result, .score')?.textContent?.trim() || 'VS';

            // Ensure we don't push empty/invalid entries
            if (homeTeamName !== 'فريق 1' || awayTeamName !== 'فريق 2') {
                 parsed.push({
                    homeTeam: { name: homeTeamName, logo: homeTeamLogo },
                    awayTeam: { name: awayTeamName, logo: awayTeamLogo },
                    time: time,
                    score: score,
                    league: leagueName
                });
            }
        } catch (e) {
            console.error('Error parsing a single match element:', e, matchEl);
        }
    });
    return parsed;
}

/**
 * Correctly resolves the full image URL.
 * @param {Element} imgElement The <img> element.
 * @returns {string} The absolute URL of the image.
 */
function extractImageUrl(imgElement) {
  if (!imgElement) return '';
  const src = imgElement.dataset.src || imgElement.getAttribute('src') || '';
  // Don't try to build a URL if it's already absolute
  if (src.startsWith('http')) {
    return src;
  }
  // Handle protocol-relative URLs
  if (src.startsWith('//')) {
    return `https:${src}`;
  }
  return `https://kooora.live-kooora.com${src.startsWith('/') ? '' : '/'}${src}`;
}
