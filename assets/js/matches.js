import { getTodayMatches } from './api.js';

// 1. إعدادات التطبيق
const CONFIG = {
  CACHE_DURATION: 12 * 60 * 60 * 1000, // 12 ساعة
  CACHE_KEY: 'football-matches-cache-v12',
  FEATURED_LEAGUES: [2000, 2021, 2014, 2001, 503, 632, 2015, 2002, 2019, 2003, 521, 2005, 2004],
  FRIENDLY_LEAGUES: [999],
  FRIENDLY_TEAMS: ["Team A", "Team B"],
  SLIDER_INTERVAL: 20000,
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
    }
  ],
  ARABIC_CHANNELS: {
    'bein-sports-hd1': 'bein SPORTS HD1',
    'bein-sports-hd2': 'bein SPORTS HD2',
    'bein-sports-hd3': 'bein SPORTS HD3',
    'ad-sports-premium1': 'AD SPORTS PREMIUM1',
    'SSC-HD1': 'SSC HD1'
  },
  TIMEZONE: 'Africa/Casablanca',
  DEFAULT_TEAM_LOGO: 'assets/images/default-team.png',
  DEFAULT_LEAGUE_LOGO: 'assets/images/default-league.png'
};

// 2. عناصر DOM مع نظام المرونة
const DOM = {
  get loading() { return getElementWithFallback('loading', 'div') },
  get errorContainer() { return getElementWithFallback('error-container', 'div') },
  get featuredContainer() { return getElementWithFallback('featured-matches', 'div') },
  get broadcastContainer() { return getElementWithFallback('broadcast-matches', 'div') },
  get todayContainer() { return getElementWithFallback('today-matches', 'div') },
  get tomorrowContainer() { return getElementWithFallback('tomorrow-matches', 'div') },
  get upcomingContainer() { return getElementWithFallback('upcoming-matches', 'div') },
  get friendlyContainer() { return getElementWithFallback('friendly-matches', 'div') },
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
  matchesData: null,
  isInitialized: false,
  debugMode: true
};

// 4. دوال مساعدة للـ DOM
function getElementWithFallback(id, tag = 'div') {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`[DOM Fallback] إنشاء عنصر نائب لـ ${id}`);
    return createPlaceholder(id, tag);
  }
  return element;
}

function createPlaceholder(id, tag) {
  const el = document.createElement(tag);
  el.id = id;
  el.className = 'dom-placeholder';
  el.innerHTML = `<span>عنصر ${id} مؤقت</span>`;
  document.body.appendChild(el);
  return el;
}

function verifyEssentialDOM() {
  const requiredElements = [
    'loading',
    'featured-matches',
    'broadcast-matches',
    'today-matches',
    'tomorrow-matches',
    'upcoming-matches',
    'toast-container'
  ];

  requiredElements.forEach(id => {
    if (!document.getElementById(id)) {
      console.warn(`[DOM Check] العنصر ${id} غير موجود، جاري إنشائه...`);
      createPlaceholder(id, 'div');
    }
  });
}

// 5. التهيئة الرئيسية
async function initializeApp() {
  if (appState.isInitialized) {
    logDebug("التطبيق مهيأ مسبقاً، تخطي التهيئة");
    return;
  }

  try {
    showLoading();
    logDebug("بدء تهيئة التطبيق...");
    
    // التحقق من عناصر DOM
    verifyEssentialDOM();
    
    // جلب البيانات
    logDebug("جلب بيانات المباريات...");
    const data = await getMatchesData();
    
    if (!isValidMatchesData(data)) {
      throw new Error('تنسيق بيانات غير صالح');
    }
    
    appState.matchesData = data;
    logDebug("تم استلام بيانات المباريات:", data.length, "مباراة");
    
    // تصنيف وعرض البيانات
    const categorized = categorizeMatches(data);
    renderFeaturedMatches(categorized.featured);
    renderBroadcastMatches(getManualBroadcastMatches(data));
    renderAllMatches(categorized);
    
    // إعداد واجهة المستخدم
    setupEventListeners();
    setupMatchCards();
    
    appState.isInitialized = true;
    logDebug("تم تهيئة التطبيق بنجاح");
    showToast("تم تحميل بيانات المباريات بنجاح", "success");
    
  } catch (error) {
    console.error("❌ خطأ في التهيئة:", error);
    showError('حدث خطأ في تحميل البيانات. جاري عرض آخر بيانات متاحة...');
    tryFallbackCache();
  } finally {
    hideLoading();
  }
}

