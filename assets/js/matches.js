import { getTodayMatches, getTomorrowMatches } from './api.js';

// 1. إعدادات التطبيق
const CONFIG = {
  CACHE_DURATION: 12 * 60 * 60 * 1000, // 12 ساعة
  CACHE_KEY: 'football-matches-cache-v5',
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
  TIMEZONE: 'Africa/Casablanca', // توقيت المغرب
  DEFAULT_TEAM_LOGO: 'assets/images/default-team.png',
  DEFAULT_LEAGUE_LOGO: 'assets/images/default-league.png',
  EVENING_START_HOUR: 18 // بداية المساء الساعة 6 مساءً
};

// 2. عناصر DOM
const DOM = {
  get loading() { return document.getElementById('loading') },
  get errorContainer() { return document.getElementById('error-container') },
  get featuredContainer() { return document.getElementById('featured-matches') },
  get broadcastContainer() { return document.getElementById('broadcast-matches') },
  get todayContainer() { return document.getElementById('today-matches') },
  get tomorrowContainer() { return document.getElementById('tomorrow-matches') },
  get upcomingContainer() { return document.getElementById('upcoming-matches') },
  get friendlyContainer() { return document.getElementById('friendly-matches') },
  get toastContainer() { return document.getElementById('toast-container') },
  get tabButtons() { return document.querySelectorAll('.tab-btn') || [] },
  get sliderDots() { return document.querySelector('.slider-dots') },
  get prevBtn() { return document.querySelector('.slider-prev') },
  get nextBtn() { return document.querySelector('.slider-next') }
};

// 3. حالة التطبيق
const appState = {
  currentTab: 'today',
  sliderInterval: null,
  currentSlide: 0,
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
    showError('حدث خطأ في تحميل البيانات. يرجى المحاولة لاحقاً');
    tryFallbackCache();
  } finally {
    hideLoading();
  }
}

// 5. تصنيف المباريات حسب التوقيت والدوريات
function categorizeMatches() {
  const { today, tomorrow, all } = appState.matchesData;
  const now = new Date();
  const currentHour = now.getHours();
  
  // المباريات المسائية (بعد الساعة 6 مساءً حسب توقيت المغرب)
  const eveningMatches = today.filter(match => {
    const matchHour = match.time ? parseInt(match.time.split(':')[0]) : 0;
    return matchHour >= CONFIG.EVENING_START_HOUR;
  });
  
  // المباريات المميزة (الدوريات الكبرى)
  const featuredMatches = all.filter(match => 
    CONFIG.MAJOR_LEAGUES.some(league => 
      match.league?.name?.includes(league)
    )
  );
  
  return {
    broadcast: eveningMatches, // المباريات المسائية المنقولة
    featured: featuredMatches, // المباريات المميزة من الدوريات الكبرى
    today,
    tomorrow,
    upcoming: [],
    friendly: []
  };
}

// 6. عرض الأقسام
function renderAllSections() {
  const { broadcast, featured, today, tomorrow } = categorizeMatches();
  
  renderBroadcastSection(broadcast);
  renderFeaturedSection(featured);
  renderTodayMatches(today);
  renderTomorrowMatches(tomorrow);
}

