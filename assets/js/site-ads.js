(() => {
  const CLICK_KEY = 'fraja-click-ad-v1';
  const CLICK_URL = 'https://omg10.com/4/11865233';
  const CLICK_COOLDOWN_MS = 5 * 60 * 1000;
  const displayAds = [
    { src: 'https://al5sm.com/tag.min.js', zone: '11865231' },
    { src: 'https://al5sm.com/tag.min.js', zone: '11865230' },
    { src: 'https://quge5.com/88/tag.min.js', zone: '284665' },
  ];

  function loadDisplayAds() {
    const host = document.body || document.documentElement;
    if (!host) return;
    for (const ad of displayAds) {
      const script = document.createElement('script');
      script.async = true;
      script.dataset.cfasync = 'false';
      script.dataset.zone = ad.zone;
      script.src = ad.src;
      host.appendChild(script);
    }
  }

  function canOpenClickAd(now = Date.now()) {
    try {
      const lastAt = Number(localStorage.getItem(CLICK_KEY) || 0);
      return !lastAt || now - lastAt >= CLICK_COOLDOWN_MS;
    } catch {
      return false;
    }
  }

  function markClickAd(now = Date.now()) {
    try { localStorage.setItem(CLICK_KEY, String(now)); } catch {}
  }

  function armClickAd() {
    document.addEventListener('click', () => {
      const now = Date.now();
      if (!canOpenClickAd(now)) return;
      markClickAd(now);
      try { window.open(CLICK_URL, '_blank', 'noopener,noreferrer'); } catch {}
    }, { capture: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadDisplayAds();
      armClickAd();
    }, { once: true });
  } else {
    loadDisplayAds();
    armClickAd();
  }
})();
