import { fetchMatches } from './api.js';

// 1. إعدادات التطبيق
const CONFIG = {
  CACHE_DURATION: 12 * 60 * 60 * 1000, // 12 ساعة
  CACHE_KEY: 'football-matches-cache-v8',
  FEATURED_LEAGUES: [2, 39, 140, 135], // دوري الأبطال، الدوري الإنجليزي، الليغا، السيريا أ
  SLIDER_INTERVAL: 20000, // 20 ثانية
  MAX_BROADCAST_MATCHES: 5,
  ARABIC_CHANNELS: {
    'bein-sports-hd1': 'bein SPORTS HD1',
    'bein-sports-hd2': 'bein SPORTS HD2',
    'bein-sports-hd3': 'bein SPORTS HD3',
    'ssc-1': 'SSC 1',
    'ssc-2': 'SSC 2',
    'on-time-sports': 'On Time Sports',
    'al-kass': 'Alkass'
  },
  TIMEZONE: 'Africa/Casablanca',
  CHANNEL_URL_MAP: {
    'bein SPORTS HD1': 'bein-sports-hd1',
    'bein SPORTS HD2': 'bein-sports-hd2',
    'bein SPORTS HD3': 'bein-sports-hd3',
    'SSC 1': 'ssc-1',
    'SSC 2': 'ssc-2',
    'On Time Sports': 'on-time-sports',
    'Alkass': 'al-kass',
    'Arryadia': 'arryadia-sdhd'
  }
};

// 2. عناصر DOM
const DOM = {
  loading: document.getElementById('loading'),
  errorContainer: document.getElementById('error-container'),
  featuredContainer: document.getElementById('featured-matches'),
  broadcastContainer: document.getElementById('broadcast-matches'),
  todayContainer: document.getElementById('today-matches'),
  tomorrowContainer: document.getElementById('tomorrow-matches'),
  upcomingContainer: document.getElementById('upcoming-matches'),
  tabButtons: document.querySelectorAll('.tab-btn'),
  sliderDots: document.querySelector('.slider-dots'),
  prevBtn: document.querySelector('.slider-prev'),
  nextBtn: document.querySelector('.slider-next'),
  contentContainer: document.getElementById('content-container')
};

// 3. حالة التطبيق
let appState = {
  currentTab: 'today',
  sliderInterval: null,
  currentSlide: 0,
  matchesData: null
};

// 4. الدوال المساعدة
function renderBroadcastInfo(status) {
  if (status.noData) {
    return `
      <div class="broadcast-info no-data">
        <i class="fas fa-info-circle"></i>
        <span>لا توجد بيانات بث</span>
      </div>
    `;
  }
  
  if (status.available) {
    return `
      <div class="broadcast-info available">
        <i class="fas fa-satellite-dish"></i>
        <span>${status.allChannels.join(' - ')}</span>
      </div>
    `;
  }
  
  return `
    <div class="broadcast-info not-available">
      <i class="fas fa-exclamation-triangle"></i>
      <span>غير متاح على القنوات العربية</span>
    </div>
  `;
}

function getBroadcastStatus(channels) {
  const arabicChannels = getArabicBroadcasters(channels);
  const hasChannels = channels?.length > 0;
  const hasArabicChannels = arabicChannels.length > 0;
  
  return {
    available: hasArabicChannels,
    channel: hasArabicChannels ? arabicChannels[0] : null,
    allChannels: arabicChannels,
    noData: !hasChannels,
    buttonText: hasArabicChannels ? 'مشاهدة' : 
               hasChannels ? 'غير متاح' : 'لا يوجد بث'
  };
}

function getArabicBroadcasters(channels) {
  if (!Array.isArray(channels)) return [];
  
  return channels
    .filter(ch => ch && typeof ch === 'string')
    .filter(ch => Object.values(CONFIG.ARABIC_CHANNELS).includes(ch));
}

function formatDate(dateStr) {
  const options = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: CONFIG.TIMEZONE
  };
  return new Date(dateStr).toLocaleDateString('ar-MA', options);
}

function formatKickoffTime(dateString) {
  const options = { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: CONFIG.TIMEZONE
  };
  return new Date(dateString).toLocaleTimeString('ar-MA', options);
}

