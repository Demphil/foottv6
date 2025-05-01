import { fetchMatches } from './api.js';

// 1. إعدادات التطبيق
const CONFIG = {
  CACHE_DURATION: 12 * 60 * 60 * 1000, // 12 ساعة
  CACHE_KEY: 'football-matches-cache-v2',
  FEATURED_LEAGUES: [2, 39, 140, 135], // دوري الأبطال، الإنجليزي، الإسباني، الإيطالي
  SLIDER_INTERVAL: 20000, // 20 ثانية
  MAX_BROADCAST_MATCHES: 5
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
  nextBtn: document.querySelector('.slider-next')
};

// 3. حالة التطبيق
let appState = {
  currentTab: 'today',
  sliderInterval: null,
  currentSlide: 0
};

// 4. تهيئة الصفحة
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoading();
    
    // جلب البيانات مع التخزين المؤقت
    const matches = await getMatchesData();
    const categorized = categorizeMatches(matches);
    
    renderFeaturedMatches(categorized.featured);
    renderBroadcastMatches(categorized.today.slice(0, CONFIG.MAX_BROADCAST_MATCHES));
    renderAllMatches(categorized);
    
    setupEventListeners();
    
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
  if (!matches?.length) {
    DOM.broadcastContainer.innerHTML = '<p class="no-matches">لا توجد مباريات منقولة اليوم</p>';
    return;
  }

  DOM.broadcastContainer.innerHTML = matches.map(match => `
    <div class="broadcast-card" data-id="${match.fixture.id}">
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
        <span><i class="fas fa-trophy"></i> ${match.league.name}</span>
        <span><i class="fas fa-clock"></i> ${formatDate(match.fixture.date)}</span>
      </div>
      <button class="watch-btn" onclick="watchMatch(${match.fixture.id})">
        <i class="fas fa-play"></i> مشاهدة البث
      </button>
    </div>
  `).join('');
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

// 11. الوظائف العامة
window.watchMatch = function(matchId) {
  window.location.href = `watch.html?matchId=${matchId}`;
};

window.clearMatchesCache = function() {
  localStorage.removeItem(CONFIG.CACHE_KEY);
  location.reload();
};
