import fetchHighlights from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('highlights-container');
    
    // عنصر تحميل مؤقت
    container.innerHTML = '<div class="loading">جاري التحقق من البيانات...</div>';
    
    try {
        console.log('Fetching highlights...');
        const highlights = await fetchHighlights();
        console.log('Received highlights:', highlights);
        
        if (!highlights || highlights.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>لا توجد بيانات متاحة</p>
                    <small>تم استلام: ${JSON.stringify(highlights)}</small>
                </div>
            `;
            return;
        }
        
        // عرض البيانات إن وجدت
        container.innerHTML = highlights.map(match => `
            <div class="match">
                <h3>${match.homeTeam || 'فريق 1'} vs ${match.awayTeam || 'فريق 2'}</h3>
                <p>${match.competition || 'دوري غير معروف'}</p>
                ${match.embed ? `<iframe src="${match.embed}" frameborder="0"></iframe>` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Render Error:', error);
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-times-circle"></i>
                <p>فشل في عرض البيانات</p>
                <small>${error.message}</small>
            </div>
        `;
    }
});
