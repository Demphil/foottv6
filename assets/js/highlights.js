document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('highlights-container');
    if (!container) return;

    // إضافة حالة تحميل
    container.innerHTML = '<div class="loading">جاري تحميل البيانات...</div>';

    try {
        const highlights = await fetchHighlights();
        console.log('Received data:', highlights); // تسجيل البيانات المستلمة

        if (!Array.isArray(highlights)) {
            throw new Error('البيانات المستلمة ليست مصفوفة');
        }

        container.innerHTML = highlights.map(match => {
            // تسجيل كل مباراة للفحص
            console.log('Processing match:', match);
            
            // التحقق من وجود الخصائص الأساسية
            const home = match.homeTeam || 'فريق غير معروف';
            const away = match.awayTeam || 'فريق غير معروف';
            const embed = match.embed || '';
            
            if (!embed || !validateUrl(embed)) {
                return `
                    <div class="no-video">
                        <p>${home} vs ${away}</p>
                        <p>لا يتوفر رابط فيديو للمباراة</p>
                    </div>
                `;
            }
            
            return `
                <div class="highlight-card">
                    <h3>${home} vs ${away}</h3>
                    <div class="video-container">
                        <iframe src="${embed}"></iframe>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error details:', error);
        container.innerHTML = `
            <div class="error">
                <p>حدث خطأ في تحميل البيانات</p>
                <p>${error.message}</p>
            </div>
        `;
    }
});
