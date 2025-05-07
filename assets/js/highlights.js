// ============== إعدادات التطبيق ============== //
const APP_CONFIG = {
  MAX_RETRIES: 2,
  REQUEST_TIMEOUT: 8000,
  FALLBACK_DATA: generateFallbackData()
};

// ============== مصادر البيانات ============== //
const DATA_SOURCES = [
  {
    name: 'الخادم الخلفي',
    url: '/api/highlights',
    headers: { 'Accept': 'application/json' }
  },
  {
    name: 'RapidAPI الاحتياطي',
    url: 'https://football-highlights-api.p.rapidapi.com/highlights',
    headers: {
      'X-RapidAPI-Key': '348a4368-8fcb-4e3e-ac4a-7fb6c214e22f',
      'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
    }
  }
];

// ============== التهيئة الرئيسية ============== //
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializeHighlights();
  } catch (error) {
    handleCriticalError(error);
  }
});

async function initializeHighlights() {
  showLoadingState();
  
  try {
    const highlights = await fetchHighlightsWithRetry();
    displayHighlights(highlights);
  } catch (error) {
    handleDataError(error);
    throw error;
  } finally {
    hideLoadingState();
  }
}

// ============== نظام جلب البيانات ============== //
async function fetchHighlightsWithRetry() {
  let lastError;
  
  for (let attempt = 0; attempt < APP_CONFIG.MAX_RETRIES; attempt++) {
    for (const source of DATA_SOURCES) {
      try {
        const response = await fetchWithTimeout(
          source.url,
          {
            method: 'GET',
            headers: source.headers
          },
          APP_CONFIG.REQUEST_TIMEOUT
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (validateHighlightsData(data)) {
          console.log(`Successfully fetched from ${source.name}`);
          return data;
        } else {
          throw new Error(`Invalid data structure from ${source.name}`);
        }
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed for ${source.name}:`, error);
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
      }
    }
  }
  
  throw lastError || new Error('All data sources failed');
}

function fetchWithTimeout(url, options, timeout) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

function validateHighlightsData(data) {
  return Array.isArray(data) && data.length > 0 && 
         data.every(item => item.id && item.video_url);
}

// ============== عرض البيانات ============== //
function displayHighlights(highlights) {
  const grid = document.getElementById('highlights-grid');
  
  if (!highlights || !highlights.length) {
    showEmptyState();
    return;
  }

  grid.innerHTML = highlights.map(highlight => `
    <div class="highlight-card" data-id="${highlight.id}">
      <div class="match-header">
        <span class="league ${getLeagueClass(highlight.league)}">
          ${highlight.league || 'دوري غير معروف'}
        </span>
        <span class="date">${formatArabicDate(highlight.date)}</span>
      </div>
      
      <div class="teams">
        <div class="team home">
          <img src="${highlight.home_team_logo || 'default-team.png'}" 
               alt="${highlight.home_team}"
               onerror="this.onerror=null;this.src='default-team.png'">
          <span>${highlight.home_team}</span>
        </div>
        
        <div class="score">
          ${highlight.home_score ?? '--'} : ${highlight.away_score ?? '--'}
        </div>
        
        <div class="team away">
          <img src="${highlight.away_team_logo || 'default-team.png'}" 
               alt="${highlight.away_team}"
               onerror="this.onerror=null;this.src='default-team.png'">
          <span>${highlight.away_team}</span>
        </div>
      </div>
      
      <div class="video-container">
        <iframe src="${getEmbedUrl(highlight.video_url)}" 
                frameborder="0" 
                allowfullscreen
                loading="lazy"></iframe>
      </div>
      
      <div class="match-actions">
        <button class="share-btn" onclick="shareHighlight('${highlight.id}')">
          <i class="fas fa-share"></i> مشاركة
        </button>
        <span class="duration">
          <i class="fas fa-clock"></i> ${highlight.duration || '--:--'}
        </span>
      </div>
    </div>
  `).join('');
}

// ============== معالجة الأخطاء ============== //
function handleDataError(error) {
  console.error('Data loading error:', error);
  
  if (error.message.includes('Request timeout')) {
    showError('مهلة الطلب', 'تجاوزت العملية الوقت المحدد');
  } else if (error.message.includes('HTTP error')) {
    showError('خطأ في الخادم', 'حدث خطأ أثناء جلب البيانات');
  } else {
    showError('خطأ غير متوقع', 'تعذر تحميل الملخصات');
  }
  
  displayHighlights(APP_CONFIG.FALLBACK_DATA);
}

function handleCriticalError(error) {
  console.error('Critical error:', error);
  document.getElementById('app-container').innerHTML = `
    <div class="critical-error">
      <h2>حدث خطأ جسيم</h2>
      <p>تعذر تحميل التطبيق بشكل صحيح</p>
      <button onclick="window.location.reload()">إعادة تحميل الصفحة</button>
    </div>
  `;
}

// ============== دوال مساعدة ============== //
function showLoadingState() {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('error-container').style.display = 'none';
}

function hideLoadingState() {
  document.getElementById('loading').style.display = 'none';
}

function showError(title, message) {
  const errorContainer = document.getElementById('error-container');
  errorContainer.innerHTML = `
    <div class="error-message">
      <h3><i class="fas fa-exclamation-triangle"></i> ${title}</h3>
      <p>${message}</p>
    </div>
  `;
  errorContainer.style.display = 'block';
}

function showEmptyState() {
  document.getElementById('highlights-grid').innerHTML = `
    <div class="empty-state">
      <i class="fas fa-tv"></i>
      <p>لا توجد ملخصات متاحة حالياً</p>
    </div>
  `;
}

function generateFallbackData() {
  const leagues = [
    'الدوري الإنجليزي', 'دوري الأبطال', 
    'الدوري السعودي', 'الدوري المصري'
  ];
  
  return leagues.map((league, index) => ({
    id: `fallback_${Date.now()}_${index}`,
    league: league,
    date: new Date().toISOString(),
    home_team: `فريق ${index + 1}`,
    away_team: `فريق ${index + 2}`,
    home_score: Math.floor(Math.random() * 4),
    away_score: Math.floor(Math.random() * 4),
    home_team_logo: 'default-team.png',
    away_team_logo: 'default-team.png',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: `${Math.floor(Math.random() * 10) + 5}:00`
  }));
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
      return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`;
    }
    
    return url;
  } catch {
    return url;
  }
}

function formatArabicDate(dateString) {
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Riyadh'
  };
  return new Date(dateString).toLocaleDateString('ar-SA', options);
}

function getLeagueClass(leagueName) {
  if (!leagueName) return '';
  
  const leagueClasses = {
    'الدوري الإنجليزي': 'premier-league',
    'دوري الأبطال': 'champions-league',
    'الدوري السعودي': 'saudi-league',
    'الدوري المصري': 'egyptian-league'
  };
  
  return leagueClasses[leagueName] || '';
}

// ============== الوظائف العامة ============== //
window.shareHighlight = function(highlightId) {
  if (navigator.share) {
    navigator.share({
      title: 'ملخص مباراة',
      text: 'شاهد ملخص المباراة على Football Highlights',
      url: `${window.location.origin}?highlight=${highlightId}`
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

// ============== تهيئة التطبيق ============== //
if (document.readyState === 'complete') {
  initializeHighlights().catch(handleCriticalError);
}
