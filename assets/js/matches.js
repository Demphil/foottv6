import { getTodayMatches, getTomorrowMatches } from './api.js';

// 1. إعدادات التطبيق
const CONFIG = {
  CACHE_DURATION: 12 * 60 * 60 * 1000, // 12 ساعة
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
  TIMEZONE: 'Africa/Casablanca',
  DEFAULT_TEAM_LOGO: 'assets/images/default-team.png',
  DEFAULT_LEAGUE_LOGO: 'assets/images/default-league.png',
  EVENING_START_HOUR: 18 // بداية المساء الساعة 6 مساءً
};

// 2. عناصر DOM
const DOM = {
  loading: document.getElementById('loading'),
  errorContainer: document.getElementById('error-container'),
  featuredContainer: document.getElementById('featured-matches'),
  broadcastContainer: document.getElementById('broadcast-matches'),
  todayContainer: document.getElementById('today-matches'),
  tomorrowContainer: document.getElementById('tomorrow-matches'),
  toastContainer: document.getElementById('toast-container'),
  tabButtons: document.querySelectorAll('.tab-btn'),
  sliderDots: document.querySelector('.slider-dots'),
  prevBtn: document.querySelector('.slider-prev'),
  nextBtn: document.querySelector('.slider-next')
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
    console.log('جاري تحميل بيانات المباريات...');

    const [todayMatches, tomorrowMatches] = await Promise.all([
      getTodayMatches(),
      getTomorrowMatches()
    ]);

    appState.matchesData = {
      today: todayMatches || [],
      tomorrow: tomorrowMatches || [],
      all: [...(todayMatches || []), ...(tomorrowMatches || [])]
    };

    console.log('تم تحميل البيانات:', {
      today: appState.matchesData.today.length,
      tomorrow: appState.matchesData.tomorrow.length
    });

    renderAllSections();
    setupEventListeners();
    appState.isInitialized = true;

  } catch (error) {
    console.error('فشل تحميل البيانات:', error);
    showError('حدث خطأ في تحميل البيانات. يرجى المحاولة لاحقاً');
    tryFallbackCache();
  } finally {
    hideLoading();
  }
}

