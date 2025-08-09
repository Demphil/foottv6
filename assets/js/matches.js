import { getTodayMatches, getTomorrowMatches } from './api.js';

// 1. إعدادات التطبيق
const CONFIG = {
  CACHE_DURATION: 12 * 60 * 60 * 1000, // 12 ساعة
  CACHE_KEY: 'kooora-matches-cache-v2',
  FEATURED_LEAGUES: ['الدوري السعودي', 'الدوري الإنجليزي', 'دوري أبطال أوروبا'],
  SLIDER_INTERVAL: 20000,
  MAX_BROADCAST_MATCHES: 5,
  MANUAL_BROADCAST_MATCHES: [
    {
      homeTeam: "النصر",
      awayTeam: "الهلال",
      channels: ["bein SPORTS HD1"]
    }
  ],
  ARABIC_CHANNELS: {
    'bein-sports-hd1': 'bein SPORTS HD1',
    'bein-sports-hd2': 'bein SPORTS HD2',
    'ad-sports-premium1': 'AD SPORTS PREMIUM1'
  },
  TIMEZONE: 'Africa/Casablanca',
  DEFAULT_TEAM_LOGO: 'assets/images/default-team.png',
  DEFAULT_LEAGUE_LOGO: 'assets/images/default-league.png'
};

// 2. عناصر DOM
const DOM = {
  get loading() { return getElementWithFallback('loading', 'div') },
  get errorContainer() { return getElementWithFallback('error-container', 'div') },
  get featuredContainer() { return getElementWithFallback('featured-matches', 'div') },
  get broadcastContainer() { return getElementWithFallback('broadcast-matches', 'div') },
  get todayContainer() { return getElementWithFallback('today-matches', 'div') },
  get tomorrowContainer() { return getElementWithFallback('tomorrow-matches', 'div') },
  get upcomingContainer() { return getElementWithFallback('upcoming-matches', 'div') },
  get toastContainer() { return getElementWithFallback('toast-container', 'div') },
  get tabButtons() { return document.querySelectorAll('.tab-btn') || [] },
  get sliderDots() { return document.querySelector('.slider-dots') || createPlaceholder('slider-dots', 'div') },
  get prevBtn() { return document.querySelector('.slider-prev') || createPlaceholder('slider-prev', 'button') },
  get nextBtn() { return document.querySelector('.slider-next') || createPlaceholder('slider-next', 'button') }
};

// 3. حالة التطبيق
const appState = {
  currentTab: 'today',
  sliderInterval: null,
  currentSlide: 0,
  matchesData: { today: [], tomorrow: [], all: [] },
  isInitialized: false,
  debugMode: true
};

// 4. دوال مساعدة للـ DOM
function getElementWithFallback(id, tag = 'div') {
  return document.getElementById(id) || createPlaceholder(id, tag);
}

function createPlaceholder(id, tag) {
  const el = document.createElement(tag);
  el.id = id;
  el.className = 'dom-placeholder';
  el.innerHTML = `<span>${id} (مؤقت)</span>`;
  document.body.appendChild(el);
  return el;
}

function verifyEssentialDOM() {
  ['loading', 'featured-matches', 'broadcast-matches', 'today-matches', 'tomorrow-matches', 'toast-container'].forEach(id => {
    if (!document.getElementById(id)) createPlaceholder(id, 'div');
  });
}

// 5. التهيئة الرئيسية
async function initializeApp() {
  if (appState.isInitialized) return;

  try {
    showLoading();
    verifyEssentialDOM();
    
    const [todayMatches, tomorrowMatches] = await Promise.all([
      getTodayMatches(),
      getTomorrowMatches()
    ]);
    
    appState.matchesData = {
      today: todayMatches || [],
      tomorrow: tomorrowMatches || [],
      all: [...(todayMatches || []), ...(tomorrowMatches || [])]
    };
    
    const categorized = categorizeMatches(appState.matchesData);
    renderFeaturedMatches(categorized.featured);
    renderBroadcastMatches(getManualBroadcastMatches(appState.matchesData.all));
    renderAllMatches(categorized);
    
    setupEventListeners();
    setupMatchCards();
    
    appState.isInitialized = true;
    showToast("تم تحديث بيانات المباريات", "success");
    
  } catch (error) {
    console.error("خطأ في التهيئة:", error);
    showError('حدث خطأ في تحميل البيانات. جاري عرض آخر بيانات متاحة...');
    tryFallbackCache();
  } finally {
    hideLoading();
  }
}

