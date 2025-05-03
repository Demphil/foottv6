 import { fetchMatches } from './api.js';

// 1. App Settings
const CONFIG = {
  CACHE_DURATION: 12 * 60 * 60 * 1000, // 12 hours
  CACHE_KEY: 'football-matches-cache-v5',
  FEATURED_LEAGUES: [2, 39, 140, 135], // Champions League, Premier League, La Liga, Serie A
  SLIDER_INTERVAL: 20000, // 20 seconds
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
  TIMEZONE: 'Africa/Casablanca' // Morocco Time
};

// 2. DOM Elements
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

// 3. App State
let appState = {
  currentTab: 'today',
  sliderInterval: null,
  currentSlide: 0,
  matchesData: null
};

// 4. Initialize Page
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoading();
    
    // Get data with caching
    appState.matchesData = await getMatchesData();
    const categorized = categorizeMatches(appState.matchesData);
    
    renderFeaturedMatches(categorized.featured);
    renderBroadcastMatches(categorized.today.slice(0, CONFIG.MAX_BROADCAST_MATCHES));
    renderAllMatches(categorized);
    
    setupEventListeners();
    setupMatchCards();
    
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Error loading data. Showing last available data...');
    tryFallbackCache();
  } finally {
    hideLoading();
  }
});

// 5. Cache System
async function getMatchesData() {
  // Try cache first
  const cachedData = getValidCache();
  if (cachedData) return cachedData;
  
  // Fetch fresh data from API
  const freshData = await fetchMatches();
  
  // Cache new data
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

// 6. Data Processing
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

// 7. Rendering Functions
function renderFeaturedMatches(matches) {
  if (!matches?.length) {
    DOM.featuredContainer.innerHTML = '<p class="no-matches">No featured matches today</p>';
    return;
  }

  // Group into sets of 4 matches
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

  // Create dots
  DOM.sliderDots.innerHTML = groups.map((_, i) => 
    <span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>
  ).join('');

  // Event listeners
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

  // Initial display
  showSlide(0);
  startSliderInterval();
}

function renderBroadcastMatches(matches) {
  const { broadcastContainer } = DOM;
  
  if (!matches?.length) {
    broadcastContainer.innerHTML = 
      <div class="no-matches">
        <i class="fas fa-tv"></i>
        <p>No broadcast matches available</p>
      </div>
    ;
    return;
  }

  broadcastContainer.innerHTML = matches.map(match => {
    const { fixture, teams, league, broadcast } = match;
    const homeTeam = teams.home;
    const awayTeam = teams.away;
    
    const broadcastStatus = getBroadcastStatus(broadcast);
    
    return 
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
            ${fixture.venue?.name || 'Unknown venue'}
          </span>
        </div>
        <button class="watch-btn" 
                data-match-id="${fixture.id}"
                data-channel="${broadcastStatus.channel || ''}"
                ${broadcastStatus.available ? '' : 'disabled'}
                aria-label="Watch match ${homeTeam.name} vs ${awayTeam.name}">
          <i class="fas fa-play"></i> ${broadcastStatus.buttonText}
        </button>
      </div>
    ;
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
    buttonText: hasArabicBroadcast ? 'Watch' : 
               hasBroadcastData ? 'Not available' : 'No broadcast'
  };
}

function renderBroadcastInfo(status) {
  if (status.noData) {
    return 
      <div class="broadcast-info no-data">
        <i class="fas fa-info-circle"></i>
        <span>No broadcast data</span>
      </div>
    ;
  }
  
  if (status.available) {
    return 
      <div class="broadcast-info available">
        <i class="fas fa-satellite-dish"></i>
        <span>${status.allChannels.join(' - ')}</span>
      </div>
    ;
  }
  
  return 
    <div class="broadcast-info not-available">
      <i class="fas fa-exclamation-triangle"></i>
      <span>Not available on Arabic channels</span>
    </div>
  ;
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
  DOM.todayContainer.innerHTML = renderMatchList(today, 'Today');
  DOM.tomorrowContainer.innerHTML = renderMatchList(tomorrow, 'Tomorrow');
  DOM.upcomingContainer.innerHTML = renderMatchList(upcoming, 'Upcoming');
}

function renderMatchList(matches, title) {
  return matches?.length
    ? matches.map(createMatchCard).join('')
    : <p class="no-matches">No ${title.toLowerCase()} matches</p>;
}

// 8. Card Templates
function createFeaturedCard(match) {
  return 
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
        <span><i class="fas fa-map-marker-alt"></i> ${match.fixture.venue?.name || 'Unknown'}</span>
      </div>
    </div>
  ;
}

function createMatchCard(match) {
  return 
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
        <span><i class="fas fa-map-marker-alt"></i> ${match.fixture.venue?.name || 'Unknown'}</span>
      </div>
    </div>
  ;
}

// 9. Helper Functions
function formatDate(dateStr) {
  const options = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: CONFIG.TIMEZONE,
    numberingSystem: 'latn'
  };
  
  let dateText = new Date(dateStr).toLocaleString('en-MA', options);
  return dateText;
}

function formatKickoffTime(dateString) {
  const options = { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: CONFIG.TIMEZONE,
    numberingSystem: 'latn'
  };
  
  let timeText = new Date(dateString).toLocaleTimeString('en-MA', options);
  return timeText;
}

function setupEventListeners() {
  // Tab navigation
  DOM.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.currentTab = btn.dataset.tab;
      
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(${appState.currentTab}-matches).classList.add('active');
    });
  });
}

function setupMatchCards() {
  // Watch button events
  document.querySelectorAll('.watch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const matchId = btn.dataset.matchId;
      const channel = btn.dataset.channel;
      watchMatch(matchId, channel);
    });
  });

  // Card click events
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
    console.log('Showing match details:', match);
  }
}

function findMatchById(matchId) {
  return appState.matchesData?.find(m => m.fixture.id == matchId);
}

// 10. UI Controls
function showLoading() {
  if (DOM.loading) DOM.loading.style.display = 'flex';
}

function hideLoading() {
  if (DOM.loading) DOM.loading.style.display = 'none';
}

function showError(message) {
  if (DOM.errorContainer) {
    DOM.errorContainer.innerHTML = 
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
      </div>
    ;
  }
}

function showToast(message, type = 'info') {
  if (!DOM.toastContainer) return;
  
  const toast = document.createElement('div');
  toast.className = toast ${type};
  toast.innerHTML = <span>${message}</span>;
  DOM.toastContainer.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

// 11. Public Functions
window.watchMatch = function(matchId, channelName) {
  if (!channelName) {
    showToast('No Arabic channel available for this match', 'error');
    return;
  }
  
  const channelMap = {
    'bein SPORTS HD1': 'bein-sports-hd1',
    'bein SPORTS HD2': 'bein-sports-hd2',
    'bein SPORTS HD3': 'bein-sports-hd3',
    'SSC 1': 'ssc-1',
    'SSC 2': 'ssc-2',
    'On Time Sports': 'on-time-sports',
    'Alkass': 'al-kass'
  };
  
  const channelFile = channelMap[channelName];
  
  if (channelFile) {
    logMatchView(matchId, channelName);
    window.location.href = watch.html?id=${matchId}&channel=${channelFile};
  } else {
    showToast('This channel support is coming soon', 'info');
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
  showToast('Cache cleared successfully', 'success');
  setTimeout(() => location.reload(), 1000);
};
