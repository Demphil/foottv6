// assets/js/news.js

document.addEventListener('DOMContentLoaded', () => {
    const newsList = document.getElementById('news-list');

    // أخبار وهمية، يمكنك لاحقاً ربطها بـ API أخبار رياضية حقيقية
    const newsData = [
        {
            title: "فوز الرجاء في مباراة مثيرة!",
            summary: "حقق الرجاء الرياضي فوزاً مثيراً ضد خصمه التقليدي بنتيجة 2-1 في مباراة شهدت إثارة كبيرة."
        },
        {
            title: "برشلونة يعزز صدارته للدوري الإسباني",
            summary: "حقق برشلونة انتصاراً مهماً خارج ملعبه ليواصل تربعه على قمة ترتيب الدوري الإسباني."
        },
        {
            title: "الهلال السعودي إلى نهائي دوري أبطال آسيا",
            summary: "تأهل الهلال السعودي إلى نهائي دوري أبطال آسيا بعد فوز رائع على نظيره الكوري."
        }
    ];

    function renderNews() {
        newsData.forEach(article => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item';

            newsItem.innerHTML = `
                <h2>${article.title}</h2>
                <p>${article.summary}</p>
            `;

            newsList.appendChild(newsItem);
        });
    }

    renderNews();
});
