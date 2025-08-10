const BASE_URL = 'https://kooora.live-kooora.com';
const CACHE_DURATION = 15 * 60 * 1000; // 15 دقيقة تخزين مؤقت

export async function getTodayMatches() {
  const cachedData = getCachedMatches('today');
  if (cachedData) return cachedData;

  try {
    const response = await fetchWithProxy(`${BASE_URL}/?show=matchs`);
    if (!response.ok) throw new Error('فشل جلب البيانات');
    const html = await response.text();
    const matches = parseMatches(html, 'today');
    
    cacheMatches(matches, 'today');
    return matches;
  } catch (error) {
    console.error('حدث خطأ أثناء جلب المباريات:', error);
    return getCachedMatches('today') || getFallbackMatches();
  }
}

export async function getTomorrowMatches() {
  const cachedData = getCachedMatches('tomorrow');
  if (cachedData) return cachedData;

  try {
    const response = await fetchWithProxy(`${BASE_URL}/?show=matchs&d=1`);
    if (!response.ok) throw new Error('فشل جلب البيانات');
    const html = await response.text();
    const matches = parseMatches(html, 'tomorrow');
    
    cacheMatches(matches, 'tomorrow');
    return matches;
  } catch (error) {
    console.error('حدث خطأ أثناء جلب مباريات الغد:', error);
    return getCachedMatches('tomorrow') || [];
  }
}

async function fetchWithProxy(url) {
  console.log(`محاولة جلب: ${url}`);
  const PROXIES = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://thingproxy.freeboard.io/fetch/${url}`
  ];

  for (const [index, proxyUrl] of PROXIES.entries()) {
    try {
      console.log(`المحاولة ${index + 1} مع: ${proxyUrl}`);
      const response = await fetch(proxyUrl);
      console.log("حالة الاستجابة:", response.status);
      
      if (response.ok) {
        const data = proxyUrl.includes('allorigins.win') 
          ? await response.json() 
          : { contents: await response.text() };
        console.log("البيانات المستلمة بنجاح");
        return new Response(data.contents);
      }
    } catch (e) {
      console.error(`فشل البروكسي ${index + 1}:`, e);
    }
  }
  throw new Error('فشل جميع خوادم البروكسي');
}

function parseMatches(html, type) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  
  // استهداف العناصر حسب هيكل الموقع
  const matchElements = doc.querySelectorAll('.match-item, .match-row, .match-card');
  
  matchElements.forEach(match => {
    try {
      const leagueInfo = match.closest('.league-section') || match.closest('.panel');
      const leagueName = leagueInfo?.querySelector('.league-title, .panel-heading')?.textContent?.trim() || 'بطولة غير معروفة';
      const leagueLogo = leagueInfo?.querySelector('img')?.src || '';
      
      const homeTeam = {
        name: match.querySelector('.team-home, .home-team')?.textContent?.trim() || 'فريق غير معروف',
        logo: match.querySelector('.team-home img, .home-team img')?.src || ''
      };
      
      const awayTeam = {
        name: match.querySelector('.team-away, .away-team')?.textContent?.trim() || 'فريق غير معروف',
        logo: match.querySelector('.team-away img, .away-team img')?.src || ''
      };
      
      const score = match.querySelector('.match-score, .score')?.textContent?.trim() || 'VS';
      const time = extractTime(match, type);
      
      matches.push({
        id: match.id || generateUniqueId(),
        homeTeam: {
          name: homeTeam.name,
          logo: fixImageUrl(homeTeam.logo)
        },
        awayTeam: {
          name: awayTeam.name,
          logo: fixImageUrl(awayTeam.logo)
        },
        score: score,
        time: time,
        league: {
          name: leagueName,
          logo: fixImageUrl(leagueLogo)
        },
        channels: extractChannels(match),
        status: getMatchStatus(match)
      });
    } catch (e) {
      console.error('خطأ في تحليل بيانات المباراة:', e);
    }
  });
  
  return matches; // السطر 113 المصحح
}

function extractTime(matchElement, type) {
  if (type === 'today') {
    return matchElement.querySelector('.match-time, .time')?.textContent?.trim() || '--:--';
  } else {
    const dateStr = matchElement.querySelector('.match-date, .date')?.textContent?.trim();
    return dateStr || '--:--';
  }
}

function extractChannels(matchElement) {
  const channels = [];
  const channelElements = matchElement.querySelectorAll('.channel-logo, .broadcaster');
  
  channelElements.forEach(el => {
    const channelName = el.getAttribute('title') || el.alt || el.dataset.name;
    if (channelName) channels.push(channelName);
  });
  
  return channels.length > 0 ? channels : ['غير معروف'];
}

function getMatchStatus(matchElement) {
  if (matchElement.classList.contains('live')) return 'مباشر';
  if (matchElement.querySelector('.live-icon')) return 'مباشر';
  if (matchElement.classList.contains('finished')) return 'منتهي';
  return 'قادم';
}

function fixImageUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// نظام التخزين المؤقت
function cacheMatches(matches, type) {
  const cacheKey = `kooora-matches-${type}`;
  localStorage.setItem(cacheKey, JSON.stringify({
    data: matches,
    timestamp: Date.now()
  }));
}

function getCachedMatches(type) {
  const cacheKey = `kooora-matches-${type}`;
  const cached = JSON.parse(localStorage.getItem(cacheKey));
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function generateUniqueId() {
  return `match-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function getFallbackMatches() {
  return [
    {
      id: 'fallback-1',
      homeTeam: { 
        name: 'فريق 1', 
        logo: 'assets/images/default-team.png'
      },
      awayTeam: { 
        name: 'فريق 2', 
        logo: 'assets/images/default-team.png'
      },
      score: 'VS',
      time: '--:--',
      league: { 
        name: 'بطولة افتراضية', 
        logo: 'assets/images/default-league.png'
      },
      channels: ['قناة افتراضية'],
      status: 'قادم'
    }
  ];
}
