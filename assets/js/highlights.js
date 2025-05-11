import fetchHighlights from './highlights-api.js';

// تأكد من أن جميع عناصر DOM موجودة قبل استخدامها
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('highlights-container');
    if (!container) return;

    // عرض حالة التحميل
    container.innerHTML = '<div class="loading">جاري التحميل...</div>';

    try {
        const highlights = await fetchHighlights();
        
        // التحقق من وجود البيانات
        if (!highlights || !Array.isArray(highlights) {
            throw new Error('هيكل بيانات غير صحيح من API');
        }

        // عرض البيانات
        container.innerHTML = highlights.map(match => {
            // التحقق من وجود رابط الفيديو
            const videoUrl = match.embed || match.videoUrl;
            if (!videoUrl) {
                console.warn('مباراة بدون رابط فيديو:', match);
                return '';
            }

            return `
                <div class="match-card">
                    <h3>${match.homeTeam || 'فريق 1'} vs ${match.awayTeam || 'فريق 2'}</h3>
                    <div class="video-container">
                        <iframe src="${videoUrl}" 
                                frameborder="0"
                                allowfullscreen
                                loading="lazy"></iframe>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('حدث خطأ:', error);
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>حدث خطأ في تحميل البيانات</p>
            </div>
        `;
    }
});
const fetchHighlights = async () => {
    try {
        const response = await fetch('https://football-highlights-api.p.rapidapi.com/matches', {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
                'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
            }
        });

        if (!response.ok) {
            throw new Error(`خطأ في API: ${response.status}`);
        }

        const data = await response.json();
        return data.data || []; // تأكد من إرجاع مصفوفة

    } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        return []; // إرجاع مصفوفة فارغة بدلاً من undefined
    }
};

export default fetchHighlights;
