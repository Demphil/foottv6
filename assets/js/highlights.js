import { fetchHighlights } from './highlights-api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        container: document.getElementById('highlights-container'),
        filter: document.getElementById('league-filter'),
        loading: document.getElementById('loading-indicator'),
        error: document.getElementById('error-display')
    };

    const showElement = (el) => el && (el.style.display = 'block');
    const hideElement = (el) => el && (el.style.display = 'none');

    const displayHighlights = (highlights) => {
        if (!elements.container || !highlights) return;

        if (!highlights.length) {
            elements.container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-info-circle"></i>
                    <p>لا توجد ملخصات متاحة حالياً</p>
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
                        <span>${match.date ? new Date(match.date).toLocaleDateString('ar-EG') : 'تاريخ غير معروف'}</span>
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

    const loadHighlights = async (league = '') => {
        try {
            showElement(elements.loading);
            hideElement(elements.error);
            
            const highlights = await fetchHighlights(league);
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
                showElement(elements.error);
                
                // إضافة معالج حدث للزر
                elements.error.querySelector('.retry-btn').addEventListener('click', () => {
                    loadHighlights(league);
                });
            }
        } finally {
            hideElement(elements.loading);
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
