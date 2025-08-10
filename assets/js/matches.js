import { getTodayMatches, getTomorrowMatches } from './api.js';

// DOM elements mapping from index.html
const DOM = {
  featuredContainer: document.getElementById('featured-matches'),
  broadcastContainer: document.getElementById('broadcast-matches'),
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
 * Creates the HTML for a single match card, including extra details.
 * @param {object} match The match data.
 * @returns {string} The HTML string for the match card.
 */
function renderMatch(match) {
  const homeLogo = match.homeTeam.logo || 'assets/images/default-logo.png';
  const awayLogo = match.awayTeam.logo || 'assets/images/default-logo.png';

  // Create the HTML for extra details only if they exist.
  const matchDetailsHTML = `
    ${match.channel ? `
      <div class="match-detail-item">
        <i class="fas fa-tv" aria-hidden="true"></i>
        <span>${match.channel}</span>
      </div>
    ` : ''}
    ${match.commentator ? `
      <div class="match-detail-item">
        <i class="fas fa-microphone-alt" aria-hidden="true"></i>
        <span>${match.commentator}</span>
      </div>
    ` : ''}
  `;

  return `
    <article class="match-card" aria-label="Match between ${match.homeTeam.name} and ${match.awayTeam.name}">
      <div class="league-info">
          <span>${match.league}</span>
      </div>
      <div class="teams">
        <div class="team">
          <img src="${homeLogo}" alt="${match.homeTeam.name}" loading="lazy" onerror="this.onerror=null; this.src='assets/images/default-logo.png';">
          <span class="team-name">${match.homeTeam.name}</span>
        </div>
        <div class="match-info">
          <span class="score">${match.score}</span>
          <span class="time">${match.time}</span>
        </div>
        <div class="team">
          <img src="${awayLogo}" alt="${match.awayTeam.name}" loading="lazy" onerror="this.onerror=null; this.src='assets/images/default-logo.png';">
          <span class="team-name">${match.awayTeam.name}</span>
        </div>
      </div>
      ${matchDetailsHTML.trim() ? `<div class="match-details-extra">${matchDetailsHTML}</div>` : ''}
    </article>
  `;
}

/**
 * Renders a list of matches into a container or shows a "no matches" message.
 * @param {HTMLElement} container The container element.
 * @param {Array} matches The array of matches to render.
 * @param {string} message The message to show if there are no matches.
 */
function renderSection(container, matches, message) {
    if (!container) return;

    if (matches && matches.length > 0) {
        container.innerHTML = matches.map(renderMatch).join('');
    } else {
        container.innerHTML = `<div class="no-matches"><i class="fas fa-futbol"></i><p>${message}</p></div>`;
    }
}

/**
 * Main function to load data and render all match sections.
 */
async function loadAndRenderMatches() {
  const [todayMatches, tomorrowMatches] = await Promise.all([
    getTodayMatches(),
    getTomorrowMatches()
  ]);

  hideLoading();

  // --- 1. Filter and Render Featured Matches (Correct Timezone Logic) ---
  const allMatches = [...todayMatches, ...tomorrowMatches];

  const featuredMatches = allMatches.filter(match => {
    try {
      // Example time from source: "08:00 PM"
      const [timePart, ampm] = match.time.split(' ');
      if (!ampm) return false; // Skip if time format is not as expected

      let [hours] = timePart.split(':').map(Number);

      // Convert to 24-hour format
      if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
      
      // Source time is Riyadh (GMT+3), which is 2 hours ahead of Morocco time (GMT+1).
      // To find matches at 6 PM (18:00) Morocco time or later, we look for matches
      // at 8 PM (20:00) Riyadh time or later.
      const RIYADH_HOUR_THRESHOLD = 20;

      return hours >= RIYADH_HOUR_THRESHOLD;
    } catch (e) {
      return false;
    }
  });
  
  renderSection(DOM.featuredContainer, featuredMatches, 'لا توجد مباريات مميزة قادمة.');

  // --- 2. Render Today's Key Matches (Broadcast Section) ---
  const keyTodayMatches = todayMatches.slice(0, 5); // Show first 5 matches of the day
  renderSection(DOM.broadcastContainer, keyTodayMatches, 'لا توجد مباريات هامة اليوم.');

  // --- 3. Render Tabs for All Today's & Tomorrow's Matches ---
  renderSection(DOM.todayContainer, todayMatches, 'لا توجد مباريات مجدولة اليوم.');
  renderSection(DOM.tomorrowContainer, tomorrowMatches, 'لا توجد مباريات مجدولة غداً.');
}

/**
 * Sets up the tab switching logic.
 */
function setupTabs() {
    const handleTabClick = (activeTab, inactiveTab, activeContainer, inactiveContainer) => {
        activeTab.classList.add('active');
        inactiveTab.classList.remove('active');
        activeContainer.style.display = 'grid';
        inactiveContainer.style.display = 'none';
    };

    DOM.todayTab?.addEventListener('click', () => {
        handleTabClick(DOM.todayTab, DOM.tomorrowTab, DOM.todayContainer, DOM.tomorrowContainer);
    });

    DOM.tomorrowTab?.addEventListener('click', () => {
        handleTabClick(DOM.tomorrowTab, DOM.todayTab, DOM.tomorrowContainer, DOM.todayContainer);
    });
}

// Start the process when the page is ready
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    loadAndRenderMatches().catch(error => {
        console.error("An error occurred while loading matches:", error);
        hideLoading();
        alert("فشل تحميل البيانات. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.");
    });
});
