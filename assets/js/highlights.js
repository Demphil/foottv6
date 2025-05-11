import fetchHighlights from './highlights-api.js';

// دالة محسنة للتحقق من الروابط مع تسجيل الأخطاء
const validateUrl = (url) => {
    if (!url) {
        console.warn('الرابط غير موجود');
        return false;
    }
    
    if (typeof url !== 'string') {
        console.warn('نوع الرابط غير صحيح:', typeof url, 'القيمة:', url);
        return false;
    }
    
    const trimmedUrl = url.trim();
    if (trimmedUrl.includes('undefined') || !trimmedUrl.startsWith('http')) {
        console.warn('صيغة الرابط غير صالحة:', trimmedUrl);
        return false;
    }
    
    return true;
};

// دالة لإنشاء بطاقة المباراة
const createMatchCard = (match) => {
    if (!match.embed || !validateUrl(match.embed)) {
        return `
            <div class="no-video">
                <i class="fas fa-video-slash"></i>
                <p>لا يتوفر رابط فيديو للمباراة</p>
                <p>${match.homeTeam} vs ${match.awayTeam}</p>
                ${match.competition ? `<p class="competition">${match.competition}</p>` : ''}
            </div>
        `;
    }
    
    return `
        <div class="highlight-card">
            <h3>${match.homeTeam} vs ${match.awayTeam}</h3>
            ${match.competition ? `<p class="competition">${match.competition}</p>` : ''}
            <div class="video-container">
                <iframe src="${match.embed}" 
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                        loading="lazy"></iframe>
            </div>
        </div>
    `;
};

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('highlights-container');
    if (!container) {
        console.error('عنصر highlights-container غير موجود في DOM');
        return;
    }

    // إضافة حالة تحميل
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> جاري تحميل المقاطع...</div>';

    try {
        const highlights = await fetchHighlights();
        
        if (!Array.isArray(highlights)) {
            throw new Error('تلقينا بيانات غير صالحة من السيرفر - النتيجة ليست مصفوفة');
        }

        if (highlights.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-info-circle"></i>
                    <p>لا توجد مباريات متاحة اليوم</p>
                </div>
            `;
            return;
        }

        container.innerHTML = highlights.map(createMatchCard).join('');

    } catch (error) {
        console.error('Error Details:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>حدث خطأ في تحميل البيانات</p>
                <small>${error.message}</small>
                <button onclick="window.location.reload()">إعادة المحاولة</button>
            </div>
        `;
    }
});
