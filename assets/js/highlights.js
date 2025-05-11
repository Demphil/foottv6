import fetchHighlights from './highlights-api.js';

// دالة محسنة للتحقق من الروابط
const validateUrl = (url) => {
    if (!url) {
        console.warn('الرابط غير موجود');
        return false;
    }
    
    if (typeof url !== 'string') {
        console.warn('نوع الرابط غير صحيح:', typeof url);
        return false;
    }
    
    if (url.includes('undefined') || !url.startsWith('http')) {
        console.warn('صيغة الرابط غير صالحة:', url);
        return false;
    }
    
    return true;
};

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('highlights-container');
    if (!container) return;

    try {
        const highlights = await fetchHighlights();
        
        if (!highlights || !Array.isArray(highlights)) {
            throw new Error('تلقينا بيانات غير صالحة من السيرفر');
        }

        container.innerHTML = highlights.map(match => {
            // معالجة حالة عدم وجود رابط الفيديو
            if (!match.embed || !validateUrl(match.embed)) {
                return `
                    <div class="no-video">
                        <i class="fas fa-video-slash"></i>
                        <p>لا يتوفر رابط فيديو للمباراة</p>
                        <p>${match.homeTeam || 'فريق 1'} vs ${match.awayTeam || 'فريق 2'}</p>
                    </div>
                `;
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
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>حدث خطأ في تحميل البيانات</p>
                <small>${error.message}</small>
            </div>
        `;
    }
});
