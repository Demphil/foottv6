import fetchHighlights from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('highlights-container');
    
    // عرض حالة التحميل
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>جاري تحميل الملخصات...</p></div>';
    
    try {
        console.log('جاري جلب البيانات...');
        const highlights = await fetchHighlights();
        console.log('البيانات المستلمة:', highlights);
        
        if (!highlights || highlights.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-info-circle"></i>
                    <p>لا توجد ملخصات متاحة لليوم</p>
                    <small>جرب تاريخًا آخر أو تحقق لاحقًا</small>
                </div>
            `;
            return;
        }
        
        // عرض البيانات
        container.innerHTML = highlights.map(match => `
            <div class="highlight-card">
                <div class="match-header">
                    <h3>${match.homeTeam || 'فريق 1'} vs ${match.awayTeam || 'فريق 2'}</h3>
                    <div class="match-meta">
                        <span>${match.competition || 'دوري غير معروف'}</span>
                        <span>${new Date(match.date).toLocaleString('ar-MA')}</span>
                    </div>
                </div>
                <div class="video-container">
                    <iframe src="${match.embed}" 
                            frameborder="0" 
                            allowfullscreen
                            loading="lazy"></iframe>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>حدث خطأ</h3>
                <p>${error.message || 'تعذر تحميل البيانات'}</p>
                <button onclick="window.location.reload()">إعادة المحاولة</button>
            </div>
        `;
    }
});
