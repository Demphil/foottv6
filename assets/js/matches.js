import { getTodayMatches, getTomorrowMatches } from './api.js';

// 1. إعدادات التطبيق
const CONFIG = {
  CACHE_DURATION: 12 * 60 * 60 * 1000, // 12 ساعة
  CACHE_KEY: 'football-matches-cache-v3',
  MAJOR_LEAGUES: [
    'الدوري السعودي',
    'الدوري الإنجليزي',
    'الدوري الإسباني',
    'الدوري الإيطالي',
    'الدوري الألماني',
    'دوري أبطال أوروبا',
    'الدوري الفرنسي'
  ],
  SLIDER_INTERVAL: 20000,
  MAX_BROADCAST_MATCHES: 10,
  ARABIC_CHANNELS: {
    'bein-sports-hd1': 'bein SPORTS HD1',
    'bein-sports-hd2': 'bein SPORTS HD2',
    'ad-sports-premium1': 'AD SPORTS PREMIUM1',
    'ssc': 'SSC'
  },
  TIMEZONE: 'Africa/Casablanca',
  DEFAULT_TEAM_LOGO: 'assets/images/default-team.png',
  DEFAULT_LEAGUE_LOGO: 'assets/images/default-league.png'
};

// 2. عناصر DOM
const DOM = {
  get loading() { return document.getElementById('loading') },
  get errorContainer() { return document.getElementById('error-container') },
  get featuredContainer() { return document.getElementById('featured-section') },
  get broadcastContainer() { return document.getElementById('broadcast-section') },
  get allMatchesContainer() { return document.getElementById('all-matches') },
  get sliderDots() { return document.querySelector('.slider-dots') },
  get prevBtn() { return document.querySelector('.slider-prev') },
  get nextBtn() { return document.querySelector('.slider-next') }
};

// 3. حالة التطبيق
const appState = {
  currentSlide: 0,
  sliderInterval: null,
  matchesData: { today: [], tomorrow: [], all: [] },
  isInitialized: false
};

// 4. التهيئة الرئيسية
async function initializeApp() {
  if (appState.isInitialized) return;

  try {
    showLoading();
    
    const [todayMatches, tomorrowMatches] = await Promise.all([
      getTodayMatches(),
      getTomorrowMatches()
    ]);
    
    appState.matchesData = {
      today: todayMatches || [],
      tomorrow: tomorrowMatches || [],
      all: [...(todayMatches || []), ...(tomorrowMatches || [])]
    };
    
    renderAllSections();
    setupEventListeners();
    
    appState.isInitialized = true;
    
  } catch (error) {
    console.error("Error initializing app:", error);
    showError('Failed to load matches data');
    tryFallbackCache();
  } finally {
    hideLoading();
  }
}

// 5. تصنيف المباريات
function categorizeMatches() {
  const { today, tomorrow, all } = appState.matchesData;
  
  return {
    broadcast: today,
    featured: all.filter(match => 
      CONFIG.MAJOR_LEAGUES.some(league => 
        match.league?.name?.includes(league)
      )
    ),
    allMatches: [...today, ...tomorrow]
  };
}

// 6. عرض الأقسام
function renderAllSections() {
  const { broadcast, featured, allMatches } = categorizeMatches();
  
  renderBroadcastSection(broadcast);
  renderFeaturedSection(featured);
  renderAllMatchesSection(allMatches);
}

function renderBroadcastSection(matches) {
  if (!matches?.length) {
    DOM.broadcastContainer.innerHTML = `
      <div class="no-matches">
        <i class="fas fa-tv"></i>
        <p>لا توجد مباريات اليوم</p>
      </div>`;
    return;
  }

  DOM.broadcastContainer.innerHTML = matches.map(match => `
    <div class="broadcast-match">
      <div class="teams">
        <div class="team">
          <img src="${match.homeTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.homeTeam.name}">
          <span>${match.homeTeam.name}</span>
        </div>
        <div class="match-info">
          <span class="score">${match.score || 'VS'}</span>
          <span class="time">${match.time || '--:--'}</span>
        </div>
        <div class="team">
          <img src="${match.awayTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.awayTeam.name}">
          <span>${match.awayTeam.name}</span>
        </div>
      </div>
      <div class="channels">
        ${match.channels?.map(channel => `
          <span class="channel">${channel}</span>
        `).join('') || 'لا توجد قنوات'}
      </div>
    </div>
  `).join('');
}