// 6. نظام التخزين المؤقت
function cacheMatches(data) {
  localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
}

function tryFallbackCache() {
  const cached = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY));
  if (cached && isValidMatchesData(cached.data)) {
    appState.matchesData = cached.data;
    const categorized = categorizeMatches(cached.data);
    renderFeaturedMatches(categorized.featured);
    renderAllMatches(categorized);
    showToast("تم استخدام البيانات المخزنة مؤقتاً", "info");
  }
}

function isValidMatchesData(data) {
  return data && Array.isArray(data.today) && Array.isArray(data.tomorrow);
}

// 7. معالجة البيانات
function categorizeMatches(data) {
  return {
    today: data.today,
    tomorrow: data.tomorrow,
    upcoming: [],
    featured: data.all.filter(match => 
      CONFIG.FEATURED_LEAGUES.some(league => match.league?.name?.includes(league))
    ),
    all: data.all
  };
}

// 8. دوال العرض
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
    DOM.featuredContainer.innerHTML = groups[index].map(match => createFeaturedMatchCard(match)).join('');
    updateSliderDots();
  }

  function updateSliderDots() {
    DOM.sliderDots.innerHTML = groups.map((_, i) => 
      `<span class="dot ${i === currentIndex ? 'active' : ''}" data-index="${i}"></span>`
    ).join('');
  }

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

  function startSliderInterval() {
    appState.sliderInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % groups.length;
      showSlide(currentIndex);
    }, CONFIG.SLIDER_INTERVAL);
  }

  showSlide(0);
  startSliderInterval();
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

  DOM.broadcastContainer.innerHTML = matches.slice(0, CONFIG.MAX_BROADCAST_MATCHES)
    .map(match => createBroadcastMatchCard(match)).join('');
}

function renderAllMatches({ today, tomorrow, upcoming }) {
  DOM.todayContainer.innerHTML = renderMatchList(today, 'اليوم');
  DOM.tomorrowContainer.innerHTML = renderMatchList(tomorrow, 'غداً');
  DOM.upcomingContainer.innerHTML = renderMatchList(upcoming, 'القادمة');
}

function renderMatchList(matches, title) {
  if (!matches?.length) {
    return `<p class="no-matches">لا توجد مباريات ${title.toLowerCase()}</p>`;
  }

  return matches.map(match => `
    <div class="match-card" data-id="${match.id}">
      <div class="league-info">
        <img src="${match.league?.logo || CONFIG.DEFAULT_LEAGUE_LOGO}" 
             alt="${match.league?.name || 'بطولة غير معروفة'}"
             onerror="this.onerror=null;this.src='${CONFIG.DEFAULT_LEAGUE_LOGO}'">
        <span>${match.league?.name || 'بطولة غير معروفة'}</span>
      </div>
      <div class="teams">
        <div class="team">
          <img src="${match.homeTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.homeTeam.name}"
               onerror="this.onerror=null;this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
          <span>${match.homeTeam.name}</span>
        </div>
        <div class="score">${match.score || 'VS'}</div>
        <div class="team">
          <img src="${match.awayTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.awayTeam.name}"
               onerror="this.onerror=null;this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
          <span>${match.awayTeam.name}</span>
        </div>
      </div>
      <div class="match-info">
        <span><i class="fas fa-clock"></i> ${match.time || '--:--'}</span>
        <span><i class="fas fa-tv"></i> ${match.channels?.join('، ') || 'غير معروف'}</span>
      </div>
    </div>
  `).join('');
}

// 9. دوال إنشاء البطاقات
function createFeaturedMatchCard(match) {
  return `
    <div class="featured-card" data-id="${match.id}">
      <div class="league-info">
        <img src="${match.league?.logo || CONFIG.DEFAULT_LEAGUE_LOGO}" 
             alt="${match.league?.name || 'بطولة غير معروفة'}"
             onerror="this.onerror=null;this.src='${CONFIG.DEFAULT_LEAGUE_LOGO}'">
        <span>${match.league?.name || 'بطولة غير معروفة'}</span>
      </div>
      <div class="teams">
        <div class="team">
          <img src="${match.homeTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.homeTeam.name}"
               onerror="this.onerror=null;this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
          <span>${match.homeTeam.name}</span>
        </div>
        <div class="vs">${match.score || 'VS'}</div>
        <div class="team">
          <img src="${match.awayTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.awayTeam.name}"
               onerror="this.onerror=null;this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
          <span>${match.awayTeam.name}</span>
        </div>
      </div>
      <div class="match-info">
        <span><i class="fas fa-clock"></i> ${match.time || '--:--'}</span>
        <span><i class="fas fa-tv"></i> ${match.channels?.[0] || 'غير معروف'}</span>
      </div>
    </div>
  `;
}

