// news-api.js

const apikey = '320e688cfb9682d071750f4212f83753';
const category = 'general'; // يمكنك تغيير الفئة حسب الحاجة
const url = `https://gnews.io/api/v4/top-headlines?sports=general&apikey=320e688cfb9682d071750f4212f83753`;

async function fetchNews() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.articles;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

export default fetchNews;