function renderFeaturedSection(matches) {
  if (!matches?.length) {
    DOM.featuredContainer.innerHTML = '<p class="no-matches">لا توجد مباريات مميزة</p>';
    return;
  }

  // تقسيم المباريات إلى مجموعات للسلايدر
  const groupedMatches = [];
  for (let i = 0; i < matches.length; i += 4) {
    groupedMatches.push(matches.slice(i, i + 4));
  }

  initFeaturedSlider(groupedMatches);
}

function initFeaturedSlider(groups) {
  let currentIndex = 0;
  
  function showSlide(index) {
    currentIndex = index;
    DOM.featuredContainer.innerHTML = groups[index].map(match => `
      <div class="featured-match">
        <div class="league-info">
          <img src="${match.league?.logo || CONFIG.DEFAULT_LEAGUE_LOGO}" 
               alt="${match.league?.name || 'بطولة'}">
          <span>${match.league?.name || 'بطولة'}</span>
        </div>
        <div class="teams">
          <div class="team">
            <img src="${match.homeTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
                 alt="${match.homeTeam.name}">
            <span>${match.homeTeam.name}</span>
          </div>
          <div class="match-info">
            <span class="score">${match.score || 'VS'}</span>
            <span class="time">${match.time || '--:--'}</span>
          </div>
          <div class="team">
            <img src="${match.awayTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
                 alt="${match.awayTeam.name}">
            <span>${match.awayTeam.name}</span>
          </div>
        </div>
      </div>
    `).join('');
    
    updateSliderDots();
  }

  function updateSliderDots() {
    if (DOM.sliderDots) {
      DOM.sliderDots.innerHTML = groups.map((_, i) => `
        <span class="dot ${i === currentIndex ? 'active' : ''}" data-index="${i}"></span>
      `).join('');
    }
  }

  // الأزرار والتأثيرات
  if (DOM.prevBtn && DOM.nextBtn) {
    DOM.prevBtn.addEventListener('click', () => {
      clearInterval(appState.sliderInterval);
      currentIndex = (currentIndex - 1 + groups.length) % groups.length;
      showSlide(currentIndex);
      startSlider();
    });

    DOM.nextBtn.addEventListener('click', () => {
      clearInterval(appState.sliderInterval);
      currentIndex = (currentIndex + 1) % groups.length;
      showSlide(currentIndex);
      startSlider();
    });
  }

  function startSlider() {
    clearInterval(appState.sliderInterval);
    if (groups.length > 1) {
      appState.sliderInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % groups.length;
        showSlide(currentIndex);
      }, CONFIG.SLIDER_INTERVAL);
    }
  }

  showSlide(0);
  startSlider();
}

function renderAllMatchesSection(matches) {
  if (!matches?.length) {
    DOM.allMatchesContainer.innerHTML = '<p class="no-matches">لا توجد مباريات</p>';
    return;
  }

  DOM.allMatchesContainer.innerHTML = matches.map(match => `
    <div class="match-card">
      <div class="league-info">
        <img src="${match.league?.logo || CONFIG.DEFAULT_LEAGUE_LOGO}" 
             alt="${match.league?.name || 'بطولة'}">
        <span>${match.league?.name || 'بطولة'}</span>
      </div>
      <div class="match-details">
        <div class="team home">
          <span>${match.homeTeam.name}</span>
          <img src="${match.homeTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.homeTeam.name}">
        </div>
        <div class="match-info">
          <span class="score">${match.score || 'VS'}</span>
          <span class="time">${match.time || '--:--'}</span>
        </div>
        <div class="team away">
          <img src="${match.awayTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.awayTeam.name}">
          <span>${match.awayTeam.name}</span>
        </div>
      </div>
      ${match.channels?.length ? `
      <div class="match-channels">
        <i class="fas fa-tv"></i>
        ${match.channels.join('، ')}
      </div>` : ''}
    </div>
  `).join('');
}

// 7. دوال مساعدة
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

function tryFallbackCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY));
    if (cached && cached.data) {
      appState.matchesData = cached.data;
      renderAllSections();
    }
  } catch (e) {
    console.error("Error loading cached data:", e);
  }
}

function setupEventListeners() {
  // نقاط السلايدر
  if (DOM.sliderDots) {
    DOM.sliderDots.addEventListener('click', (e) => {
      if (e.target.classList.contains('dot')) {
        const index = parseInt(e.target.dataset.index);
        clearInterval(appState.sliderInterval);
        appState.currentSlide = index;
        showSlide(index);
        startSlider();
      }
    });
  }
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', initializeApp);

// للاستخدام في وحدة التحكم
window.debugApp = {
  reloadData: initializeApp,
  getState: () => appState
};
