const puppeteer = require('puppeteer');
const { config, assertAllowed } = require('./config');

const AD_HOSTS = new Set([
  'monetag.com', 'popads.net', 'propellerads.com', 'popcash.net', 'adsterra.com', 'onclicka.com'
]);

function isAdUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return [...AD_HOSTS].some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return true;
  }
}

function isMediaUrl(value) {
  return /\.(m3u8|mp4)(?:$|[?#])/i.test(value);
}

async function scrapeMatch(matchUrl) {
  assertAllowed(matchUrl, config.sourceHosts, 'match URL');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  const candidates = new Set();

  const collect = (value) => {
    if (!value || isAdUrl(value) || !isMediaUrl(value)) return;
    try { assertAllowed(value, config.mediaHosts, 'media URL'); candidates.add(value); } catch {}
  };

  page.on('response', (response) => collect(response.url()));
  page.on('frameattached', (frame) => collect(frame.url()));
  try {
    await page.goto(matchUrl, { waitUntil: 'networkidle2', timeout: config.timeoutMs });
    await page.evaluate(() => {
      document.querySelectorAll('button, [role="button"], .play, .play-button').forEach((element) => element.click());
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    for (const frame of page.frames()) collect(frame.url());
  } finally {
    await browser.close();
  }
  return [...candidates];
}

module.exports = { scrapeMatch, isAdUrl, isMediaUrl };
