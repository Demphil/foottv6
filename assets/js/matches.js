import { fetchMatches } from './api.js';

// 1. إعدادات التطبيق
const CONFIG = {
  CACHE_DURATION: 12 * 60 * 60 * 1000, // 12 ساعة
  CACHE_KEY: 'football-matches-cache-v3',
  FEATURED_LEAGUES: [2, 39, 140, 135], // دوري الأبطال، الإنجليزي، الإسباني، الإيطالي
  SLIDER_INTERVAL: 20000, // 20 ثانية
  MAX_BROADCAST_MATCHES: 5,
  ARABIC_CHANNELS: {
    'bein-sports-hd1': 'بي إن سبورت HD1',
    'bein-sports-hd2': 'بي إن سبورت HD2',
    'bein-sports-hd3': 'بي إن سبورت HD3',
    'ssc-1': 'SSC 1',
    'ssc-2': 'SSC 2',
    'on-time-sports': 'أون تايم سبورت',
    'al-kass': 'الكأس',
    'beinsports1': 'بي إن سبورت HD1',
    'beIN_1': 'بي إن سبورت HD1',
    'beIN Sports HD1': 'بي إن سبورت HD1',
    'beIN-MENA-1': 'بي إن سبورت HD1',
    'beIN-SPORTS-1': 'بي إن سبورت HD1'
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
  toastContainer: document.getElementById('toast-container')
};

// 3. حالة التطبيق
let appState = {
  currentTab: 'today',
  sliderInterval: null,
  currentSlide: 0,
  matchesData: null
};

// 4. تهيئة الصفحة
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoading();
    
    // جلب البيانات مع التخزين المؤقت
    appState.matchesData = await getMatchesData();
    const categorized = categorizeMatches(appState.matchesData);
    
    renderFeaturedMatches(categorized.featured);
    renderBroadcastMatches(categorized.today.slice(0, CONFIG.MAX_BROADCAST_MATCHES));
    renderAllMatches(categorized);
    
    setupEventListeners();
    setupMatchCards();
    
  } catch (error) {
    console.error('Initialization error:', error);
    showError('حدث خطأ في جلب البيانات. جارٍ عرض آخر بيانات متاحة...');
    tryFallbackCache();
  } finally {
    hideLoading();
  }
});

// 5. نظام التخزين المؤقت
async function getMatchesData() {
  // محاولة جلب البيانات من الكاش
  const cachedData = getValidCache();
  if (cachedData) return cachedData;
  
  // جلب بيانات جديدة من API
  const freshData = await fetchMatches();
  
  // تخزين البيانات الجديدة
  setCache(freshData);
  
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
    upcoming: matches.filter(m => new Date(m.fixture.date) > tomorrow),
    featured: matches.filter(m => CONFIG.FEATURED_LEAGUES.includes(m.league.id)),
    all: matches
  };
}

function filterByDate(matches, date) {
  const dateStr = date.toDateString();
  return matches.filter(m => 
    new Date(m.fixture.date).toDateString() === dateStr
  );
}

