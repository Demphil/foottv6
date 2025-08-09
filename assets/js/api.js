// /assets/js/api.js
const TARGET_URL = 'https://kooora.live-kooora.com/?show=matchs'; // أو أي موقع تريده
const CACHE_DURATION = 15 * 60 * 1000; // 15 دقيقة تخزين مؤقت

export async function getMatches() {
  // جلب البيانات المخزنة مؤقتًا إذا كانت حديثة
  const cachedData = getCachedMatches();
  if (cachedData) return cachedData;

  try {
    // 1. جلب HTML من الموقع المستهدف
    const response = await fetchWithCORSProxy(TARGET_URL);
    const html = await response.text();

    // 2. استخراج جميع المباريات بدون تصفية
    const matches = extractAllMatches(html);
    
    // 3. تخزين البيانات مؤقتًا
    cacheMatches(matches);
    return matches;

  } catch (error) {
    console.error('حدث خطأ:', error);
    return getCachedMatches() || getFallbackData();
  }
}

// دالة الجلب باستخدام CORS Proxy (بدون ScraperAPI)
async function fetchWithCORSProxy(url) {
  // استخدم أي خدمة بروكسي مجانية
  const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
  return await fetch(proxyUrl);
}

// استخراج جميع المباريات من HTML
function extractAllMatches(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];

  // حدد العناصر التي تحتوي على المباريات (يجب تعديلها حسب الموقع)
  const matchElements = doc.querySelectorAll('.match-item, .match');

  matchElements.forEach(match => {
    try {
      matches.push({
        homeTeam: match.querySelector('.home-team')?.textContent?.trim() || 'فريق 1',
        awayTeam: match.querySelector('.away-team')?.textContent?.trim() || 'فريق 2',
        score: match.querySelector('.score')?.textContent?.trim() || '-',
        time: match.querySelector('.time')?.textContent?.trim() || '--:--',
        league: match.closest('.league')?.querySelector('.name')?.textContent?.trim() || 'دوري'
      });
    } catch (e) {
      console.error('خطأ في استخراج مباراة:', e);
    }
  });

  return matches;
}

// نظام التخزين المؤقت البسيط
function cacheMatches(data) {
  localStorage.setItem('matchesData', JSON.stringify({
    data,
    timestamp: Date.now()
  }));
}

function getCachedMatches() {
  const cached = JSON.parse(localStorage.getItem('matchesData'));
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

// بيانات افتراضية عند الفشل
function getFallbackData() {
  return [
    {
      homeTeam: "فريق أ",
      awayTeam: "فريق ب",
      score: "0-0",
      time: "20:00",
      league: "الدوري الافتراضي"
    }
  ];
}
