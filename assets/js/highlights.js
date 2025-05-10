import { fetchHighlights } from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        container: document.getElementById('highlights-container'),
        filter: document.getElementById('league-filter'),
        loading: document.getElementById('loading-indicator'),
        error: document.getElementById('error-display')
    };

    const displayHighlights = (highlights) => {
        if (!elements.container) return;

        if (!highlights || !highlights.length) {
            elements.container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-info-circle"></i>
                    <p>لا توجد ملخصات متاحة هذا الأسبوع</p>
                </div>
            `;
            return;
        }

        elements.container.innerHTML = highlights.map(match => {
            const matchDate = new Date(match.date);
            const options = { 
                timeZone: 'Africa/Casablanca',
                hour: '2-digit', 
                minute: '2-digit',
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            };
            const formattedDate = matchDate.toLocaleString('ar-MA', options);

            return `
                <div class="highlight-card">
                    <div class="match-header">
                        <h3>${match.homeTeam || 'فريق 1'} vs ${match.awayTeam || 'فريق 2'}</h3>
                        <div class="match-meta">
                            <span>${match.competition || 'دوري غير معروف'}</span>
                            <span>${formattedDate}</span>
                        </div>
                    </div>
                    <div class="video-container">
                        <iframe src="${match.embed || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}" 
                                frameborder="0" 
                                allowfullscreen></iframe>
                    </div>
                </div>
            `;
        }).join('');
    };

    const loadHighlights = async (league = '') => {
        try {
            if (elements.loading) elements.loading.style.display = 'block';
            if (elements.error) elements.error.style.display = 'none';
            
            // تحديد تاريخ 2025-05-10 كما طلبت
            const highlights = await fetchHighlights(league, '2025-05-10');
            displayHighlights(highlights);
            
        } catch (error) {
            console.error('Error:', error);
            if (elements.error) {
                elements.error.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>حدث خطأ في جلب البيانات</p>
                        <small>${error.message}</small>
                        <button class="retry-btn">إعادة المحاولة</button>
                    </div>
                `;
                elements.error.style.display = 'block';
                
                elements.error.querySelector('.retry-btn').addEventListener('click', () => {
                    loadHighlights(league);
                });
            }
        } finally {
            if (elements.loading) elements.loading.style.display = 'none';
        }
    };

    // معالجة تغيير الفلتر
    if (elements.filter) {
        elements.filter.addEventListener('change', (e) => {
            loadHighlights(e.target.value);
        });
    }

    // التحميل الأولي
    await loadHighlights();
});
