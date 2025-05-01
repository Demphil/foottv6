import { fetchBreakingNews } from './news-api.js';

// عناصر DOM مع التحقق من وجودها
const breakingNewsContainer = document.getElementById('breaking-news');

// كلمات مفتاحية للرياضة العالمية والعربية
const keywords = [
  "كرة القدم", "رياضة", "المنتخب المغربي", "الوداد", "الرجاء",
  "الدوري السعودي", "الدوري المصري", "الدوري الإسباني", "Cristiano Ronaldo", "Messi", "Champions League"
];

// استدعاء الأخبار من GNews API
async function fetchBreakingNews() {
  try {
    const response = await fetch(`https://gnews.io/api/v4/search?q=${keywords.join(" OR ")}&lang=ar&country=ma&max=10&apikey=320e688cfb9682d071750f4212f83753`);
    const data = await response.json();

    displayBreakingNews(data.articles);
  } catch (error) {
    breakingNewsContainer.innerHTML = `<p style="color: red;">فشل تحميل الأخبار العاجلة.</p>`;
    console.error("حدث خطأ:", error);
  }
}
