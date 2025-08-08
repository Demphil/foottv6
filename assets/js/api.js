// /assets/js/api.js
const SCRAPER_API_KEY = '1f7befa6374a1d3832ce47ff2ddc44c7';
const CACHE_DURATION = 15 * 60 * 1000; // 15 دقيقة تخزين مؤقت

// قائمة الدوريات المطلوبة مع معرفاتها أو أسمائها
const TARGET_LEAGUES = {
  'الدوري السعودي': ['رسمي', 'Saudi League'],
  'الدوري الإنجليزي': ['Premier League', 'الدوري الإنجليزي'],
  'دوري أبطال أوروبا': ['Champions League', 'دوري الأبطال']
};

export async function getTodayMatches() {
  const cachedData = getCachedMatches();
  if (cachedData) return filterByLeagues(cachedData);

  try {
    const targetUrl = 'https://www.kooora.com/%D9%83%D8%B1%D8%A9-%D8%A7%D9%84%D9%82%D8%AF%D9%85/%D9%85%D8%A8%D8%A7%D8%B1%D9%8A%D8%A7%D8%AA-%D8%A7%D9%84%D9%8A%D9%88%D9%85/?show=matchs';
    const apiUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}&render=true&wait_for=3000`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`فشل الجلب مع حالة: ${response.status}`);
    
    const html = await response.text();
    const matches = parseKoooraMatches(html);
    
    if (!matches || matches.length === 0) {
      throw new Error('لا توجد مباريات مستلمة');
    }
    
    cacheMatches(matches);
    return filterByLeagues(matches);
    
  } catch (error) {
    console.error('حدث خطأ أثناء جلب المباريات:', error);
    return filterByLeagues(cachedData || getFallbackMatches());
  }
}

function parseKoooraMatches(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  
  // العناصر الرئيسية للمباريات في Kooora (يجب تحديثها حسب الهيكل الحالي)
  const matchElements = doc.querySelectorAll('.match-list > div, .match-card, .match-item');
  
  matchElements.forEach(match => {
    try {
      // استخراج بيانات الفريقين
      const homeTeam = extractTeamData(match, 'home');
      const awayTeam = extractTeamData(match, 'away');
      
      // استخراج بيانات المباراة
      const scoreElement = match.querySelector('.sc, .score, .match-score');
      const timeElement = match.querySelector('.match-time, .time, .mt');
      const leagueElement = match.closest('.league-section')?.querySelector('.league-name, .competition');
      
      // معالجة الروابط النسبية للصور
      const baseUrl = 'https://www.kooora.com/%D9%83%D8%B1%D8%A9-%D8%A7%D9%84%D9%82%D8%AF%D9%85/%D9%85%D8%A8%D8%A7%D8%B1%D9%8A%D8%A7%D8%AA-%D8%A7%D9%84%D9%8A%D9%88%D9%85';
      const homeLogo = homeTeam.logo?.startsWith('/') ? baseUrl + homeTeam.logo : homeTeam.logo;
      const awayLogo = awayTeam.logo?.startsWith('/') ? baseUrl + awayTeam.logo : awayTeam.logo;
      const leagueLogo = leagueElement?.querySelector('img')?.src;
      
      const matchData = {
        id: match.id || generateUniqueId(),
        homeTeam: {
          name: homeTeam.name || 'فريق غير معروف',
          logo: homeLogo || getDefaultTeamLogo()
        },
        awayTeam: {
          name: awayTeam.name || 'فريق غير معروف',
          logo: awayLogo || getDefaultTeamLogo()
        },
        score: processScore(scoreElement?.textContent),
        time: processTime(timeElement?.textContent),
        date: new Date().toISOString(),
        league: {
          name: leagueElement?.textContent?.trim() || 'بطولة غير معروفة',
          logo: leagueLogo?.startsWith('/') ? baseUrl + leagueLogo : leagueLogo || getDefaultLeagueLogo()
        },
        channels: extractChannels(match),
        status: getMatchStatus(match, scoreElement),
        isFeatured: checkIfFeatured(leagueElement?.textContent)
      };
      
      if (isValidMatch(matchData)) {
        matches.push(matchData);
      }
    } catch (e) {
      console.error('خطأ في تحليل بيانات المباراة:', e);
    }
  });
  
  return matches;
}

// دعم إضافي لاستخراج البيانات
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
    const channelName = img.alt || img.title || img.dataset.name;
    if (channelName) {
      channels.push(channelName);
    }
  });
  
  return channels.length > 0 ? channels : ['غير معروف'];
}

function processScore(scoreText) {
  if (!scoreText) return 'VS';
  return scoreText.trim().replace(/\s+/g, ' ');
}

function processTime(timeText) {
  if (!timeText) return '--:--';
  return timeText.trim().replace(/\s+/g, ' ');
}

function getMatchStatus(matchElement, scoreElement) {
  if (matchElement.classList.contains('live')) return 'مباشر';
  if (matchElement.classList.contains('finished')) return 'منتهي';
  if (scoreElement?.textContent?.match(/\d+\s*-\s*\d+/)) return 'منتهي';
  return 'قادم';
}

function checkIfFeatured(leagueName) {
  if (!leagueName) return false;
  return Object.values(TARGET_LEAGUES).some(leagueNames => 
    leagueNames.some(name => leagueName.includes(name))
  );
}

function filterByLeagues(matches) {
  return matches.filter(match => {
    return Object.values(TARGET_LEAGUES).some(leagueNames => 
      leagueNames.some(name => match.league.name.includes(name))
    );
  });
}

function isValidMatch(match) {
  return match.homeTeam.name && 
         match.awayTeam.name && 
         match.homeTeam.name !== match.awayTeam.name;
}

// نظام التخزين المؤقت
function cacheMatches(matches) {
  try {
    localStorage.setItem('koooraMatches', JSON.stringify({
      data: matches,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('فشل التخزين المؤقت:', e);
  }
}

function getCachedMatches() {
  try {
    const cached = JSON.parse(localStorage.getItem('koooraMatches'));
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  } catch (e) {
    console.warn('فشل قراءة التخزين المؤقت:', e);
  }
  return null;
}

// أدوات مساعدة
function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultTeamLogo() {
  return 'https://via.placeholder.com/50x50.png?text=Team';
}

function getDefaultLeagueLogo() {
  return 'https://via.placeholder.com/30x30.png?text=League';
}

function getFallbackMatches() {
  return [
    {
      id: 'fallback-1',
      homeTeam: { 
        name: 'النصر', 
        logo: 'https://www.kooora.com/images/teams/alnassr.png' 
      },
      awayTeam: { 
        name: 'الهلال', 
        logo: 'https://www.kooora.com/images/teams/alhilal.png' 
      },
      score: 'VS',
      time: '21:00',
      league: { 
        name: 'الدوري السعودي', 
        logo: 'https://www.kooora.com/images/leagues/spl.png' 
      },
      channels: ['KSA Sports'],
      status: 'قادم',
      isFeatured: true
    }
  ];
}
