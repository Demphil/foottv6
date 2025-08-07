// /assets/js/api.js
const SCRAPER_API_KEY = '1f7befa6374a1d3832ce47ff2ddc44c7'; // استخدم مفتاحك الخاص

export async function getTodayMatches() {
  try {
    const targetUrl = 'https://www.livescore.com/';
    const apiUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('Failed to fetch');
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // استخراج البيانات مع معالجة أفضل للأخطاء
    const matches = [];
    const matchElements = doc.querySelectorAll('.match');
    
    matchElements.forEach(match => {
      try {
        matches.push({
          id: match.dataset.id || Date.now().toString(),
          homeTeam: {
            name: match.querySelector('.home .name')?.textContent?.trim() || 'فريق غير معروف',
            logo: match.querySelector('.home .logo')?.src || ''
          },
          awayTeam: {
            name: match.querySelector('.away .name')?.textContent?.trim() || 'فريق غير معروف',
            logo: match.querySelector('.away .logo')?.src || ''
          },
          score: match.querySelector('.score')?.textContent?.trim() || 'vs',
          time: match.querySelector('.time')?.textContent?.trim() || 'الآن',
          league: match.closest('.league')?.querySelector('.name')?.textContent?.trim() || 'بطولة غير معروفة'
        });
      } catch (e) {
        console.error('Error parsing match:', e);
      }
    });
    
    return matches;
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
}
