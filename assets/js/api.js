const PROXY_URL = 'https://api.allorigins.win/raw?url=';

export async function getTodayMatches() {
  const targetUrl = 'https://kooora.live-kooora.com/?show=matchs';
  return fetchMatches(targetUrl);
}

export async function getTomorrowMatches() {
  const targetUrl = 'https://kooora.live-kooora.com/?show=matchs&d=1';
  return fetchMatches(targetUrl);
}

async function fetchMatches(targetUrl) {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const html = await response.text();
    console.log('Raw HTML received:', html.substring(0, 500)); // تسجيل جزء من HTML للفحص
    
    const matches = parseMatches(html);
    console.log('Parsed matches:', matches); // تسجيل البيانات المستخرجة
    
    return matches;
  } catch (error) {
    console.error('Error fetching matches:', error);
    return getFallbackMatches();
  }
}

function parseMatches(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // استهداف أكثر دقة للعناصر حسب الهيكل الحالي للموقع
    const matchElements = doc.querySelectorAll('.match-block, .match-item, [class*="match-"]');
    console.log('Found match elements:', matchElements.length);

    const matches = [];
    
    matchElements.forEach(match => {
      try {
        matches.push({
          homeTeam: {
            name: match.querySelector('.team-home, .home-name')?.textContent?.trim() || 'فريق غير معروف',
            logo: extractImageUrl(match.querySelector('.team-home img, .home-logo img'))
          },
          awayTeam: {
            name: match.querySelector('.team-away, .away-name')?.textContent?.trim() || 'فريق غير معروف',
            logo: extractImageUrl(match.querySelector('.team-away img, .away-logo img'))
          },
          time: match.querySelector('.match-time, .time')?.textContent?.trim() || '--:--',
          score: match.querySelector('.match-score, .score')?.textContent?.trim() || 'VS',
          league: match.closest('.league-container')?.querySelector('.league-name')?.textContent?.trim() || 'بطولة'
        });
      } catch (e) {
        console.error('Error parsing single match:', e);
      }
    });
    
    return matches;
  } catch (e) {
    console.error('Error parsing HTML:', e);
    return getFallbackMatches();
  }
}

function extractImageUrl(imgElement) {
  if (!imgElement) return '';
  const src = imgElement.getAttribute('src') || '';
  return src.startsWith('http') ? src : `https://kooora.live-kooora.com${src.startsWith('/') ? '' : '/'}${src}`;
}

function getFallbackMatches() {
  return [
    {
      homeTeam: { name: 'فريق 1', logo: '' },
      awayTeam: { name: 'فريق 2', logo: '' },
      time: '18:00',
      score: 'VS',
      league: 'الدوري الافتراضي'
    }
  ];
}
