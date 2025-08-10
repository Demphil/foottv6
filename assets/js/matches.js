import { getTodayMatches, getTomorrowMatches } from './api.js';

// DOM elements mapping from index.html
const DOM = {
  featuredContainer: document.getElementById('featured-matches'),
  broadcastContainer: document.getElementById('broadcast-matches'), // For today's key matches
  todayContainer: document.getElementById('today-matches'),
  tomorrowContainer: document.getElementById('tomorrow-matches'),
  loadingScreen: document.getElementById('loading'),
  todayTab: document.getElementById('today-tab'),
  tomorrowTab: document.getElementById('tomorrow-tab'),
};

/**
 * Hides the main loading spinner.
 */
function hideLoading() {
  if (DOM.loadingScreen) DOM.loadingScreen.style.display = 'none';
}

/**
 * Creates the HTML for a single match card.
 * @param {object} match The match data.
 * @returns {string} The HTML string for the match card.
 */
function renderMatch(match) {
  // Fallback for missing logos to prevent broken images
  const homeLogo = match.homeTeam.logo || 'assets/images/default-logo.png';
  const awayLogo = match.awayTeam.logo || 'assets/images/default-logo.png';

  return `
    <div class="match-card">
      <div class="league-info">
          <span>${match.league}</span>
      </div>
      <div class="teams">
        <div class="team">
          <img src="${homeLogo}" alt="${match.homeTeam.name}" onerror="this.onerror=null; this.src='assets/images/default-logo.png';">
          <span class="team-name">${match.homeTeam.name}</span>
        </div>
        <div class="match-info">
          <span class="score">${match.score}</span>
          <span class="time">${match.time}</span>
        </div>
        <div class="team">
          <img src="${awayLogo}" alt="${match.awayTeam.name}" onerror="this.onerror=null; this.src='assets/images/default-logo.png';">
          <span class="team-name">${match.awayTeam.name}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders a "no matches found" message into a container.
 * @param {HTMLElement} container The container to render the message in.
 * @param {string} message The message to display.
 */
function renderNoMatches(container, message) {
    if (container) {
        container.innerHTML = `<div class="no-matches"><i class="fas fa-futbol"></i><p>${message}</p></div>`;
    }
}

/**
 * Main function to load data and render all match sections.
 */
async function loadAndRenderMatches() {
  // Fetch today's and tomorrow's matches in parallel for speed
  const [todayMatches, tomorrowMatches] = await Promise.all([
    getTodayMatches(),
    getTomorrowMatches()
  ]);

  // Once data is fetched, hide the main loader
  hideLoading();

  // 1. Render Featured/Evening Matches
  const eveningMatches = todayMatches.filter(match => {
    const hour = parseInt(match.time.split(':')[0], 10) || 0;
    return hour >= 19; // 7 PM or later
  });
  if (DOM.featuredContainer) {
      if (eveningMatches.length > 0) {
        DOM.featuredContainer.innerHTML = eveningMatches.map(renderMatch).join('');
      } else {
        renderNoMatches(DOM.featuredContainer, 'لا توجد مباريات مسائية اليوم.');
      }
  }

  // 2. Render Broadcast/Key Matches (e.g., first 5 of the day)
  if (DOM.broadcastContainer) {
      const keyMatches = todayMatches.slice(0, 5); // Show up to 5 key matches
      if (keyMatches.length > 0) {
          DOM.broadcastContainer.innerHTML = keyMatches.map(renderMatch).join('');
      } else {
          renderNoMatches(DOM.broadcastContainer, 'لا توجد مباريات هامة اليوم.');
      }
  }

  // 3. Render All Today's Matches Tab
  if (DOM.todayContainer) {
    if (todayMatches.length > 0) {
      DOM.todayContainer.innerHTML = todayMatches.map(renderMatch).join('');
    } else {
      renderNoMatches(DOM.todayContainer, 'لا توجد مباريات مجدولة اليوم.');
    }
  }

  // 4. Render All Tomorrow's Matches Tab
  if (DOM.tomorrowContainer) {
    if (tomorrowMatches.length > 0) {
      DOM.tomorrowContainer.innerHTML = tomorrowMatches.map(renderMatch).join('');
    } else {
      renderNoMatches(DOM.tomorrowContainer, 'لا توجد مباريات مجدولة غداً.');
    }
  }
}

/**
 * Sets up the tab switching logic.
 */
function setupTabs() {
    DOM.todayTab?.addEventListener('click', () => {
        DOM.todayTab.classList.add('active');
        DOM.tomorrowTab.classList.remove('active');
        DOM.todayContainer.style.display = 'grid'; // Or 'block' depending on your CSS
        DOM.tomorrowContainer.style.display = 'none';
    });

    DOM.tomorrowTab?.addEventListener('click', () => {
        DOM.tomorrowTab.classList.add('active');
        DOM.todayTab.classList.remove('active');
        DOM.tomorrowContainer.style.display = 'grid'; // Or 'block'
        DOM.todayContainer.style.display = 'none';
    });
}

// Start the process when the page is ready
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    loadAndRenderMatches();
});
