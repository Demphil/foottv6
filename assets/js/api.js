// A reliable proxy
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

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
    if (html.length < 500) {
        throw new Error("Received an empty or invalid HTML response.");
    }

    const matches = parseMatches(html);
    console.log(`Successfully parsed ${matches.length} matches from ${targetUrl}`);
    
    return matches;
  } catch (error) {
    console.error(`Error fetching matches from ${targetUrl}:`, error);
    return []; 
  }
}

/**
 * Parses the HTML string to extract match details using the correct selectors.
 * @param {string} html The raw HTML content of the page.
 * @returns {Array} An array of match objects.
 */
// في ملف api.js

function parseMatches(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const matches = [];

  const matchElements = doc.querySelectorAll('.AY_Match');
  
  if (matchElements.length === 0) {
    console.error("CRITICAL: لم يتم العثور على أي مباريات باستخدام المحدد '.AY_Match'.");
    return [];
  }

  matchElements.forEach(matchEl => {
      try {
          const homeTeamName = matchEl.querySelector('.MT_Team.TM1 .TM_Name')?.textContent?.trim();
          const awayTeamName = matchEl.querySelector('.MT_Team.TM2 .TM_Name')?.textContent?.trim();

          if (!homeTeamName || !awayTeamName) {
              return; 
          }

          const homeTeamLogo = extractImageUrl(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img'));
          const awayTeamLogo = extractImageUrl(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img'));
          const time = matchEl.querySelector('.MT_Time')?.textContent?.trim() || '--:--';
          
          const scoreSpans = matchEl.querySelectorAll('.MT_Result .RS-goals');
          const score = scoreSpans.length === 2 
              ? `${scoreSpans[0].textContent.trim()} - ${scoreSpans[1].textContent.trim()}`
              : 'VS';

          // --- التحديثات الجديدة هنا ---
          const infoListItems = matchEl.querySelectorAll('.MT_Info ul li');
          
          // القناة هي غالباً العنصر الأول في القائمة
          const channel = infoListItems[0]?.textContent?.trim() || '';
          
          // المعلق هو غالباً العنصر الثاني
          const commentator = infoListItems[1]?.textContent?.trim() || '';

          // الدوري هو العنصر الأخير
          const league = infoListItems[infoListItems.length - 1]?.textContent?.trim() || 'بطولة';
          
           matches.push({
              homeTeam: { name: homeTeamName, logo: homeTeamLogo },
              awayTeam: { name: awayTeamName, logo: awayTeamLogo },
              time: time,
              score: score,
              league: league,
              // إضافة البيانات الجديدة
              channel: channel.includes('غير معروف') ? '' : channel,
              commentator: commentator.includes('غير معروف') ? '' : commentator,
          });

      } catch (e) {
          console.error('فشل في تحليل عنصر مباراة واحد:', e, matchEl);
      }
  });

  return matches;
}

/**
 * Correctly resolves the full image URL from lazy-loaded images.
 * @param {Element} imgElement The <img> element.
 * @returns {string} The absolute URL of the image.
 */
function extractImageUrl(imgElement) {
  if (!imgElement) return '';
  const src = imgElement.dataset.src || imgElement.getAttribute('src') || '';
  if (src.startsWith('http')) {
    return src;
  }
  if (src.startsWith('//')) {
    return `https:${src}`;
  }
  return `https://kooora.live-kooora.com${src.startsWith('/') ? '' : '/'}${src}`;
}
