// /assets/js/api.js
const SCRAPER_API_KEY = '1f7befa6374a1d3832ce47ff2ddc44c7'; // استخدم مفتاحك الخاص
const CACHE_DURATION = 15 * 60 * 1000; // 15 دقيقة تخزين مؤقت

export async function getTodayMatches() {
  // التحقق من التخزين المؤقت أولاً
  const cachedData = getCachedMatches();
  if (cachedData) return cachedData;

  try {
    const targetUrl = 'https://www.kooora.com/?show=matchs';
    const apiUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}&render=true`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`فشل الجلب مع حالة: ${response.status}`);
    
    const html = await response.text();
    const matches = parseKoooraMatches(html);
    
    // التحقق من صحة البيانات قبل الإرجاع
    if (!matches || matches.length === 0) {
      throw new Error('لا توجد مباريات مستلمة');
    }
    
    // تخزين البيانات في الذاكرة المؤقتة
    cacheMatches(matches);
    return matches;
    
  } catch (error) {
    console.error('حدث خطأ أثناء جلب المباريات:', error);
    // العودة إلى البيانات المخزنة أو الوهمية عند الفشل
    return cachedData || getFallbackMatches();
  }
}

function parseKoooraMatches(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  
  // اختيار أكثر دقة لعناصر المباريات في Kooora
  const matchElements = doc.querySelectorAll('.match-item, .match-card'); // تحديث حسب هيكل Kooora
  
  matchElements.forEach(match => {
    try {
      const homeTeam = match.querySelector('.home-team, .team-a') || {};
      const awayTeam = match.querySelector('.away-team, .team-b') || {};
      const scoreElement = match.querySelector('.match-score, .score');
      const timeElement = match.querySelector('.match-time, .time');
      const leagueElement = match.closest('.league-container')?.querySelector('.league-name') || {};
      const channels = Array.from(match.querySelectorAll('.channel-list img')).map(img => img.alt);
      
      const matchData = {
        id: match.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        homeTeam: {
          name: homeTeam.textContent?.trim() || 'فريق غير معروف',
          logo: homeTeam.querySelector('img')?.src || ''
        },
        awayTeam: {
          name: awayTeam.textContent?.trim() || 'فريق غير معروف',
          logo: awayTeam.querySelector('img')?.src || ''
        },
        score: scoreElement?.textContent?.trim() || 'VS',
        time: timeElement?.textContent?.trim() || '--:--',
        date: new Date().toISOString(),
        league: {
          name: leagueElement.textContent?.trim() || 'بطولة غير معروفة',
          logo: leagueElement.querySelector('img')?.src || ''
        },
        channels: channels.filter(Boolean),
        status: getMatchStatus(match, scoreElement)
      };
      
      // التحقق من صحة المباراة قبل إضافتها
      if (isValidMatch(matchData)) {
        matches.push(matchData);
      }
    } catch (e) {
      console.error('خطأ في تحليل بيانات المباراة:', e);
    }
  });
  
  return matches;
}

function getMatchStatus(matchElement, scoreElement) {
  if (matchElement.classList.contains('live')) return 'مباشر';
  if (matchElement.classList.contains('finished')) return 'منتهي';
  if (scoreElement?.textContent?.includes(':')) return 'منتهي';
  return 'قادم';
}

function isValidMatch(match) {
  // تأكد من وجود بيانات أساسية للمباراة
  return match.homeTeam.name && match.awayTeam.name && 
         match.homeTeam.name !== match.awayTeam.name;
}

// نظام التخزين المؤقت البسيط
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

function getFallbackMatches() {
  // بيانات وهمية للتراجع عند الحاجة
  return [
    {
      id: 'fallback-1',
      homeTeam: { name: 'النصر', logo: '' },
      awayTeam: { name: 'الهلال', logo: '' },
      score: 'VS',
      time: '21:00',
      league: { name: 'الدوري السعودي', logo: '' },
      channels: ['KSA Sports'],
      status: 'قادم'
    }
  ];
}