// 5. عرض المباريات المنقولة (مع الإصلاحات)
function renderBroadcastMatches(matches) {
  if (!matches || !matches.length) {
    DOM.broadcastContainer.innerHTML = `
      <div class="no-matches">
        <i class="fas fa-tv"></i>
        <p>لا توجد مباريات منقولة حالياً</p>
      </div>
    `;
    return;
  }

  // تصفية المباريات التي لها قنوات بث
  const broadcastMatches = matches.filter(match => {
    return match.tv_channels && match.tv_channels.length > 0;
  });

  if (!broadcastMatches.length) {
    DOM.broadcastContainer.innerHTML = `
      <div class="no-matches">
        <i class="fas fa-tv"></i>
        <p>لا توجد مباريات منقولة حالياً</p>
      </div>
    `;
    return;
  }

  DOM.broadcastContainer.innerHTML = broadcastMatches.slice(0, CONFIG.MAX_BROADCAST_MATCHES).map(match => {
    const broadcastStatus = getBroadcastStatus(match.tv_channels);
    const firstChannel = broadcastStatus.available ? broadcastStatus.allChannels[0] : null;
    
    return `
      <div class="broadcast-card" data-id="${match.fixture.id}">
        <div class="teams">
          <div class="team">
            <img data-src="${match.teams.home.logo}" 
                 alt="${match.teams.home.name}" 
                 loading="lazy"
                 onerror="this.src='assets/images/default-team.png'">
            <span>${match.teams.home.name}</span>
          </div>
          <div class="match-time">
            <span class="vs">VS</span>
            <time datetime="${match.fixture.date}">${formatKickoffTime(match.fixture.date)}</time>
          </div>
          <div class="team">
            <img data-src="${match.teams.away.logo}" 
                 alt="${match.teams.away.name}" 
                 loading="lazy"
                 onerror="this.src='assets/images/default-team.png'">
            <span>${match.teams.away.name}</span>
          </div>
        </div>
        
        ${renderBroadcastInfo(broadcastStatus)}
        
        <div class="match-info">
          <span class="league-info">
            <img data-src="${match.league.logo}" 
                 alt="${match.league.name}"
                 loading="lazy"
                 onerror="this.src='assets/images/default-league.png'">
            ${match.league.name}
          </span>
          <span class="match-venue">
            <i class="fas fa-map-marker-alt"></i>
            ${match.fixture.venue?.name || 'ملعب غير معروف'}
          </span>
        </div>
        <button class="watch-btn" 
                data-match-id="${match.fixture.id}"
                data-channel="${firstChannel || ''}"
                ${broadcastStatus.available ? '' : 'disabled'}
                aria-label="مشاهدة مباراة ${match.teams.home.name} ضد ${match.teams.away.name}">
          <i class="fas fa-play"></i> ${broadcastStatus.buttonText}
        </button>
      </div>
    `;
  }).join('');

  setupWatchButtons();
}

// 6. بقية الدوال الأساسية
function setupWatchButtons() {
  document.querySelectorAll('.watch-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const matchId = this.dataset.matchId;
      const channelName = this.dataset.channel;
      
      if (!matchId) {
        showToast('معرّف المباراة غير موجود', 'error');
        return;
      }
      
      if (!channelName || channelName === 'undefined') {
        showToast('لا توجد قناة متاحة للبث المباشر', 'error');
        return;
      }
      
      redirectToWatchPage(matchId, channelName);
    });
  });
}

function redirectToWatchPage(matchId, channelName) {
  if (!matchId || !channelName) {
    console.error('Missing parameters for watch page:', { matchId, channelName });
    return;
  }

  const channelKey = CONFIG.CHANNEL_URL_MAP[channelName];
  if (!channelKey) {
    console.error('No channel key found for:', channelName);
    showToast('هذه القناة غير مدعومة حالياً', 'error');
    return;
  }

  console.log('Redirecting to watch page:', { matchId, channelKey });
  window.location.href = `watch.html?id=${matchId}&channel=${channelKey}`;
}

// ... (بقية الدوال كما هي دون تغيير)

// 7. تهيئة الصفحة
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoading();
    await loadDataAndRender();
    setupEventListeners();
  } catch (error) {
    console.error('Initialization error:', error);
    handleLoadingError(error);
  } finally {
    hideLoading();
    if (DOM.contentContainer) {
      DOM.contentContainer.style.display = 'block';
    }
  }
});
