import { getTodayMatches } from './api.js';

// 1. إعدادات التطبيق
const CONFIG = {
  CACHE_DURATION: 12 * 60 * 60 * 1000, // 12 ساعة
  CACHE_KEY: 'football-matches-cache-v8',
  FEATURED_LEAGUES: [2000, 2021, 2014, 2001, 503, 632, 2015, 2002, 2019, 2003, 521, 2005, 2004],
  SLIDER_INTERVAL: 20000, // 20 ثانية
  MAX_BROADCAST_MATCHES: 5,
  MANUAL_BROADCAST_MATCHES: [
    {
      homeTeam: "Paris Saint Germain",
      awayTeam: "Inter",
      channels: ["bein SPORTS HD1"]
    },
    {
      homeTeam: "Real Betis",
      awayTeam: "Chelsea",
      channels: ["bein SPORTS HD1"]
    },
    {
      homeTeam: "Pyramids FC",
      awayTeam: "Mamelodi Sundowns",
      channels: ["bein SPORTS HD1"]
    },
  ],
  ARABIC_CHANNELS: {
    'bein-sports-hd1': 'bein SPORTS HD1',
    'bein-sports-hd2': 'bein SPORTS HD2',
    'bein-sports-hd3': 'bein SPORTS HD3',
    'bein-sports-hd4': 'bein SPORTS HD4',
    'bein-sports-hd5': 'bein SPORTS HD5',
    'bein-sports-hd6': 'bein SPORTS HD6',
    'ad-sports-premium1': 'AD SPORTS PREMIUM1',
    'SSC-HD1': 'SSC HD1',
    'ssc-extra2': 'SSC EXTRA2',
    'ssc-extra1': 'SSC EXTRA1',
    'ssc-extra3': 'SSC EXTRA3',
    'Arryadia-HD': 'Arryadia HD',
    'Almaghribia': 'Almaghribia',
    'one-time-sports1': 'one time sports1',
  },
  TIMEZONE: 'Africa/Casablanca'
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
  toastContainer: document.getElementById('toast-container')
};

// 3. حالة التطبيق
let appState = {
  currentTab: 'today',
  sliderInterval: null,
  currentSlide: 0,
  matchesData: null
};

// 4. التهيئة الرئيسية
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoading();
    
    appState.matchesData = await getMatchesData();
    const categorized = categorizeMatches(appState.matchesData);
    
    renderFeaturedMatches(categorized.featured);
    renderBroadcastMatches(getManualBroadcastMatches(appState.matchesData));
    renderAllMatches(categorized);
    
    setupEventListeners();
    setupMatchCards();
    
  } catch (error) {
    console.error('Initialization error:', error);
    showError('حدث خطأ في تحميل البيانات. جاري عرض آخر بيانات متاحة...');
    tryFallbackCache();
  } finally {
    hideLoading();
  }
});

// 5. نظام التخزين المؤقت
async function getMatchesData() {
  const cachedData = getValidCache();
  if (cachedData) {
    showToast('جاري استخدام البيانات المخزنة مؤقتاً', 'info');
    return cachedData;
  }
  
  const freshData = await getTodayMatches();
  setCache(freshData);
  showToast('تم تحديث بيانات المباريات بنجاح', 'success');
  return freshData;
}

function getValidCache() {
  const cached = localStorage.getItem(CONFIG.CACHE_KEY);
  if (!cached) return null;
  
  try {
    const { data, timestamp } = JSON.parse(cached);
    return (Date.now() - timestamp < CONFIG.CACHE_DURATION) ? data : null;
  } catch {
    return null;
  }
}

function setCache(data) {
  localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
}

function tryFallbackCache() {
  const cachedData = getValidCache();
  if (cachedData) {
    appState.matchesData = cachedData;
    const categorized = categorizeMatches(cachedData);
    renderFeaturedMatches(categorized.featured);
    renderAllMatches(categorized);
  }
}

// 6. معالجة البيانات
function categorizeMatches(matches) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  return {
    today: filterByDate(matches, today),
    tomorrow: filterByDate(matches, tomorrow),
    upcoming: matches.filter(m => new Date(m.date) > tomorrow),
    featured: matches.filter(m => CONFIG.FEATURED_LEAGUES.includes(m.league?.id)),
    all: matches
  };
}

function filterByDate(matches, date) {
  const dateStr = date.toDateString();
  return matches.filter(m => 
    new Date(m.date).toDateString() === dateStr
  );
}

