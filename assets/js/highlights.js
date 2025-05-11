import fetchHighlights from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('highlights-container');
    
    if (!container) {
        console.error('Container element not found');
        return;
    }

    container.innerHTML = '<div class="loading">جاري تحميل البيانات...</div>';

    try {
        const highlights = await fetchHighlights();
        
        if (!highlights || highlights.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-info-circle"></i>
                    <p>لا توجد ملخصات متاحة حالياً</p>
                </div>
            `;
            return;
        }

        container.innerHTML = highlights.map(match => `
            <div class="highlight-card">
                <h3>${match.homeTeam || 'فريق 1'} vs ${match.awayTeam || 'فريق 2'}</h3>
                <div class="video-container">
                    <iframe src="${match.embed}" 
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                            loading="lazy"></iframe>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>حدث خطأ في تحميل البيانات</p>
                <button onclick="window.location.reload()">إعادة المحاولة</button>
            </div>
        `;
    }
});
