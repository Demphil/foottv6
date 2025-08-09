// /assets/js/api.js
const BASE_URL = 'https://kooora.live-kooora.com';
const CACHE_DURATION = 15 * 60 * 1000; // 15 دقيقة تخزين مؤقت

export async function getTodayMatches() {
  const cachedData = getCachedMatches();
  if (cachedData) return cachedData;

  try {
    const todayUrl = `${BASE_URL}/?show=matchs`;
    const response = await fetchWithProxy(todayUrl);
    const html = await response.text();
    const matches = parseMatches(html);
    
    cacheMatches(matches);
    return matches;
    
  } catch (error) {
    console.error('حدث خطأ أثناء جلب المباريات:', error);
    return getCachedMatches() || getFallbackMatches();
  }
}

export async function getTomorrowMatches() {
  try {
    const tomorrowUrl = `${BASE_URL}/?show=matchs&d=1`;
    const response = await fetchWithProxy(tomorrowUrl);
    const html = await response.text();
    return parseMatches(html);
  } catch (error) {
    console.error('حدث خطأ أثناء جلب مباريات الغد:', error);
    return [];
  }
}

async function fetchWithProxy(url) {
  // يمكن استبدال هذا ببروكسي خاص بك إذا لزم الأمر
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  const data = await response.json();
  return new Response(data.contents);
}

function parseMatches(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  
  // تحديد العناصر حسب هيكل موقع Kooora الحالي
  const matchElements = doc.querySelectorAll('.match-list .match-item, .match-card');
  
  matchElements.forEach(match => {
    try {
      const homeTeam = extractTeamData(match, 'home');
      const awayTeam = extractTeamData(match, 'away');
      const score = match.querySelector('.sc, .score')?.textContent?.trim() || 'VS';
      const time = match.querySelector('.match-time, .time')?.textContent?.trim() || '--:--';
      const league = match.closest('.league-section')?.querySelector('.league-name')?.textContent?.trim() || 'بطولة غير معروفة';
      const leagueLogo = match.closest('.league-section')?.querySelector('img')?.src || '';
      
      matches.push({
        id: match.id || generateUniqueId(),
        homeTeam: {
          name: homeTeam.name || 'فريق غير معروف',
          logo: convertToAbsoluteUrl(homeTeam.logo)
        },
        awayTeam: {
          name: awayTeam.name || 'فريق غير معروف',
          logo: convertToAbsoluteUrl(awayTeam.logo)
        },
        score: score,
        time: time,
        date: new Date().toISOString(), // سيتم تصحيحه لاحقاً
        league: {
          name: league,
          logo: convertToAbsoluteUrl(leagueLogo)
        },
        channels: extractChannels(match),
        status: getMatchStatus(match)
      });
    } catch (e) {
      console.error('خطأ في تحليل بيانات المباراة:', e);
    }
  });
  
  return matches;
}

function extractTeamData(matchElement, type) {
  const teamElement = matchElement.querySelector(`.${type}-team, .team-${type}`);
  return {
    name: teamElement?.textContent?.trim(),
    logo: teamElement?.querySelector('img')?.src
  };
}

function extractChannels(matchElement) {
  const channels = [];
  const channelElements = matchElement.querySelectorAll('.channels img, .broadcasters img');
  
  channelElements.forEach(img => {
    channels.push(img.alt || img.title || 'قناة غير معروفة');
  });
  
  return channels.length > 0 ? channels : ['غير معروف'];
}

function getMatchStatus(matchElement) {
  if (matchElement.classList.contains('live')) return 'مباشر';
  if (matchElement.classList.contains('finished')) return 'منتهي';
  return 'قادم';
}

function convertToAbsoluteUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// نظام التخزين المؤقت
function cacheMatches(matches) {
  localStorage.setItem('koooraMatches', JSON.stringify({
    data: matches,
    timestamp: Date.now()
  }));
}

function getCachedMatches() {
  const cached = JSON.parse(localStorage.getItem('koooraMatches'));
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