// 7. عرض المباريات
function renderFeaturedMatches(matches) {
  if (!matches?.length) {
    DOM.featuredContainer.innerHTML = '<p class="no-matches">لا توجد مباريات مميزة اليوم</p>';
    return;
  }

  const groupedMatches = [];
  for (let i = 0; i < matches.length; i += 4) {
    groupedMatches.push(matches.slice(i, i + 4));
  }

  initSlider(groupedMatches);
}

function initSlider(groups) {
  let currentIndex = 0;
  
  function showSlide(index) {
    currentIndex = index;
    DOM.featuredContainer.innerHTML = groups[index].map(match => `
      <div class="featured-card" data-id="${match.id}">
        <div class="league-info">
          <img src="${match.league?.logo || 'default-league.png'}" alt="${match.league?.name || 'بطولة غير معروفة'}">
          <span>${match.league?.name || 'بطولة غير معروفة'}</span>
        </div>
        <div class="teams">
          <div class="team">
            <img src="${match.homeTeam.logo || 'default-team.png'}" alt="${match.homeTeam.name}">
            <span>${match.homeTeam.name}</span>
          </div>
          <div class="vs">VS</div>
          <div class="team">
            <img src="${match.awayTeam.logo || 'default-team.png'}" alt="${match.awayTeam.name}">
            <span>${match.awayTeam.name}</span>
          </div>
        </div>
        <div class="match-info">
          <span><i class="fas fa-clock"></i> ${formatDate(match.date)}</span>
          <span><i class="fas fa-map-marker-alt"></i> ${match.venue || 'ملعب غير معروف'}</span>
        </div>
      </div>
    `).join('');
    updateSliderDots(index);
  }

  function updateSliderDots(index) {
    const dots = DOM.sliderDots.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  DOM.sliderDots.innerHTML = groups.map((_, i) => 
    `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
  ).join('');

  DOM.prevBtn.addEventListener('click', () => {
    clearInterval(appState.sliderInterval);
    currentIndex = (currentIndex - 1 + groups.length) % groups.length;
    showSlide(currentIndex);
    startSliderInterval();
  });

  DOM.nextBtn.addEventListener('click', () => {
    clearInterval(appState.sliderInterval);
    currentIndex = (currentIndex + 1) % groups.length;
    showSlide(currentIndex);
    startSliderInterval();
  });

  DOM.sliderDots.addEventListener('click', (e) => {
    if (e.target.classList.contains('dot')) {
      clearInterval(appState.sliderInterval);
      showSlide(parseInt(e.target.dataset.index));
      startSliderInterval();
    }
  });

  function startSliderInterval() {
    appState.sliderInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % groups.length;
      showSlide(currentIndex);
    }, CONFIG.SLIDER_INTERVAL);
  }

  showSlide(0);
  startSliderInterval();
}

function getManualBroadcastMatches(allMatches) {
  if (!CONFIG.MANUAL_BROADCAST_MATCHES.length) {
    return allMatches.slice(0, CONFIG.MAX_BROADCAST_MATCHES);
  }

  const selectedMatches = [];
  
  for (const criteria of CONFIG.MANUAL_BROADCAST_MATCHES) {
    let foundMatch = allMatches.find(m => 
      m.homeTeam.name.toLowerCase().includes(criteria.homeTeam.toLowerCase()) && 
      m.awayTeam.name.toLowerCase().includes(criteria.awayTeam.toLowerCase())
    );
    
    if (foundMatch) {
      foundMatch.manualChannels = criteria.channels;
      selectedMatches.push(foundMatch);
      if (selectedMatches.length >= CONFIG.MAX_BROADCAST_MATCHES) break;
    }
  }
  
  return selectedMatches.length > 0 ? selectedMatches : allMatches.slice(0, CONFIG.MAX_BROADCAST_MATCHES);
}

function renderBroadcastMatches(matches) {
  if (!matches?.length) {
    DOM.broadcastContainer.innerHTML = `
      <div class="no-matches">
        <i class="fas fa-tv"></i>
        <p>لا توجد مباريات مذاعة اليوم</p>
      </div>`;
    return;
  }

  DOM.broadcastContainer.innerHTML = matches.map(match => {
    const broadcastStatus = getBroadcastStatus(match.broadcast || [], match);
    
    return `
      <div class="broadcast-card" data-id="${match.id}" tabindex="0">
        <div class="teams">
          <div class="team">
            <img src="${match.homeTeam.logo || 'default-team.png'}" 
                 alt="${match.homeTeam.name}" 
                 onerror="this.src='default-team.png'">
            <span class="team-name">${match.homeTeam.name}</span>
          </div>
          <div class="match-time">
            <span class="vs">VS</span>
            <time datetime="${match.date}">${formatKickoffTime(match.date)}</time>
          </div>
          <div class="team">
            <img src="${match.awayTeam.logo || 'default-team.png'}" 
                 alt="${match.awayTeam.name}" 
                 onerror="this.src='default-team.png'">
            <span class="team-name">${match.awayTeam.name}</span>
          </div>
        </div>
        
        ${renderBroadcastInfo(broadcastStatus)}
        
        <div class="match-info">
          <span class="league-info">
            <img src="${match.league?.logo || 'default-league.png'}" 
                 alt="${match.league?.name || 'بطولة غير معروفة'}"
                 onerror="this.src='default-league.png'">
            ${match.league?.name || 'بطولة غير معروفة'}
          </span>
          <span class="match-venue">
            <i class="fas fa-map-marker-alt"></i>
            ${match.venue || 'ملعب غير معروف'}
          </span>
        </div>
        <button class="watch-btn" 
                data-match-id="${match.id}"
                data-channel="${broadcastStatus.channel || ''}"
                ${broadcastStatus.available ? '' : 'disabled'}
                aria-label="مشاهدة مباراة ${match.homeTeam.name} ضد ${match.awayTeam.name}">
          <i class="fas fa-play"></i> ${broadcastStatus.buttonText}
        </button>
      </div>`;
  }).join('');
}

function getBroadcastStatus(broadcast, match) {
  const manualChannels = getManualBroadcastChannels(match);
  if (manualChannels) {
    return {
      available: true,
      channel: manualChannels[0],
      allChannels: manualChannels,
      noData: false,
      buttonText: 'مشاهدة'
    };
  }

  const arabicBroadcasters = getArabicBroadcasters(broadcast);
  const hasBroadcastData = broadcast?.length > 0;
  const hasArabicBroadcast = arabicBroadcasters.length > 0;
  
  return {
    available: hasArabicBroadcast,
    channel: hasArabicBroadcast ? arabicBroadcasters[0] : null,
    allChannels: arabicBroadcasters,
    noData: !hasBroadcastData,
    buttonText: hasArabicBroadcast ? 'مشاهدة' : 
               hasBroadcastData ? 'غير متاح' : 'لا يوجد بث'
  };
}

function getManualBroadcastChannels(match) {
  return match.manualChannels || null;
}

function renderBroadcastInfo(status) {
  if (status.noData) {
    return `
      <div class="broadcast-info no-data">
        <i class="fas fa-info-circle"></i>
        <span>لا توجد بيانات بث</span>
      </div>`;
  }
  
  if (status.available) {
    return `
      <div class="broadcast-info available">
        <i class="fas fa-satellite-dish"></i>
        <span>${status.allChannels.join(' - ')}</span>
      </div>`;
  }
  
  return `
    <div class="broadcast-info not-available">
      <i class="fas fa-exclamation-triangle"></i>
      <span>غير متاح على القنوات العربية</span>
    </div>`;
}

function getArabicBroadcasters(broadcastData) {
  if (!broadcastData?.length) return [];
  
  return broadcastData
    .filter(b => b && b.name)
    .map(b => {
      const cleanName = b.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/_/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      const matchedKey = Object.keys(CONFIG.ARABIC_CHANNELS).find(key => 
        cleanName.includes(key.toLowerCase())
      );
      
      return matchedKey ? CONFIG.ARABIC_CHANNELS[matchedKey] : null;
    })
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index);
}

function renderAllMatches({ today, tomorrow, upcoming }) {
  DOM.todayContainer.innerHTML = renderMatchList(today, 'اليوم');
  DOM.tomorrowContainer.innerHTML = renderMatchList(tomorrow, 'غداً');
  DOM.upcomingContainer.innerHTML = renderMatchList(upcoming, 'القادمة');
}

function renderMatchList(matches, title) {
  return matches?.length
    ? matches.map(match => `
        <div class="match-card" data-id="${match.id}">
          <div class="league-info">
            <img src="${match.league?.logo || 'default-league.png'}" 
                 alt="${match.league?.name || 'بطولة غير معروفة'}"
                 onerror="this.src='default-league.png'">
            <span>${match.league?.name || 'بطولة غير معروفة'}</span>
          </div>
          <div class="teams">
            <div class="team">
              <img src="${match.homeTeam.logo || 'default-team.png'}" 
                   alt="${match.homeTeam.name}"
                   onerror="this.src='default-team.png'">
              <span>${match.homeTeam.name}</span>
            </div>
            <div class="vs">VS</div>
            <div class="team">
              <img src="${match.awayTeam.logo || 'default-team.png'}" 
                   alt="${match.awayTeam.name}"
                   onerror="this.src='default-team.png'">
              <span>${match.awayTeam.name}</span>
            </div>
          </div>
          <div class="match-info">
            <span><i class="fas fa-clock"></i> ${formatDate(match.date)}</span>
            <span><i class="fas fa-map-marker-alt"></i> ${match.venue || 'ملعب غير معروف'}</span>
          </div>
        </div>
      `).join('')
    : `<p class="no-matches">لا توجد مباريات ${title.toLowerCase()}</p>`;
}

// 8. دوال مساعدة
function formatDate(dateStr) {
  const options = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: CONFIG.TIMEZONE
  };
  
  return new Date(dateStr).toLocaleString('ar-MA', options);
}

function formatKickoffTime(dateString) {
  const options = { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: CONFIG.TIMEZONE
  };
  
  return new Date(dateString).toLocaleTimeString('ar-MA', options);
}

function setupEventListeners() {
  DOM.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.currentTab = btn.dataset.tab;
      
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`${appState.currentTab}-matches`).classList.add('active');
    });
  });
}

function setupMatchCards() {
  document.querySelectorAll('.watch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const matchId = btn.dataset.matchId;
      const channel = btn.dataset.channel;
      watchMatch(matchId, channel);
    });
  });

  document.querySelectorAll('.broadcast-card').forEach(card => {
    card.addEventListener('click', handleCardClick);
    card.addEventListener('keydown', handleCardKeyPress);
  });
}

function handleCardClick(event) {
  const card = event.currentTarget;
  if (!event.target.closest('.watch-btn')) {
    const matchId = card.dataset.id;
    showMatchDetails(matchId);
  }
}

function handleCardKeyPress(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    const card = event.currentTarget;
    const matchId = card.dataset.id;
    showMatchDetails(matchId);
  }
}

function showMatchDetails(matchId) {
  const match = findMatchById(matchId);
  if (match) {
    console.log('عرض تفاصيل المباراة:', match);
    // يمكنك إضافة منطق عرض التفاصيل هنا
  }
}

function findMatchById(matchId) {
  return appState.matchesData?.find(m => m.id == matchId);
}

// 9. عناصر التحكم في الواجهة
function showLoading() {
  if (DOM.loading) DOM.loading.style.display = 'flex';
}

function hideLoading() {
  if (DOM.loading) DOM.loading.style.display = 'none';
}

function showError(message) {
  if (DOM.errorContainer) {
    DOM.errorContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
      </div>`;
  }
}

function showToast(message, type = 'info') {
  if (!DOM.toastContainer) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

// 10. دوال عامة
window.watchMatch = function(matchId, channelName) {
  if (!channelName) {
    showToast('لا توجد قناة عربية متاحة لهذه المباراة', 'error');
    return;
  }
  
  const channelMap = {
    'bein SPORTS HD1': 'bein-sports-hd1',
    'bein SPORTS HD2': 'bein-sports-hd2',
    'bein SPORTS HD3': 'bein-sports-hd3',
    'bein SPORTS HD4': 'bein-sports-hd4',
    'bein SPORTS HD5': 'bein-sports-hd5',
    'bein SPORTS HD6': 'bein-sports-hd6',
    'SSC HD1': 'ssc-hd1',
    'SSC EXTRA2': 'ssc-extra2',
    'SSC EXTRA1': 'ssc-extra1',
    'SSC EXTRA3': 'ssc-extra3',
    'Arryadia HD': 'Arryadia-HD',
    'Almaghribia': 'Almaghribia',
    'one time sports1': 'one-time-sports1',
    'AD SPORTS PREMIUM1': 'ad-sports-premium1',
  };
  
  const channelFile = channelMap[channelName];
  
  if (channelFile) {
    logMatchView(matchId, channelName);
    window.location.href = `watch.html?id=${matchId}&channel=${channelFile}`;
  } else {
    showToast('دعم هذه القناة قريباً', 'info');
  }
};

function logMatchView(matchId, channel) {
  const history = JSON.parse(localStorage.getItem('matchViews') || '[]');
  history.push({
    matchId,
    channel,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('matchViews', JSON.stringify(history));
}

window.clearMatchesCache = function() {
  localStorage.removeItem(CONFIG.CACHE_KEY);
  showToast('تم مسح الذاكرة المؤقتة بنجاح', 'success');
  setTimeout(() => location.reload(), 1000);
};
