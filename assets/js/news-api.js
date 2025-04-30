// news-api.js

const API_KEY = '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556'; // استبدل بمفتاحك
const API_HOST = 'sport-highlights-api.p.rapidapi.com';
const BASE_URL = 'https://sport-highlights-api.p.rapidapi.com/football/highlights/%7Bid%7D';

// معرفات البطولات المطلوبة
const leagues = [
  { id: 2, name: 'دوري أبطال أوروبا' },       // UEFA Champions League
  { id: 140, name: 'الدوري الإسباني' },        // La Liga
  { id: 135, name: 'الدوري الإيطالي' },        // Serie A
  { id: 61, name: 'الدوري الفرنسي' },          // Ligue 1
  { id: 78, name: 'الدوري الألماني' },         // Bundesliga
  { id: 307, name: 'الدوري السعودي' }          // Saudi Pro League
];

/**
 * تحويل التاريخ إلى تنسيق YYYY-MM-DD
 */
function formatDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * جلب فيديوهات الملخصات لعدة بطولات
 * @returns {Promise<Array>} مصفوفة من الفيديوهات
 */
export async function fetchBreakingNews(countryCode, count)  {
  const date = formatDate(); // تاريخ اليوم
  const headers = {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': API_HOST,
  };

  try {
    const requests = leagues.map(async (league) => {
      const url = new URL(BASE_URL);
      url.searchParams.append('leagueId', league.id);
      url.searchParams.append('date', date);
      url.searchParams.append('limit', 10);
      url.searchParams.append('timezone', 'Etc/UTC');

      const res = await fetch(url.toString(), { headers });

      if (!res.ok) {
        console.warn(`فشل في جلب الفيديوهات من ${league.name}: ${res.status}`);
        return [];
      }

      const data = await res.json();
      return (data.response || []).map(item => ({
        title: item.title,
        thumbnail: item.thumbnail || '',
        videoUrl: item.video,
        publishedAt: formatApiDate(item.date),
        league: league.name
      }));
    });

    const allResults = await Promise.all(requests);
    return allResults.flat();
  } catch (error) {
    console.error('فشل جلب فيديوهات الملخصات:', error);
    throw error;
  }
}

/**
 * تنسيق تاريخ API إلى YYYY/MM/DD
 */
function formatApiDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  } catch (err) {
    return '';
  }
}
