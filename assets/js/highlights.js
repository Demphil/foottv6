import fetchHighlights from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('highlights-container');
    if (!container) return;

    // التحقق من جميع الروابط قبل استخدامها
    const validateUrl = (url) => {
        if (!url || url.includes('undefined')) {
            console.error('رابط غير صالح:', url);
            return false;
        }
        return true;
    };

    try {
        const highlights = await fetchHighlights();
        
        container.innerHTML = highlights.map(match => {
            if (!validateUrl(match.embed)) {
                return `<div class="error">رابط الفيديو غير متاح</div>`;
            }
            
            return `
                <div class="highlight-card">
                    <h3>${match.homeTeam || 'فريق 1'} vs ${match.awayTeam || 'فريق 2'}</h3>
                    <div class="video-container">
                        <iframe src="${match.embed}" 
                                frameborder="0"
                                allowfullscreen
                                loading="lazy"></iframe>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `<div class="error">حدث خطأ في تحميل البيانات</div>`;
    }
});
