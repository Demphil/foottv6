(function () {
  const SEARCH_ENGINE_UA = /\b(googlebot|bingbot|duckduckbot|slurp|yandexbot|baiduspider|applebot|facebookexternalhit|twitterbot|linkedinbot)\b/i;
  const AUTOMATION_UA = /\b(headlesschrome|phantomjs|selenium|playwright|puppeteer|python-requests|curl|wget|httpclient|scrapy|spider|crawler|bot)\b/i;

  function isLikelyAutomation() {
    const ua = navigator.userAgent || '';
    if (SEARCH_ENGINE_UA.test(ua)) return false;
    if (AUTOMATION_UA.test(ua)) return true;
    if (navigator.webdriver === true) return true;
    if (!ua.trim()) return true;
    return false;
  }

  function disableLinks() {
    document.documentElement.classList.add('bot-readonly');
    document.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return;
      link.dataset.readonlyHref = href;
      link.removeAttribute('href');
      link.removeAttribute('target');
      link.setAttribute('aria-disabled', 'true');
      link.setAttribute('role', 'link');
    });
  }

  function showNotice() {
    if (document.getElementById('bot-readonly-notice')) return;
    const notice = document.createElement('div');
    notice.id = 'bot-readonly-notice';
    notice.textContent = 'تم تعطيل روابط المشاهدة لهذا المتصفح لحماية الموقع من النسخ الآلي.';
    document.body.prepend(notice);
  }

  function installReadOnlyMode() {
    disableLinks();
    showNotice();
    new MutationObserver(disableLinks).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function installStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .bot-readonly a[aria-disabled="true"] {
        pointer-events: none !important;
        cursor: not-allowed !important;
        opacity: .7 !important;
      }
      #bot-readonly-notice {
        position: sticky;
        top: 0;
        z-index: 10000;
        padding: 10px 14px;
        background: #111827;
        color: #ffd166;
        border-bottom: 1px solid #334155;
        text-align: center;
        font: 700 14px/1.5 Cairo, Tahoma, Arial, sans-serif;
      }
    `;
    document.head.appendChild(style);
  }

  if (!isLikelyAutomation()) return;

  installStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installReadOnlyMode, { once: true });
  } else {
    installReadOnlyMode();
  }
})();
