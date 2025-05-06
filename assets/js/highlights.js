// التهيئة الأساسية
document.addEventListener('DOMContentLoaded', () => {
    // تعيين سنة الفوتر
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // جلب الملخصات عند تحميل الصفحة
    fetchHighlights('all');
    
    // إضافة مستمع لتغيير الدوريات
    document.getElementById('league-select').addEventListener('change', (e) => {
        fetchHighlights(e.target.value);
    });
});

// دالة جلب الملخصات من API
async function fetchHighlights(league) {
    const loading = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');
    const grid = document.getElementById('highlights-grid');
    
    try {
        // إظهار حالة التحميل
        loading.style.display = 'flex';
        errorContainer.style.display = 'none';
        grid.innerHTML = '';
        
        // تحديد رابط API حسب الدوري المحدد
        let apiUrl = 'https://football-highlights-api.p.rapidapi.com/highlights';
        if (league !== 'all') {
            apiUrl += `/${getLeagueId(league)}`;
        }
        
        // إجراء طلب API
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': '348a4368-8fcb-4e3e-ac4a-7fb6c214e22f',
                'x-rapidapi-host': 'football-highlights-api.p.rapidapi.com'
            }
        });
        
        if (!response.ok) {
            throw new Error('فشل في جلب البيانات من السيرفر');
        }
        
        const data = await response.json();
        
        // عرض الملخصات
        displayHighlights(data);
        
    } catch (error) {
        console.error('حدث خطأ:', error);
        showError('حدث خطأ', 'تعذر تحميل الملخصات. يرجى المحاولة لاحقاً.');
    } finally {
        loading.style.display = 'none';
    }
}

// دالة تحويل اسم الدوري إلى ID
function getLeagueId(league) {
    const leagues = {
        'champions': 'champions-league',
        'premier': 'premier-league',
        'laliga': 'la-liga',
        'bundesliga': 'bundesliga',
        'seriea': 'serie-a',
        'ligue1': 'ligue-1',
        'saudi': 'saudi-league',
        'egypt': 'egyptian-league',
        'morocco': 'moroccan-league'
    };
    return leagues[league] || '';
}

// دالة عرض الملخصات
function displayHighlights(highlights) {
    const grid = document.getElementById('highlights-grid');
    
    if (!highlights || highlights.length === 0) {
        grid.innerHTML = '<div class="no-highlights">لا توجد ملخصات متاحة حالياً</div>';
        return;
    }
    
    grid.innerHTML = highlights.map(highlight => `
        <div class="highlight-card">
            <div class="highlight-header">
                <span class="league-badge ${highlight.league.toLowerCase().replace(' ', '-')}">
                    ${highlight.league}
                </span>
                <span class="match-date">${formatDate(highlight.date)}</span>
            </div>
            
            <div class="match-info">
                <div class="team home-team">
                    <img src="${highlight.home_team_logo || 'assets/images/default-team.png'}" 
                         alt="${highlight.home_team}" 
                         onerror="this.src='assets/images/default-team.png'">
                    <span>${highlight.home_team}</span>
                </div>
                
                <div class="match-score">
                    <span>${highlight.home_score || '0'} - ${highlight.away_score || '0'}</span>
                </div>
                
                <div class="team away-team">
                    <img src="${highlight.away_team_logo || 'assets/images/default-team.png'}" 
                         alt="${highlight.away_team}" 
                         onerror="this.src='assets/images/default-team.png'">
                    <span>${highlight.away_team}</span>
                </div>
            </div>
            
            <div class="highlight-video">
                <iframe src="${highlight.video_url}" 
                        frameborder="0" 
                        allowfullscreen
                        loading="lazy"></iframe>
            </div>
            
            <div class="highlight-footer">
                <span class="duration"><i class="fas fa-clock"></i> ${highlight.duration || 'غير معروف'}</span>
                <a href="${highlight.video_url}" target="_blank" class="watch-btn">
                    <i class="fas fa-external-link-alt"></i> مشاهدة في نافذة جديدة
                </a>
            </div>
        </div>
    `).join('');
}

// دالة تنسيق التاريخ
function formatDate(dateString) {
    const options = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('ar-SA', options);
}

// دالة عرض الأخطاء
function showError(title, message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `
        <div class="error-message">
            <h3><i class="fas fa-exclamation-triangle"></i> ${title}</h3>
            <p>${message}</p>
            <button onclick="window.location.reload()">إعادة المحاولة</button>
        </div>
    `;
    errorContainer.style.display = 'block';
}
