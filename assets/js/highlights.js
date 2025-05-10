import { fetchHighlights } from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        container: document.getElementById('highlights-container'),
        loading: document.getElementById('loading-indicator'),
        error: document.getElementById('error-display')
    };

    const formatDate = (dateString) => {
        const options = {
            timeZone: 'Africa/Casablanca',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleString('ar-MA', options);
    };

    const displayHighlights = (highlights) => {
        if (!elements.container) return;

        if (!highlights || highlights.length === 0) {
            elements.container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-info-circle"></i>
                    <p>لا توجد ملخصات متاحة لليوم</p>
                </div>
            `;
            return;
        }

        elements.container.innerHTML = highlights.map(match => `
            <div class="highlight-card">
                <div class="match-header">
                    <h3>${match.homeTeam || 'فريق 1'} vs ${match.awayTeam || 'فريق 2'}</h3>
                    <div class="match-meta">
                        <span>${match.competition || 'دوري غير معروف'}</span>
                        <span>${formatDate(match.date)}</span>
                    </div>
                </div>
                <div class="video-container">
                    <iframe src="${match.embed || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}" 
                            frameborder="0" 
                            allowfullscreen></iframe>
                </div>
            </div>
        `).join('');
    };

    const loadHighlights = async () => {
        try {
            if (elements.loading) elements.loading.style.display = 'block';
            if (elements.error) elements.error.style.display = 'none';
            
            // تحديد تاريخ 2025-05-10 كما طلبت
            const highlights = await fetchHighlights('2025-05-10');
            displayHighlights(highlights);
            
        } catch (error) {
            console.error('Error:', error);
            if (elements.error) {
                elements.error.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>حدث خطأ في جلب البيانات</p>
                        <small>${error.message}</small>
                    </div>
                `;
                elements.error.style.display = 'block';
            }
        } finally {
            if (elements.loading) elements.loading.style.display = 'none';
        }
    };

    // التحميل الأولي
    await loadHighlights();
});