function createBroadcastMatchCard(match) {
  const broadcastStatus = getBroadcastStatus(match.channels || [], match);
  
  return `
    <div class="broadcast-card" data-id="${match.id}">
      <div class="teams">
        <div class="team">
          <img src="${match.homeTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.homeTeam.name}" 
               onerror="this.onerror=null;this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
          <span>${match.homeTeam.name}</span>
        </div>
        <div class="match-time">
          <span class="vs">${match.score || 'VS'}</span>
          <time>${match.time || '--:--'}</time>
        </div>
        <div class="team">
          <img src="${match.awayTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.awayTeam.name}" 
               onerror="this.onerror=null;this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
          <span>${match.awayTeam.name}</span>
        </div>
      </div>
      
      <div class="broadcast-info">
        <i class="fas fa-tv"></i>
        <span>${broadcastStatus.available ? broadcastStatus.channel : 'لا يوجد بث'}</span>
      </div>
      
      <button class="watch-btn" data-channel="${broadcastStatus.channel || ''}" ${!broadcastStatus.available ? 'disabled' : ''}>
        <i class="fas fa-play"></i> ${broadcastStatus.buttonText}
      </button>
    </div>`;
}

function getBroadcastStatus(channels, match) {
  const manualMatch = CONFIG.MANUAL_BROADCAST_MATCHES.find(m => 
    match.homeTeam.name.includes(m.homeTeam) && 
    match.awayTeam.name.includes(m.awayTeam)
  );
  
  if (manualMatch) {
    return {
      available: true,
      channel: manualMatch.channels[0],
      buttonText: 'مشاهدة'
    };
  }
  
  const arabicChannels = channels.filter(ch => 
    Object.values(CONFIG.ARABIC_CHANNELS).some(name => ch.includes(name))
  );
  
  return {
    available: arabicChannels.length > 0,
    channel: arabicChannels[0] || '',
    buttonText: arabicChannels.length ? 'مشاهدة' : 'غير متاح'
  };
}

function getManualBroadcastMatches(allMatches) {
  const manualMatches = [];
  
  CONFIG.MANUAL_BROADCAST_MATCHES.forEach(criteria => {
    const found = allMatches.find(m => 
      m.homeTeam.name.includes(criteria.homeTeam) && 
      m.awayTeam.name.includes(criteria.awayTeam)
    );
    if (found) manualMatches.push({ ...found, channels: criteria.channels });
  });
  
  return manualMatches.length ? manualMatches : allMatches.slice(0, CONFIG.MAX_BROADCAST_MATCHES);
}

// 10. دوال التحكم في الواجهة
function showLoading() {
  DOM.loading.style.display = 'flex';
}

function hideLoading() {
  DOM.loading.style.display = 'none';
}

function showError(message) {
  DOM.errorContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    </div>`;
  DOM.errorContainer.style.display = 'block';
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

// 11. إعدادات واجهة المستخدم
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
      const channel = btn.dataset.channel;
      if (channel) watchMatch(channel);
    });
  });
}

// 12. دوال المشاهدة
function watchMatch(channelName) {
  const channelMap = {
    'bein SPORTS HD1': 'bein-sports-hd1',
    'bein SPORTS HD2': 'bein-sports-hd2',
    'AD SPORTS PREMIUM1': 'ad-sports-premium1'
  };
  
  const channelFile = channelMap[channelName];
  if (channelFile) {
    window.location.href = `watch.html?channel=${channelFile}`;
  } else {
    showToast('دعم هذه القناة قريباً', 'info');
  }
}

// 13. بدء التطبيق
document.addEventListener('DOMContentLoaded', initializeApp);
window.watchMatch = watchMatch;
window.clearMatchesCache = function() {
  localStorage.removeItem(CONFIG.CACHE_KEY);
  showToast('تم مسح الذاكرة المؤقتة', 'success');
  setTimeout(() => location.reload(), 1000);
};

console.log("✅ matches.js جاهز للعمل");