// 6. نظام التخزين المؤقت
async function getMatchesData() {
  try {
    // محاولة استخدام البيانات المخزنة
    const cachedData = tryGetValidCache();
    if (cachedData) return cachedData;
    
    // جلب بيانات جديدة من API
    logDebug("جلب بيانات جديدة من API...");
    const freshData = await getTodayMatches();
    
    if (!freshData) {
      throw new Error("لا توجد بيانات مستلمة من API");
    }
    
    // تخزين البيانات الجديدة
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
      data: freshData,
      timestamp: Date.now()
    }));
    
    return freshData;
  } catch (error) {
    console.error("❌ فشل في جلب البيانات:", error);
    throw error;
  }
}

function tryGetValidCache() {
  try {
    const cached = localStorage.getItem(CONFIG.CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const isCacheValid = Date.now() - timestamp < CONFIG.CACHE_DURATION;
    
    if (isCacheValid && isValidMatchesData(data)) {
      logDebug("استخدام البيانات المخزنة المؤقتة");
      showToast("جاري استخدام البيانات المخزنة مؤقتاً", "info");
      return data;
    }
  } catch (e) {
    console.warn("⚠️ خطأ في معالجة البيانات المخزنة:", e);
  }
  return null;
}

// 7. معالجة البيانات
function categorizeMatches(matches) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  return {
    today: filterByDate(matches, today),
    tomorrow: filterByDate(matches, tomorrow),
    upcoming: matches.filter(m => new Date(m.date) > tomorrow),
    featured: matches.filter(m => CONFIG.FEATURED_LEAGUES.includes(m.league?.id)),
    friendly: matches.filter(m => 
      CONFIG.FRIENDLY_LEAGUES.includes(m.league?.id) || 
      CONFIG.FRIENDLY_TEAMS.some(team => 
        m.homeTeam?.name?.includes(team) || 
        m.awayTeam?.name?.includes(team)
      )
    ),
    all: matches
  };
}

