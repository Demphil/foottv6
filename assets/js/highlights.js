import fetchHighlights from './highlights-api.js';

const createVideoFrame = (url) => {
    if (!url) return '<p class="no-video-message">لا يتوفر فيديو للمباراة</p>';
    
    try {
        new URL(url); // التحقق من أن الرابط صحيح
        return `
            <div class="video-container">
                <iframe src="${url}" 
                        frameborder="0"
                        allowfullscreen
                        loading="lazy"></iframe>
            </div>
        `;
    } catch (e) {
        console.warn('رابط الفيديو غير صالح:', url);
        return '<p class="invalid-video">رابط الفيديو غير صالح</p>';
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('highlights-container');
    if (!container) {
        console.error('عنصر العرض غير موجود في الصفحة');
        return;
    }

    container.innerHTML = '<div class="loading">جاري تحميل المقاطع...</div>';

    try {
        const highlights = await fetchHighlights();
        console.log('البيانات المستلمة:', highlights);
        
        if (!highlights || !highlights.length) {
            container.innerHTML = '<div class="no-data">لا توجد مباريات متاحة اليوم</div>';
            return;
        }

        container.innerHTML = highlights.map(match => `
            <div class="match-card">
                <h3>${match.homeTeam} vs ${match.awayTeam}</h3>
                ${match.competition ? `<p class="competition">${match.competition}</p>` : ''}
                ${createVideoFrame(match.embed)}
            </div>
        `).join('');

    } catch (error) {
        console.error('حدث خطأ:', error);
        container.innerHTML = `
            <div class="error">
                <p>فشل في تحميل البيانات</p>
                <p>${error.message}</p>
                <button class="retry-btn" onclick="window.location.reload()">إعادة المحاولة</button>
            </div>
        `;
    }
});
