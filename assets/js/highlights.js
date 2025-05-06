// إصدار معدل مع حلول CORS
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadHighlights();
    } catch (error) {
        console.error('حدث خطأ:', error);
        showError('خطأ في النظام', 'تعذر تحميل الملخصات');
        loadFallbackData();
    }
});

async function loadHighlights() {
    const loading = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');
    const grid = document.getElementById('highlights-grid');
    
    loading.style.display = 'flex';
    errorContainer.style.display = 'none';
    grid.innerHTML = '';
    
    // 1. محاولة استخدام CORS Proxy
    try {
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const apiUrl = encodeURIComponent('https://soccer.highlightly.net/highlights');
        
        const response = await fetch(`${proxyUrl}${apiUrl}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) throw new Error('فشل في جلب البيانات عبر الوكيل');
        
        const data = await response.json();
        const highlights = JSON.parse(data.contents);
        
        displayHighlights(highlights);
        return;
    } catch (proxyError) {
        console.log('فشل الوكيل، جرب الطريقة المباشرة:', proxyError);
    }
    
    // 2. المحاولة المباشرة مع CORS
    try {
        const response = await fetch('https://soccer.highlightly.net/highlights', {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                // تم إزالة الرؤوس غير المسموح بها
            }
        });
        
        if (!response.ok) throw new Error(`خطأ في السيرفر: ${response.status}`);
        
        const highlights = await response.json();
        displayHighlights(highlights);
        
    } catch (directError) {
        console.error('فشل الطلب المباشر:', directError);
        throw directError;
    }
}

// دالة لعرض البيانات
function displayHighlights(highlights) {
    const grid = document.getElementById('highlights-grid');
    
    if (!highlights || !highlights.length) {
        grid.innerHTML = '<div class="no-data">لا توجد ملخصات متاحة حالياً</div>';
        return;
    }
    
    grid.innerHTML = highlights.map(highlight => `
        <div class="highlight-card">
            <div class="league-info">
                <img src="${highlight.league_logo || 'default-league.png'}" 
                     alt="${highlight.league_name}">
                <span>${highlight.league_name}</span>
            </div>
            <div class="match-info">
                <div class="team home">
                    <img src="${highlight.home_team_logo || 'default-team.png'}" 
                         alt="${highlight.home_team}">
                    <span>${highlight.home_team}</span>
                </div>
                <div class="score">
                    ${highlight.home_score || 0} - ${highlight.away_score || 0}
                </div>
                <div class="team away">
                    <img src="${highlight.away_team_logo || 'default-team.png'}" 
                         alt="${highlight.away_team}">
                    <span>${highlight.away_team}</span>
                </div>
            </div>
            <div class="video-container">
                <iframe src="${getEmbedUrl(highlight.video_url)}" 
                        frameborder="0" 
                        allowfullscreen></iframe>
            </div>
            <div class="match-meta">
                <span class="date">${formatDate(highlight.date)}</span>
                <span class="duration">${highlight.duration || '--:--'}</span>
            </div>
        </div>
    `).join('');
}

// دوال مساعدة
function getEmbedUrl(url) {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com')) {
            const videoId = urlObj.searchParams.get('v');
            return `https://www.youtube.com/embed/${videoId}`;
        }
        return url;
    } catch {
        return url;
    }
}

function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('ar-SA', options);
}

function loadFallbackData() {
    const fallbackData = [
        {
            league_name: "الدوري الإنجليزي",
            league_logo: "premier-league.png",
            home_team: "أرسنال",
            away_team: "تشيلسي",
            home_score: 2,
            away_score: 1,
            home_team_logo: "arsenal.png",
            away_team_logo: "chelsea.png",
            video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            date: new Date().toISOString(),
            duration: "10:30"
        }
    ];
    displayHighlights(fallbackData);
}

function showError(title, message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `
        <div class="error-message">
            <h3>${title}</h3>
            <p>${message}</p>
            <button onclick="window.location.reload()">إعادة المحاولة</button>
        </div>
    `;
    errorContainer.style.display = 'block';
}
