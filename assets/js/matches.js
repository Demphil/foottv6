// استيراد دالة fetchMatches من api.js
import { fetchMatches } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // استخدام الدالة بعد التأكد من تحميل DOM
    fetchMatches(865927)  // رقم الدوري، مثلًا 865927
        .then(matches => {
            console.log(matches); // طباعة البيانات
        })
        .catch(error => {
            console.error('حدث خطأ:', error); // التعامل مع الخطأ
        });
});

document.addEventListener("DOMContentLoaded", async () => {
    const matchesContainer = document.getElementById('matches-container');

    if (!matchesContainer) {
        console.error('العنصر matches-container غير موجود.');
        return;
    }

    try {
        const matches = await fetchMatches(39); // مثل الدوري الإنجليزي كمثال
        matches.forEach(match => {
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';

            matchCard.innerHTML = `
                <h3>${match.teams.home.name} VS ${match.teams.away.name}</h3>
                <p>التاريخ: ${match.fixture.date.split('T')[0]}</p>
                <p>الساعة: ${new Date(match.fixture.date).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}</p>
                <p>الملعب: ${match.fixture.venue.name}</p>
            `;

            matchesContainer.appendChild(matchCard);
        });

    } catch (error) {
        matchesContainer.innerHTML = '<p class="error">تعذر تحميل المباريات</p>';
        console.error('Error loading matches:', error);
    }
});
