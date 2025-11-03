 import { getTodayMatches, getTomorrowMatches } from './api.js';
// إعادة استيراد قاعدة بيانات الروابط الخاصة بك
import { streamLinks } from './streams.js';
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
 * Creates the HTML for a single, intelligent match card that uses streams.js.
 * @param {object} match The match data object from api.js.
 * @returns {string} The HTML string for the match card.
 */
function renderMatch(match) {
  // فحص وقائي لمنع الأخطاء إذا كانت بيانات المباراة غير مكتملة
  if (!match || !match.homeTeam || !match.awayTeam) {
    console.error("Skipping malformed match object:", match);
    return ''; // إرجاع نص فارغ لتجنب عرض بطاقة خاطئة
  }

  const homeLogo = match.homeTeam.logo || 'assets/images/default-logo.png';
  const awayLogo = match.awayTeam.logo || 'assets/images/default-logo.png';

  // --- المنطق الذكي لتحديد الرابط الصحيح من streams.js ---
  const matchSpecificKey = `${match.homeTeam.name}-${match.awayTeam.name}`;
  const watchUrl = streamLinks[match.channel] || streamLinks[matchSpecificKey];
  const isClickable = watchUrl ? 'clickable' : 'not-clickable';

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
  // بناء بطاقة المباراة النهائية
  return `
    <a href="${watchUrl || '#'}" target="_blank" rel="noopener noreferrer" class="match-card-link ${isClickable}">
      <article class="match-card">
      ${!watchUrl ? '<span class="no-stream-badge">Stream Unavailable</span>' : ''}

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
    </a>
  `;
}

/**
 * Renders a list of matches into a container or shows a "no matches" message.
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

  const featuredMatches = todayMatches.filter(match => {
    try {
      // The time is now 24-hour format, so filtering is simpler
      const [hours] = match.time.split(':').map(Number);
      return hours >= 16; // 4 PM or later in Morocco time
    } catch (e) {
      return false;
    }
  });

  // Using English messages for the UI
  renderSection(DOM.featuredContainer, featuredMatches, 'No evening matches today.');
  renderSection(DOM.broadcastContainer, todayMatches.slice(0, 10), 'No key matches scheduled for today.');
  renderSection(DOM.todayContainer, todayMatches, 'No matches scheduled for today.');
  renderSection(DOM.tomorrowContainer, tomorrowMatches, 'No matches scheduled for tomorrow.');
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
        alert("Failed to load data. Please check your internet connection and try again.");
    });
});
