const BASE_URL = 'https://kooora.live-kooora.com';

export async function getTodayMatches() {
  try {
    const response = await fetch(`${BASE_URL}/?show=matchs`);
    const html = await response.text();
    return parseMatches(html);
  } catch (error) {
    console.error('Error fetching today matches:', error);
    return [];
  }
}

export async function getTomorrowMatches() {
  try {
    const response = await fetch(`${BASE_URL}/?show=matchs&d=1`);
    const html = await response.text();
    return parseMatches(html);
  } catch (error) {
    console.error('Error fetching tomorrow matches:', error);
    return [];
  }
}

function parseMatches(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const matches = [];
  
  // استخراج أساسي للمباريات
  const matchElements = doc.querySelectorAll('.match-item, .match-row');
  
  matchElements.forEach(match => {
    matches.push({
      homeTeam: match.querySelector('.home-team')?.textContent?.trim() || 'فريق 1',
      awayTeam: match.querySelector('.away-team')?.textContent?.trim() || 'فريق 2',
      time: match.querySelector('.time')?.textContent?.trim() || '--:--',
      score: match.querySelector('.score')?.textContent?.trim() || 'VS',
      channels: Array.from(match.querySelectorAll('.channel')).map(c => c.textContent.trim())
    });
  });
  
  return matches;
}
