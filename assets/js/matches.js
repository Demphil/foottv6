// matches.js - Full Script
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

// ... [The rest of the file remains unchanged and already complete]
