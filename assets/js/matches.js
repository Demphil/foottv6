import { getTodayMatches, getTomorrowMatches } from './api.js';
// استيراد قاعدة بيانات روابط Blogger الخاصة بك
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
 * Creates the HTML for a single, intelligent match card.
 * @param {object} match The match data.
 * @returns {string} The HTML string for the match card.
 */
unction renderMatch(match) {
  const homeLogo = match.homeTeam.logo || 'assets/images/default-logo.png';
  const awayLogo = match.awayTeam.logo || 'assets/images/default-logo.png';

  // --- هذا هو الجزء الجديد للمساعدة ---
  // 1. إنشاء المفتاح الخاص بالمباراة
  const matchSpecificKey = `${match.homeTeam.name}-${match.awayTeam.name}`;
  
  // 2. طباعة المفتاح في الـ Console لتراه بوضوح
  console.log(`المفتاح لهذه المباراة هو: "${matchSpecificKey}"`);

  // 3. ابحث عن رابط البث
  const watchUrl = streamLinks[match.channel] || streamLinks[matchSpecificKey];
  const isClickable = watchUrl ? 'clickable' : 'not-clickable';

  const matchDetailsHTML = `
    ${match.channel ? `<div class="match-detail-item"><i class="fas fa-tv"></i><span>${match.channel}</span></div>` : ''}
    ${match.commentator ? `<div class="match-detail-item"><i class="fas fa-microphone-alt"></i><span>${match.commentator}</span></div>` : ''}
  `;

  return `
    <a href="${watchUrl || '#'}" target="_blank" rel="noopener noreferrer" class="match-card-link ${isClickable}">
      <article class="match-card">
        
        <div style="background: #000; color: #fff; padding: 5px; font-size: 12px; text-align: left; direction: ltr; margin-bottom: 10px; border-radius: 4px;">
          <strong>Debug Key:</strong> ${matchSpecificKey}
        </div>

        ${!watchUrl ? '<span class="no-stream-badge">البث غير متوفر</span>' : ''}
        
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
  renderSection(DOM.broadcastContainer, todayMatches.slice(0, 5), 'لا توجد مباريات هامة اليوم.');
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