// عرض قسم المباريات المنقولة (المسائية)
function renderBroadcastSection(matches) {
  if (!DOM.broadcastContainer) return;
  
  if (!matches?.length) {
    DOM.broadcastContainer.innerHTML = `
      <div class="no-matches">
        <i class="fas fa-tv"></i>
        <p>لا توجد مباريات منقولة مساء اليوم</p>
      </div>`;
    return;
  }

  DOM.broadcastContainer.innerHTML = matches.map(match => `
    <div class="broadcast-match" data-id="${match.id}">
      <div class="teams">
        <div class="team">
          <img src="${match.homeTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.homeTeam.name}"
               onerror="this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
          <span>${match.homeTeam.name}</span>
        </div>
        <div class="match-info">
          <span class="score">${match.score || 'VS'}</span>
          <span class="time">${match.time || '--:--'}</span>
        </div>
        <div class="team">
          <img src="${match.awayTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.awayTeam.name}"
               onerror="this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
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

// عرض قسم المباريات المميزة (الدوريات الكبرى)
function renderFeaturedSection(matches) {
  if (!DOM.featuredContainer) return;
  
  if (!matches?.length) {
    DOM.featuredContainer.innerHTML = `
      <div class="no-matches">
        <i class="fas fa-star"></i>
        <p>لا توجد مباريات مميزة اليوم</p>
      </div>`;
    return;
  }

  const groupedMatches = [];
  for (let i = 0; i < matches.length; i += 4) {
    groupedMatches.push(matches.slice(i, i + 4));
  }

  initFeaturedSlider(groupedMatches);
}

// عرض قسم مباريات اليوم
function renderTodayMatches(matches) {
  if (!DOM.todayContainer) return;
  
  if (!matches?.length) {
    DOM.todayContainer.innerHTML = `
      <div class="no-matches">
        <i class="fas fa-calendar-day"></i>
        <p>لا توجد مباريات اليوم</p>
      </div>`;
    return;
  }

  DOM.todayContainer.innerHTML = matches.map(match => `
    <div class="match-card" data-id="${match.id}">
      <div class="league-info">
        <img src="${match.league?.logo || CONFIG.DEFAULT_LEAGUE_LOGO}" 
             alt="${match.league?.name || 'بطولة'}"
             onerror="this.src='${CONFIG.DEFAULT_LEAGUE_LOGO}'">
        <span>${match.league?.name || 'بطولة'}</span>
      </div>
      <div class="match-details">
        <div class="team home">
          <span>${match.homeTeam.name}</span>
          <img src="${match.homeTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.homeTeam.name}"
               onerror="this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
        </div>
        <div class="match-info">
          <span class="score">${match.score || 'VS'}</span>
          <span class="time">${match.time || '--:--'}</span>
        </div>
        <div class="team away">
          <img src="${match.awayTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.awayTeam.name}"
               onerror="this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
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

// عرض قسم مباريات الغد
function renderTomorrowMatches(matches) {
  if (!DOM.tomorrowContainer) return;
  
  if (!matches?.length) {
    DOM.tomorrowContainer.innerHTML = `
      <div class="no-matches">
        <i class="fas fa-calendar-alt"></i>
        <p>لا توجد مباريات غداً</p>
      </div>`;
    return;
  }

  DOM.tomorrowContainer.innerHTML = matches.map(match => `
    <div class="match-card" data-id="${match.id}">
      <div class="league-info">
        <img src="${match.league?.logo || CONFIG.DEFAULT_LEAGUE_LOGO}" 
             alt="${match.league?.name || 'بطولة'}"
             onerror="this.src='${CONFIG.DEFAULT_LEAGUE_LOGO}'">
        <span>${match.league?.name || 'بطولة'}</span>
      </div>
      <div class="match-details">
        <div class="team home">
          <span>${match.homeTeam.name}</span>
          <img src="${match.homeTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.homeTeam.name}"
               onerror="this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
        </div>
        <div class="match-info">
          <span class="score">${match.score || 'VS'}</span>
          <span class="time">${match.time || '--:--'}</span>
        </div>
        <div class="team away">
          <img src="${match.awayTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
               alt="${match.awayTeam.name}"
               onerror="this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
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

// 7. إعداد السلايدر للمباريات المميزة
function initFeaturedSlider(groups) {
  let currentIndex = 0;
  
  function showSlide(index) {
    currentIndex = index;
    DOM.featuredContainer.innerHTML = groups[index].map(match => `
      <div class="featured-match" data-id="${match.id}">
        <div class="league-info">
          <img src="${match.league?.logo || CONFIG.DEFAULT_LEAGUE_LOGO}" 
               alt="${match.league?.name || 'بطولة'}"
               onerror="this.src='${CONFIG.DEFAULT_LEAGUE_LOGO}'">
          <span>${match.league?.name || 'بطولة'}</span>
        </div>
        <div class="teams">
          <div class="team">
            <img src="${match.homeTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
                 alt="${match.homeTeam.name}"
                 onerror="this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
            <span>${match.homeTeam.name}</span>
          </div>
          <div class="match-info">
            <span class="score">${match.score || 'VS'}</span>
            <span class="time">${match.time || '--:--'}</span>
          </div>
          <div class="team">
            <img src="${match.awayTeam.logo || CONFIG.DEFAULT_TEAM_LOGO}" 
                 alt="${match.awayTeam.name}"
                 onerror="this.src='${CONFIG.DEFAULT_TEAM_LOGO}'">
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

// 8. إعداد واجهة المستخدم
function setupEventListeners() {
  // تغيير التبويبات
  if (DOM.tabButtons) {
    DOM.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        appState.currentTab = tab;
        
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        DOM.tabButtons.forEach(b => b.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`${tab}-matches`).classList.add('active');
      });
    });
  }
}

// 9. دوال مساعدة
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

function tryFallbackCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY));
    if (cached && cached.data) {
      appState.matchesData = cached.data;
      renderAllSections();
      showToast('تم تحميل البيانات من الذاكرة المؤقتة', 'warning');
    }
  } catch (e) {
    console.error("Error loading cached data:", e);
  }
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', initializeApp);