// 5. تصنيف المباريات
function categorizeMatches() {
  const { today, tomorrow, all } = appState.matchesData;
  const now = new Date();
  const currentHour = now.getUTCHours() + 1; // توقيت المغرب (UTC+1)

  // المباريات المسائية
  const eveningMatches = today.filter(match => {
    const matchHour = match.time ? parseInt(match.time.split(':')[0]) : 0;
    return matchHour >= CONFIG.EVENING_START_HOUR;
  });

  // المباريات المميزة
  const featuredMatches = all.filter(match => 
    CONFIG.MAJOR_LEAGUES.some(league => 
      match.league?.name?.includes(league)
  );

  return {
    broadcast: eveningMatches,
    featured: featuredMatches,
    today,
    tomorrow
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

function renderBroadcastSection(matches) {
  if (!DOM.broadcastContainer) return;

  DOM.broadcastContainer.innerHTML = matches.length ? matches.map(match => `
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
        ${match.channels?.map(channel => `<span class="channel">${channel}</span>`).join('') || 'لا توجد قنوات'}
      </div>
    </div>
  `).join('') : `
    <div class="no-matches">
      <i class="fas fa-tv"></i>
      <p>لا توجد مباريات منقولة مساء اليوم</p>
    </div>`;
}

function renderFeaturedSection(matches) {
  if (!DOM.featuredContainer) return;

  if (!matches.length) {
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

function initFeaturedSlider(groups) {
  let currentIndex = 0;

  function showSlide(index) {
    currentIndex = index;
    DOM.featuredContainer.innerHTML = groups[index].map(match => `
      <div class="featured-match" data-id="${match.id}">
        <div class="league-info">
          <img src="${match.league.logo || CONFIG.DEFAULT_LEAGUE_LOGO}" 
               alt="${match.league.name || 'بطولة'}"
               onerror="this.src='${CONFIG.DEFAULT_LEAGUE_LOGO}'">
          <span>${match.league.name || 'بطولة'}</span>
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

  function startSlider() {
    clearInterval(appState.sliderInterval);
    if (groups.length > 1) {
      appState.sliderInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % groups.length;
        showSlide(currentIndex);
      }, CONFIG.SLIDER_INTERVAL);
    }
  }

  // Event Listeners
  DOM.prevBtn?.addEventListener('click', () => {
    clearInterval(appState.sliderInterval);
    currentIndex = (currentIndex - 1 + groups.length) % groups.length;
    showSlide(currentIndex);
    startSlider();
  });

  DOM.nextBtn?.addEventListener('click', () => {
    clearInterval(appState.sliderInterval);
    currentIndex = (currentIndex + 1) % groups.length;
    showSlide(currentIndex);
    startSlider();
  });

  // Initialize
  showSlide(0);
  startSlider();
}

function renderTodayMatches(matches) {
  if (!DOM.todayContainer) return;

  DOM.todayContainer.innerHTML = matches.length ? matches.map(match => `
    <div class="match-card" data-id="${match.id}">
      <div class="league-info">
        <img src="${match.league.logo || CONFIG.DEFAULT_LEAGUE_LOGO}" 
             alt="${match.league.name || 'بطولة'}"
             onerror="this.src='${CONFIG.DEFAULT_LEAGUE_LOGO}'">
        <span>${match.league.name || 'بطولة'}</span>
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
  `).join('') : `
    <div class="no-matches">
      <i class="fas fa-calendar-day"></i>
      <p>لا توجد مباريات اليوم</p>
    </div>`;
}

function renderTomorrowMatches(matches) {
  if (!DOM.tomorrowContainer) return;

  DOM.tomorrowContainer.innerHTML = matches.length ? matches.map(match => `
    <div class="match-card" data-id="${match.id}">
      <div class="league-info">
        <img src="${match.league.logo || CONFIG.DEFAULT_LEAGUE_LOGO}" 
             alt="${match.league.name || 'بطولة'}"
             onerror="this.src='${CONFIG.DEFAULT_LEAGUE_LOGO}'">
        <span>${match.league.name || 'بطولة'}</span>
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
  `).join('') : `
    <div class="no-matches">
      <i class="fas fa-calendar-alt"></i>
      <p>لا توجد مباريات غداً</p>
    </div>`;
}

// 7. إعداد واجهة المستخدم
function setupEventListeners() {
  // تغيير التبويبات
  DOM.tabButtons?.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      appState.currentTab = tab;
      
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      DOM.tabButtons.forEach(b => b.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${tab}-matches`)?.classList.add('active');
    });
  });
}

// 8. دوال مساعدة
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
    const todayCached = JSON.parse(localStorage.getItem('kooora-matches-today'));
    const tomorrowCached = JSON.parse(localStorage.getItem('kooora-matches-tomorrow'));
    
    if (todayCached || tomorrowCached) {
      appState.matchesData = {
        today: todayCached?.data || [],
        tomorrow: tomorrowCached?.data || [],
        all: [...(todayCached?.data || []), ...(tomorrowCached?.data || [])]
      };
      renderAllSections();
      showToast('تم تحميل البيانات من الذاكرة المؤقتة', 'warning');
    }
  } catch (e) {
    console.error("Error loading cached data:", e);
  }
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', initializeApp);

// للفحص من وحدة التحكم
window.debugApp = {
  reload: () => {
    localStorage.clear();
    location.reload();
  },
  showData: () => {
    console.log("بيانات التطبيق:", {
      state: appState,
      categorized: categorizeMatches(),
      dom: {
        broadcast: DOM.broadcastContainer?.children.length,
        featured: DOM.featuredContainer?.children.length,
        today: DOM.todayContainer?.children.length
      }
    });
  }
};
