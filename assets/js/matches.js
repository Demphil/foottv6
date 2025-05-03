import { fetchMatches } from './api.js';

// 1. إعدادات التطبيق
const CONFIG = {
  CACHE_DURATION: 12 * 60 * 60 * 1000, // 12 ساعة
  CACHE_KEY: 'football-matches-cache-v7',
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

// 4. تهيئة الصفحة
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

// 5. تحميل البيانات والتقديم
async function loadDataAndRender() {
  try {
    appState.matchesData = await getMatchesData();
    const categorized = categorizeMatches(appState.matchesData);
    renderCriticalContent(categorized);
    await renderSecondaryContent(categorized);
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

// 6. نظام التخزين المؤقت
async function getMatchesData() {
  const cachedData = getValidCache();
  if (cachedData) {
    fetchFreshDataInBackground();
    return cachedData;
  }
  return await fetchFreshData();
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

async function fetchFreshData() {
  const freshData = await fetchMatches();
  setCache(freshData);
  return freshData;
}

function fetchFreshDataInBackground() {
  fetchMatches().then(setCache).catch(console.error);
}

function setCache(data) {
  localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
}

// 7. معالجة البيانات
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
  return matches.filter(m => new Date(m.fixture.date).toDateString() === dateStr);
}

// 8. التقديم المرئي
function showLoading() {
  if (DOM.loading) DOM.loading.style.display = 'flex';
}

function hideLoading() {
  if (DOM.loading) DOM.loading.style.display = 'none';
}

function renderCriticalContent(categorized) {
  renderFeaturedMatches(categorized.featured);
  lazyLoadImages();
}

async function renderSecondaryContent(categorized) {
  renderBroadcastMatches(categorized.today.slice(0, CONFIG.MAX_BROADCAST_MATCHES));
  renderAllMatches(categorized);
  await preloadWatchPages();
}

function renderFeaturedMatches(matches) {
  if (!matches?.length) {
    DOM.featuredContainer.innerHTML = '<p class="no-matches">لا توجد مباريات مميزة اليوم</p>';
    return;
  }

  const groupedMatches = chunkArray(matches, 4);
  initSlider(groupedMatches);
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function initSlider(groups) {
  let currentIndex = 0;

  function showSlide(index) {
    currentIndex = index;
    DOM.featuredContainer.innerHTML = groups[index].map(createFeaturedCard).join('');
    updateSliderDots(index);
    lazyLoadImages();
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

  DOM.prevBtn.addEventListener('click', () => navigateSlider(-1));
  DOM.nextBtn.addEventListener('click', () => navigateSlider(1));
  DOM.sliderDots.addEventListener('click', handleDotClick);

  function navigateSlider(direction) {
    clearInterval(appState.sliderInterval);
    currentIndex = (currentIndex + direction + groups.length) % groups.length;
    showSlide(currentIndex);
    startSliderInterval();
  }

  function handleDotClick(e) {
    if (e.target.classList.contains('dot')) {
      clearInterval(appState.sliderInterval);
      showSlide(parseInt(e.target.dataset.index));
      startSliderInterval();
    }
  }

  function startSliderInterval() {
    appState.sliderInterval = setInterval(() => {
      navigateSlider(1);
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
        <p>لا توجد مباريات منقولة حالياً</p>
      </div>
    `;
    return;
  }

  DOM.broadcastContainer.innerHTML = matches.map(match => {
    const broadcastStatus = getBroadcastStatus(match.tv_channels || []);
    const firstChannel = broadcastStatus.allChannels[0] || '';

    return `
      <div class="broadcast-card" data-id="${match.fixture.id}">
        <div class="teams">
          <div class="team">
            <img data-src="${match.teams.home.logo}" alt="${match.teams.home.name}" loading="lazy" onerror="this.src='assets/images/default-team.png'">
            <span>${match.teams.home.name}</span>
          </div>
          <div class="match-time">
            <span class="vs">VS</span>
            <time datetime="${match.fixture.date}">${formatKickoffTime(match.fixture.date)}</time>
          </div>
          <div class="team">
            <img data-src="${match.teams.away.logo}" alt="${match.teams.away.name}" loading="lazy" onerror="this.src='assets/images/default-team.png'">
            <span>${match.teams.away.name}</span>
          </div>
        </div>

        ${renderBroadcastInfo(broadcastStatus)}

        <div class="match-info">
          <span class="league-info">
            <img data-src="${match.league.logo}" alt="${match.league.name}" loading="lazy" onerror="this.src='assets/images/default-league.png'">
            ${match.league.name}
          </span>
          <span class="match-venue">
            <i class="fas fa-map-marker-alt"></i>
            ${match.fixture.venue?.name || 'ملعب غير معروف'}
          </span>
        </div>
        <button class="watch-btn" 
                data-match-id="${match.fixture.id}"
                data-channel="${firstChannel}"
                aria-label="مشاهدة مباراة ${match.teams.home.name} ضد ${match.teams.away.name}">
          <i class="fas fa-play"></i> ${broadcastStatus.buttonText}
        </button>
      </div>
    `;
  }).join('');
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

function renderBroadcastInfo(status) {
  if (status.noData) {
    return `
      <div class="broadcast-info no-data">
        <i class="fas fa-info-circle"></i>
        <span>لا توجد معلومات عن القنوات الناقلة</span>
      </div>
    `;
  }

  return `
    <div class="broadcast-info">
      <i class="fas fa-broadcast-tower"></i>
      <span>بث عبر: ${status.allChannels.join(', ')}</span>
    </div>
  `;
}
