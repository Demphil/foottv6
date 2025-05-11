import fetchHighlights from './highlights-api.js';

const createVideoEmbed = (url) => {
    if (!url) return null;
    
    // تحويل روابط يوتيوب لتنسيق embed إذا لزم الأمر
    if (url.includes('youtube.com/watch')) {
        const videoId = url.split('v=')[1].split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // إضافة تحويلات أخرى لمواقع الفيديو هنا
    return url;
};

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('highlights-container');
    if (!container) return;

    container.innerHTML = '<div class="loading">جاري تحميل المقاطع...</div>';

    try {
        const highlights = await fetchHighlights();
        console.log('Processed Highlights:', highlights);
        
        if (!highlights.length) {
            container.innerHTML = '<div class="no-data">لا توجد مباريات متاحة اليوم</div>';
            return;
        }

        container.innerHTML = highlights.map(match => {
            const embedUrl = createVideoEmbed(match.embed);
            
            if (!embedUrl) {
                return `
                    <div class="no-video">
                        <p>${match.homeTeam} vs ${match.awayTeam}</p>
                        <p>لا يتوفر رابط فيديو للمباراة</p>
                        ${match.competition ? `<p>${match.competition}</p>` : ''}
                    </div>
                `;
            }

            return `
                <div class="highlight-card">
                    <h3>${match.homeTeam} vs ${match.awayTeam}</h3>
                    ${match.competition ? `<p class="competition">${match.competition}</p>` : ''}
                    <div class="video-container">
                        <iframe src="${embedUrl}" 
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
                <p>حدث خطأ في تحميل المقاطع</p>
                <p>${error.message}</p>
                <button onclick="location.reload()">إعادة المحاولة</button>
            </div>
        `;
    }
});