function filterByDate(matches, date) {
  const dateStr = date.toDateString();
  return matches.filter(m => 
    new Date(m.date).toDateString() === dateStr
  );
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

function renderBroadcastMatches(matches) {
  if (!matches?.length) {
    DOM.broadcastContainer.innerHTML = `
      <div class="no-matches">
        <i class="fas fa-tv"></i>
        <p>لا توجد مباريات مذاعة اليوم</p>
      </div>`;
    return;
  }

  DOM.broadcastContainer.innerHTML = matches.map(match => createBroadcastMatchCard(match)).join('');
}

function renderAllMatches({ today, tomorrow, upcoming, friendly }) {
  DOM.todayContainer.innerHTML = renderMatchList(today, 'اليوم');
  DOM.tomorrowContainer.innerHTML = renderMatchList(tomorrow, 'غداً');
  DOM.upcomingContainer.innerHTML = renderMatchList(upcoming, 'القادمة');
  
  if (DOM.friendlyContainer && friendly?.length > 0) {
    DOM.friendlyContainer.innerHTML = renderMatchList(friendly, 'ودية');
  }
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
        <div class="vs">VS</div>
        <div class="team">
          <img src="${match.awayTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.awayTeam.name}"
               onerror="this.onerror=null;this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
          <span>${match.awayTeam.name}</span>
        </div>
      </div>
      <div class="match-info">
        <span><i class="fas fa-clock"></i> ${formatDate(match.date)}</span>
        <span><i class="fas fa-map-marker-alt"></i> ${match.venue || 'ملعب غير معروف'}</span>
      </div>
    </div>
  `;
}

function createBroadcastMatchCard(match) {
  const broadcastStatus = getBroadcastStatus(match.broadcast || [], match);
  
  return `
    <div class="broadcast-card" data-id="${match.id}" tabindex="0">
      <div class="teams">
        <div class="team">
          <img src="${match.homeTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.homeTeam.name}" 
               onerror="this.onerror=null;this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
          <span class="team-name">${match.homeTeam.name}</span>
        </div>
        <div class="match-time">
          <span class="vs">VS</span>
          <time datetime="${match.date}">${formatKickoffTime(match.date)}</time>
        </div>
        <div class="team">
          <img src="${match.awayTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.awayTeam.name}" 
               onerror="this.onerror=null;this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
          <span class="team-name">${match.awayTeam.name}</span>
        </div>
      </div>
      
      ${renderBroadcastInfo(broadcastStatus)}
      
      <div class="match-info">
        <span class="league-info">
          <img src="${match.league?.logo || CONFIG.DEFAULT_LEAGUE_LOGO}" 
               alt="${match.league?.name || 'بطولة غير معروفة'}"
               onerror="this.onerror=null;this.src='${CONFIG.DEFAULT_LEAGUE_LOGO}'">
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
        <span><i class="fas fa-clock"></i> ${formatDate(match.date)}</span>
        <span><i class="fas fa-map-marker-alt"></i> ${match.venue || 'ملعب غير معروف'}</span>
      </div>
    </div>
  `).join('');
}

// 10. دوال البث
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

// 11. دوال التحكم في الواجهة
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
    DOM.errorContainer.style.display = 'block';
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

// 12. إعدادات واجهة المستخدم
function setupEventListeners() {
  // تبويبات الصفحة
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
  // أزرار المشاهدة
  document.querySelectorAll('.watch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const matchId = btn.dataset.matchId;
      const channel = btn.dataset.channel;
      watchMatch(matchId, channel);
    });
  });

  // تفاصيل المباراة
  document.querySelectorAll('.broadcast-card').forEach(card => {
    card.addEventListener('click', handleCardClick);
    card.addEventListener('keydown', handleCardKeyPress);
  });
}

// 13. دوال مساعدة
function formatDate(dateStr) {
  try {
    const options = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: CONFIG.TIMEZONE
    };
    return new Date(dateStr).toLocaleString('ar-MA', options);
  } catch (e) {
    console.warn("⚠️ خطأ في تنسيق التاريخ:", e);
    return 'تاريخ غير معروف';
  }
}

function formatKickoffTime(dateString) {
  const options = { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: CONFIG.TIMEZONE
  };
  
  return new Date(dateString).toLocaleTimeString('ar-MA', options);
}

function logDebug(...args) {
  if (appState.debugMode) {
    console.log("🐞 [DEBUG]", ...args);
  }
}

function isValidMatchesData(data) {
  return data && Array.isArray(data);
}

// 14. دوال النظام
function tryFallbackCache() {
  const cachedData = tryGetValidCache();
  if (cachedData) {
    appState.matchesData = cachedData;
    const categorized = categorizeMatches(cachedData);
    renderFeaturedMatches(categorized.featured);
    renderAllMatches(categorized);
    showToast("تم استخدام البيانات المخزنة مؤقتاً", "info");
  }
}

// 15. دوال المشاهدة
function watchMatch(matchId, channelName) {
  if (!channelName) {
    showToast('لا توجد قناة عربية متاحة لهذه المباراة', 'error');
    return;
  }
  
  const channelMap = {
    'bein SPORTS HD1': 'bein-sports-hd1',
    'bein SPORTS HD2': 'bein-sports-hd2',
    'bein SPORTS HD3': 'bein-sports-hd3',
    'AD SPORTS PREMIUM1': 'ad-sports-premium1',
    'SSC HD1': 'ssc-hd1'
  };
  
  const channelFile = channelMap[channelName];
  
  if (channelFile) {
    logMatchView(matchId, channelName);
    window.location.href = `watch.html?id=${matchId}&channel=${channelFile}`;
  } else {
    showToast('دعم هذه القناة قريباً', 'info');
  }
}

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

// 16. بدء التطبيق
document.addEventListener('DOMContentLoaded', initializeApp);
window.watchMatch = watchMatch;
window.debugAppState = () => appState;

console.log("✅ matches.js جاهز للعمل");
