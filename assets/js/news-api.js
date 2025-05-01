// news-api.js

const apikey = 'c3043545e8b02be6502326236791500f';
category = 'general';
url = 'https://gnews.io/api/v4/top-headlines?category=' + category + '&lang=en&country=us&max=10&apikey=' + apikey;

fetch(url)
  .then(function (response) {
    return response.json();
  })
  .then(function (data) {
    articles = data.articles;

    for (i = 0; i < articles.length; i++) {
      // articles[i].title
      console.log("Title: " + articles[i]['title']);
      // articles[i].description
      console.log("Description: " + articles[i]['description']);
      // You can replace {property} below with any of the article properties returned by the API.
      // articles[i].{property}
      // console.log(articles[i]['{property}']);

      // Delete this line to display all the articles returned by the request. Currently only the first article is displayed.
      break;
    }
  });;
const category = 'general'; // يمكنك تغيير الفئة حسب الحاجة
const url = `https://gnews.io/api/v4/top-headlines?category=${category}&lang=en&country=us&max=10&apikey=${apikey}`;

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