// 7. عرض البيانات
function renderFeaturedMatches(matches) {
  if (!matches?.length) {
    DOM.featuredContainer.innerHTML = '<p class="no-matches">لا توجد مباريات مميزة اليوم</p>';
    return;
  }

  // تقسيم إلى مجموعات كل 4 مباريات
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
    DOM.featuredContainer.innerHTML = groups[index].map(createFeaturedCard).join('');
    updateSliderDots(index);
  }

  function updateSliderDots(index) {
    const dots = DOM.sliderDots.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  // إنشاء نقاط التوجيه
  DOM.sliderDots.innerHTML = groups.map((_, i) => 
    `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
  ).join('');

  // الأحداث
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

  // البدء
  showSlide(0);
  startSliderInterval();
}

function renderBroadcastMatches(matches) {
  const { broadcastContainer } = DOM;
  
  if (!matches?.length) {
    broadcastContainer.innerHTML = `
      <div class="no-matches">
        <i class="fas fa-tv"></i>
        <p>لا توجد مباريات منقولة حالياً</p>
      </div>
    `;
    return;
  }

  broadcastContainer.innerHTML = matches.map(match => {
    const { fixture, teams, league, broadcast } = match;
    const homeTeam = teams.home;
    const awayTeam = teams.away;
    
    // تحديد حالة البث
    const broadcastStatus = getBroadcastStatus(broadcast);
    
    return `
      <div class="broadcast-card" data-id="${fixture.id}" tabindex="0">
        <div class="teams">
          <div class="team">
            <img src="${homeTeam.logo}" 
                 alt="${homeTeam.name}" 
                 onerror="this.src='assets/images/default-team.png'"
                 loading="lazy">
            <span class="team-name">${homeTeam.name}</span>
          </div>
          <div class="match-time">
            <span class="vs">VS</span>
            <time datetime="${fixture.date}">${formatKickoffTime(fixture.date)}</time>
          </div>
          <div class="team">
            <img src="${awayTeam.logo}" 
                 alt="${awayTeam.name}" 
                 onerror="this.src='assets/images/default-team.png'"
                 loading="lazy">
            <span class="team-name">${awayTeam.name}</span>
          </div>
        </div>
        
        ${renderBroadcastInfo(broadcastStatus)}
        
        <div class="match-info">
          <span class="league-info">
            <img src="${league.logo || 'assets/images/default-league.png'}" 
                 alt="${league.name}"
                 onerror="this.src='assets/images/default-league.png'">
            ${league.name}
          </span>
          <span class="match-venue">
            <i class="fas fa-map-marker-alt"></i>
            ${fixture.venue?.name || 'ملعب غير معروف'}
          </span>
        </div>
        <button class="watch-btn" 
                data-match-id="${fixture.id}"
                data-channel="${broadcastStatus.channel || ''}"
                ${broadcastStatus.available ? '' : 'disabled'}
                aria-label="مشاهدة مباراة ${homeTeam.name} ضد ${awayTeam.name}">
          <i class="fas fa-play"></i> ${broadcastStatus.buttonText}
        </button>
      </div>
    `;
  }).join('');
}

function getBroadcastStatus(broadcast) {
  const arabicBroadcasters = getArabicBroadcasters(broadcast || []);
  const hasBroadcastData = broadcast?.length > 0;
  const hasArabicBroadcast = arabicBroadcasters.length > 0;
  
  return {
    available: hasArabicBroadcast,
    channel: hasArabicBroadcast ? arabicBroadcasters[0] : null,
    allChannels: arabicBroadcasters,
    noData: !hasBroadcastData,
    buttonText: hasArabicBroadcast ? 'مشاهدة البث' : 
               hasBroadcastData ? 'غير متاح عربي' : 'لا يوجد بث'
  };
}

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
    ? matches.map(createMatchCard).join('')
    : `<p class="no-matches">لا توجد مباريات ${title}</p>`;
}

// 8. إنشاء البطاقات
function createFeaturedCard(match) {
  return `
    <div class="featured-card" data-id="${match.fixture.id}">
      <div class="league-info">
        <img src="${match.league.logo}" alt="${match.league.name}" onerror="this.style.display='none'">
        <span>${match.league.name}</span>
      </div>
      <div class="teams">
        <div class="team">
          <img src="${match.teams.home.logo}" alt="${match.teams.home.name}" onerror="this.src='assets/images/default-team.png'">
          <span>${match.teams.home.name}</span>
        </div>
        <div class="vs">VS</div>
        <div class="team">
          <img src="${match.teams.away.logo}" alt="${match.teams.away.name}" onerror="this.src='assets/images/default-team.png'">
          <span>${match.teams.away.name}</span>
        </div>
      </div>
      <div class="match-info">
        <span><i class="fas fa-clock"></i> ${formatDate(match.fixture.date)}</span>
        <span><i class="fas fa-map-marker-alt"></i> ${match.fixture.venue?.name || 'غير محدد'}</span>
      </div>
    </div>
  `;
}

function createMatchCard(match) {
  return `
    <div class="match-card" data-id="${match.fixture.id}">
      <div class="league-info">
        <img src="${match.league.logo}" alt="${match.league.name}" onerror="this.style.display='none'">
        <span>${match.league.name}</span>
      </div>
      <div class="teams">
        <div class="team">
          <img src="${match.teams.home.logo}" alt="${match.teams.home.name}" onerror="this.src='assets/images/default-team.png'">
          <span>${match.teams.home.name}</span>
        </div>
        <div class="vs">VS</div>
        <div class="team">
          <img src="${match.teams.away.logo}" alt="${match.teams.away.name}" onerror="this.src='assets/images/default-team.png'">
          <span>${match.teams.away.name}</span>
        </div>
      </div>
      <div class="match-info">
        <span><i class="fas fa-clock"></i> ${formatDate(match.fixture.date)}</span>
        <span><i class="fas fa-map-marker-alt"></i> ${match.fixture.venue?.name || 'غير محدد'}</span>
      </div>
    </div>
  `;
}

// 9. أدوات مساعدة
function formatDate(dateStr) {
  const options = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Africa/Casablanca'
  };
  return new Date(dateStr).toLocaleString('ar-MA', options);
}

function formatKickoffTime(dateString) {
  const options = { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Africa/Cairo'
  };
  return new Date(dateString).toLocaleTimeString('ar-EG', options);
}

function setupEventListeners() {
  // التبويبات
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
  // إضافة مستمعي الأحداث لأزرار المشاهدة
  document.querySelectorAll('.watch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const matchId = btn.dataset.matchId;
      const channel = btn.dataset.channel;
      watchMatch(matchId, channel);
    });
  });

  // إضافة مستمعي الأحداث للبطاقات
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
    // يمكنك تنفيذ عرض تفاصيل المباراة في modal أو صفحة منفصلة
    console.log('عرض تفاصيل المباراة:', match);
  }
}

function findMatchById(matchId) {
  return appState.matchesData?.find(m => m.fixture.id == matchId);
}

// 10. التحكم في الواجهة
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
      </div>
    `;
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

// 11. الوظائف العامة
window.watchMatch = function(matchId, channelName) {
  if (!channelName) {
    showToast('لا تتوفر قناة عربية ناقلة لهذه المباراة', 'error');
    return;
  }
  
  const channelMap = {
    'بي إن سبورت HD1': 'bein-sports-hd1',
    'بي إن سبورت HD2': 'bein-sports-hd2',
    'بي إن سبورت HD3': 'bein-sports-hd3',
    'SSC 1': 'ssc-1',
    'SSC 2': 'ssc-2',
    'أون تايم سبورت': 'on-time-sports',
    'الكأس': 'al-kass'
  };
  
  const channelFile = channelMap[channelName];
  
  if (channelFile) {
    logMatchView(matchId, channelName);
    window.location.href = `watch.html?id=${matchId}&channel=${channelFile}`;
  } else {
    showToast('جاري العمل على إضافة دعم لهذه القناة', 'info');
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
  showToast('تم مسح ذاكرة التخزين المؤقت', 'success');
  setTimeout(() => location.reload(), 1000);
};
