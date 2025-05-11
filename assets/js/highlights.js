import fetchHighlights from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('highlights-container');
    
    if (!container) {
        console.error('عنصر highlights-container غير موجود في الصفحة');
        return;
    }

    // عرض حالة التحميل
    container.innerHTML = '<div class="loading">جاري تحميل الملخصات...</div>';

    try {
        const highlights = await fetchHighlights();
        
        if (!highlights || !Array.isArray(highlights)) {
            throw new Error('تلقينا بيانات غير صالحة من السيرفر');
        }

        if (highlights.length === 0) {
            container.innerHTML = `
                <div class="no-highlights">
                    <i class="fas fa-info-circle"></i>
                    <p>لا توجد ملخصات متاحة حالياً</p>
                </div>
            `;
            return;
        }

        // عرض الملخصات
        container.innerHTML = highlights.map(match => {
            // التحقق من وجود البيانات المطلوبة
            if (!match.embed || !match.homeTeam || !match.awayTeam) {
                console.warn('بيانات ناقصة للمباراة:', match);
                return '';
            }
            
            return `
                <div class="highlight-card">
                    <h3>${match.homeTeam} vs ${match.awayTeam}</h3>
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
        console.error('حدث خطأ:', error);
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>حدث خطأ في تحميل الملخصات</p>
                <small>${error.message}</small>
            </div>
        `;
    }
});
