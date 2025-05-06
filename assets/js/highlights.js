 // تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initHighlights();
    } catch (error) {
        console.error('خطأ في التهيئة:', error);
        showError('خطأ فني', 'تعذر تحميل التطبيق');
        loadFallbackData();
    }
});

// الدالة الرئيسية لتحميل الملخصات
async function initHighlights() {
    const loading = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');
    const grid = document.getElementById('highlights-grid');
    
    // إظهار حالة التحميل
    showLoadingState(loading, errorContainer, grid);
    
    try {
        // المحاولة مع الخادم الخلفي أولاً
        const highlights = await fetchHighlightsWithFallback();
        displayHighlights(highlights);
        
    } catch (error) {
        handleFetchError(error);
        throw error; // إعادة رمي الخطأ للدالة الرئيسية
    } finally {
        loading.style.display = 'none';
    }
}

// دالة محسنة لجلب الملخصات مع نظام Fallback
async function fetchHighlightsWithFallback() {
    try {
        // المحاولة الأولى: الخادم الخلفي
        const response = await fetchWithTimeout('assets/js/highlights.api.js', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }, 5000);
        
        if (!response.ok) {
            throw new Error(`خطأ في السيرفر: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (primaryError) {
        console.warn('فشل المصدر الأساسي، جرب المصدر الاحتياطي:', primaryError);
        
        // المحاولة الثانية: API مباشر
        try {
            const directResponse = await fetchWithTimeout('https://soccer.highlightly.net/highlights', {
                mode: 'cors',
                headers: { 'Accept': 'application/json' }
            }, 3000);
            
            if (!directResponse.ok) throw new Error('فشل المصدر الاحتياطي');
            
            return await directResponse.json();
            
        } catch (fallbackError) {
            console.error('فشل جميع المصادر:', fallbackError);
            throw new Error('تعذر الاتصال بجميع مصادر البيانات');
        }
    }
}

// دالة لعرض الملخصات
function displayHighlights(highlights) {
    const grid = document.getElementById('highlights-grid');
    
    if (!highlights || !highlights.length) {
        grid.innerHTML = `
            <div class="no-highlights">
                <i class="fas fa-exclamation-circle"></i>
                <p>لا توجد ملخصات متاحة حالياً</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = highlights.map(highlight => `
        <div class="highlight-card" data-id="${highlight.id}">
            <div class="match-header">
                <span class="league-badge ${getLeagueClass(highlight.league)}">
                    ${highlight.league || 'دوري غير معروف'}
                </span>
                <span class="match-date">${formatDate(highlight.date)}</span>
            </div>
            
            <div class="teams">
                <div class="team home-team">
                    <img src="${highlight.home_team_logo || 'default-team.png'}" 
                         alt="${highlight.home_team}" 
                         onerror="this.src='default-team.png'">
                    <span>${highlight.home_team}</span>
                </div>
                
                <div class="match-score">
                    ${highlight.home_score ?? '-'} - ${highlight.away_score ?? '-'}
                </div>
                
                <div class="team away-team">
                    <img src="${highlight.away_team_logo || 'default-team.png'}" 
                         alt="${highlight.away_team}" 
                         onerror="this.src='default-team.png'">
                    <span>${highlight.away_team}</span>
                </div>
            </div>
            
            <div class="video-container">
                <iframe src="${getEmbedUrl(highlight.video_url)}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen></iframe>
            </div>
            
            <div class="match-footer">
                <span class="duration">
                    <i class="fas fa-clock"></i> ${highlight.duration || '--:--'}
                </span>
                <button class="share-btn" onclick="shareHighlight('${highlight.id}')">
                    <i class="fas fa-share-alt"></i> مشاركة
                </button>
            </div>
        </div>
    `).join('');
}

// دوال مساعدة
function fetchWithTimeout(url, options = {}, timeout = 8000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('مهلة الطلب انتهت')), timeout)
        )
    ]);
}

function showLoadingState(loading, errorContainer, grid) {
    loading.style.display = 'flex';
    errorContainer.style.display = 'none';
    grid.innerHTML = '';
}

function handleFetchError(error) {
    console.error('فشل جلب البيانات:', error);
    
    if (error.message.includes('مهلة الطلب')) {
        showError('مهلة الطلب', 'استغرقت العملية وقتًا أطول من المتوقع');
    } else if (error.message.includes('Failed to fetch')) {
        showError('خطأ في الاتصال', 'تعذر الاتصال بالخادم');
    } else {
        showError('خطأ في البيانات', 'تعذر تحميل الملخصات');
    }
}

function showError(title, message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `
        <div class="error-message">
            <h3><i class="fas fa-exclamation-triangle"></i> ${title}</h3>
            <p>${message}</p>
            <button class="retry-btn" onclick="window.location.reload()">
                <i class="fas fa-sync-alt"></i> إعادة المحاولة
            </button>
        </div>
    `;
    errorContainer.style.display = 'block';
}

function loadFallbackData() {
    const fallbackData = [
        {
            id: 'fallback1',
            league: 'الدوري الإنجليزي',
            date: new Date().toISOString(),
            home_team: 'مانشستر يونايتد',
            away_team: 'ليفربول',
            home_score: 2,
            away_score: 1,
            home_team_logo: 'manutd.png',
            away_team_logo: 'liverpool.png',
            video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: '10:30'
        },
        {
            id: 'fallback2',
            league: 'دوري الأبطال',
            date: new Date().toISOString(),
            home_team: 'ريال مدريد',
            away_team: 'بايرن ميونخ',
            home_score: 3,
            away_score: 2,
            home_team_logo: 'realmadrid.png',
            away_team_logo: 'bayern.png',
            video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: '12:45'
        }
    ];
    
    displayHighlights(fallbackData);
}

function getEmbedUrl(url) {
    if (!url) return '';
    
    try {
        const urlObj = new URL(url);
        
        // معالجة روابط YouTube
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
            const videoId = urlObj.hostname.includes('youtu.be') 
                ? urlObj.pathname.slice(1)
                : urlObj.searchParams.get('v');
            return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
        }
        
        // معالجة روابط Dailymotion
        if (urlObj.hostname.includes('dailymotion.com')) {
            const videoId = urlObj.pathname.split('/')[2] || '';
            return `https://www.dailymotion.com/embed/video/${videoId}`;
        }
        
        return url;
    } catch {
        return url;
    }
}

function formatDate(dateString) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('ar-SA', options);
}

function getLeagueClass(leagueName) {
    if (!leagueName) return '';
    
    const leagues = {
        'الدوري الإنجليزي': 'premier-league',
        'دوري الأبطال': 'champions-league',
        'الدوري السعودي': 'saudi-league',
        'الدوري المصري': 'egyptian-league',
        'الدوري المغربي': 'moroccan-league'
    };
    
    return leagues[leagueName] || '';
}

// دالة لمشاركة المباراة
window.shareHighlight = function(highlightId) {
    const highlightCard = document.querySelector(`.highlight-card[data-id="${highlightId}"]`);
    const matchTitle = highlightCard.querySelector('.teams').textContent.trim();
    
    if (navigator.share) {
        navigator.share({
            title: `ملخص مباراة ${matchTitle}`,
            text: 'شاهد ملخص المباراة على Football Highlights',
            url: window.location.href
        }).catch(err => {
            console.log('فشل المشاركة:', err);
            showShareFallback(highlightId);
        });
    } else {
        showShareFallback(highlightId);
    }
};

function showShareFallback(highlightId) {
    const shareUrl = `${window.location.origin}?highlight=${highlightId}`;
    prompt('انسخ الرابط للمشاركة:', shareUrl);
}
