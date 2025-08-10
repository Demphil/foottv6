// اختر أحد هذه الخوادم البروكسية (جرّبها بالترتيب)
const PROXY_SERVERS = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://proxy.cors.sh/?'
];

export async function getTodayMatches() {
  const targetUrl = 'https://kooora.live-kooora.com/?show=matchs';
  return fetchMatches(targetUrl);
}

export async function getTomorrowMatches() {
  const targetUrl = 'https://kooora.live-kooora.com/?show=matchs&d=1';
  return fetchMatches(targetUrl);
}

async function fetchMatches(targetUrl) {
  for (const proxy of PROXY_SERVERS) {
    try {
      const response = await fetch(`${proxy}${encodeURIComponent(targetUrl)}`);
      if (response.ok) {
        const html = await response.text();
        return parseMatches(html);
      }
    } catch (error) {
      console.error(`Error with proxy ${proxy}:`, error);
    }
  }
  console.error('All proxies failed, using fallback data');
  return getFallbackMatches();
}

function parseMatches(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  
  // استخراج أساسي للمباريات (تعدل حسب هيكل الموقع الفعلي)
  const matchElements = doc.querySelectorAll('.match-item, .match-row');
  
  matchElements.forEach(match => {
    matches.push({
      homeTeam: {
        name: match.querySelector('.home-team')?.textContent?.trim() || 'فريق 1',
        logo: match.querySelector('.home-team img')?.src || ''
      },
      awayTeam: {
        name: match.querySelector('.away-team')?.textContent?.trim() || 'فريق 2',
        logo: match.querySelector('.away-team img')?.src || ''
      },
      time: match.querySelector('.time')?.textContent?.trim() || '--:--',
      score: match.querySelector('.score')?.textContent?.trim() || 'VS',
      league: match.closest('.league-section')?.querySelector('.league-name')?.textContent?.trim() || 'بطولة'
    });
  });
  
  return matches;
}

function getFallbackMatches() {
  // بيانات احتياطية عند فشل الاتصال
  return [
    {
      homeTeam: { name: 'فريق 1', logo: '' },
      awayTeam: { name: 'فريق 2', logo: '' },
      time: '--:--',
      score: 'VS',
      league: 'بطولة افتراضية'
    }
  ];
}
