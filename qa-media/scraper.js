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

function normalize(value) {
  return String(value || '').toLocaleLowerCase('ar').replace(/\s+/g, ' ').trim();
}

async function resolveMatchUrl(job, sources, allowlist) {
  const preferred = job.sourceName ? sources.find((item) => item.name === job.sourceName) : null;
  if (job.sourceName && !preferred) throw new Error(`Unknown authorized source: ${job.sourceName}`);
  const orderedSources = preferred ? [preferred, ...sources.filter((item) => item !== preferred)] : sources;
  const failures = [];

  for (const source of orderedSources) {
    try {
      const matchUrl = await resolveMatchUrlFromSource(job, source, allowlist);
      if (matchUrl) return matchUrl;
    } catch (error) {
      failures.push(`${source.name}: ${error.message}`);
    }
  }

  throw new Error(`No source matched ${job.homeTeam} vs ${job.awayTeam}. ${failures.join(' | ')}`);
}

async function resolveMatchUrlFromSource(job, source, allowlist) {
  assertAllowed(source.listUrl, allowlist.sourceHosts, 'source list URL');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto(source.listUrl, { waitUntil: 'networkidle2', timeout: config.timeoutMs });
    const candidates = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((anchor) => ({
      href: anchor.href,
      text: anchor.textContent || '',
      title: anchor.title || ''
    })));
    const home = normalize(job.homeTeam);
    const away = normalize(job.awayTeam);
    const channel = normalize(job.channel);
    const teamMatch = (candidate) => {
      const text = normalize(`${candidate.text} ${candidate.title}`);
      return text.includes(home) && text.includes(away);
    };
    const teamCandidates = candidates.filter(teamMatch);
    const match = (channel && teamCandidates.find((candidate) => {
      const text = normalize(`${candidate.text} ${candidate.title}`);
      return text.includes(channel);
    })) || teamCandidates[0];
    if (match) {
      assertAllowed(match.href, allowlist.sourceHosts, 'resolved match URL');
      return match.href;
    }

    // Some sources render a card without an href and create the player route
    // only after the visitor clicks the card. Follow that same navigation.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const clickableIndex = await page.evaluate(({ home, away, channel }) => {
      const normalizeText = (value) => String(value || '').toLocaleLowerCase('ar').replace(/\s+/g, ' ').trim();
      const nodes = [...document.querySelectorAll('a,button,[role="button"],[onclick],article,div')];
      return nodes.findIndex((node) => {
        const text = normalizeText(`${node.textContent} ${node.getAttribute('title') || ''}`);
        return node.matches('a,button,[role="button"],[onclick]')
          && text.includes(home) && text.includes(away) && (!channel || text.includes(channel));
      });
    }, { home, away, channel });

    if (clickableIndex < 0) throw new Error(`Match not found: ${job.homeTeam} vs ${job.awayTeam}`);
    const clickableNodes = await page.$$('a,button,[role="button"],[onclick]');
    const clickedNode = clickableNodes[clickableIndex];
    if (!clickedNode) throw new Error('Match control could not be selected');

    let popupPage = null;
    page.once('popup', (popup) => { popupPage = popup; });
    await clickedNode.click({ delay: 80 });
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: config.timeoutMs }).catch(() => null),
      new Promise((resolve) => setTimeout(resolve, 2500))
    ]);
    const destination = popupPage || page;
    if (popupPage) await popupPage.waitForNetworkIdle({ idleTime: 500, timeout: config.timeoutMs }).catch(() => {});
    const resolvedUrl = destination.url();
    assertAllowed(resolvedUrl, allowlist.sourceHosts, 'resolved match URL');
    return resolvedUrl;
  } finally {
    await browser.close();
  }
}

async function scrapeMatch(matchUrl, allowlist) {
  assertAllowed(matchUrl, allowlist.sourceHosts, 'match URL');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  const candidates = new Set();

  const collect = (value) => {
    if (!value || isAdUrl(value) || !isMediaUrl(value)) return;
    try {
      const host = new URL(value).hostname.toLowerCase();
      const configured = allowlist.mediaHosts.length === 0 || allowlist.mediaHosts.includes(host);
      if (configured) candidates.add(value);
    } catch {}
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

module.exports = { scrapeMatch, resolveMatchUrl, isAdUrl, isMediaUrl };
