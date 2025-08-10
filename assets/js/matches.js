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
 * Creates the HTML for a single, clickable match card that links externally.
 * @param {object} match The match data.
 * @returns {string} The HTML string for the match card.
 */
function renderMatch(match) {
  const homeLogo = match.homeTeam.logo || 'assets/images/default-logo.png';
  const awayLogo = match.awayTeam.logo || 'assets/images/default-logo.png';

  // Create the HTML for extra details (channel, commentator)
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

  // The entire card is now a link that opens in a new tab
  return `
    <a href="${match.matchLink}" target="_blank" rel="noopener noreferrer" class="match-card-link">
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
            <img src="${awayLogo}" alt="${match.awayTeam.name}" loading="lazy" onerror="this.onerror=null; this.src='assets.images/default-logo.png';">
            <span class="team-name">${match.awayTeam.name}</span>
          </div>
        </div>
        ${matchDetailsHTML.trim() ? `<div class="match-details-extra">${matchDetailsHTML}</div>` : ''}
      </article>
    </a>
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

  // Filter for featured matches (e.g., evening matches from today)
  const featuredMatches = todayMatches.filter(match => {
    try {
      const [timePart, ampm] = match.time.split(' ');
      if (!ampm) return false;
      let [hours] = timePart.split(':').map(Number);
      if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      return hours >= 19; // 7 PM or later
    } catch (e) {
      return false;
    }
  });
  
  renderSection(DOM.featuredContainer, featuredMatches, 'لا توجد مباريات مسائية اليوم.');
  
  // Render Today's Key Matches (Broadcast Section)
  const keyTodayMatches = todayMatches.slice(0, 5);
  renderSection(DOM.broadcastContainer, keyTodayMatches, 'لا توجد مباريات هامة اليوم.');

  // Render Tabs for All Today's & Tomorrow's Matches
  renderSection(DOM.todayContainer, todayMatches, 'لا توجد مباريات مجدولة اليوم.');
  renderSection(DOM.tomorrowContainer, tomorrowMatches, 'لا توجد مباريات مجدولة غداً.');
}

/**
 * Sets up the tab switching logic.
 */
function setupTabs() {
    const handleTabClick = (activeTab, inactiveTab, activeContainer, inactiveContainer) => {
        if (!activeTab || !inactiveTab || !activeContainer || !inactiveContainer) return;
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
