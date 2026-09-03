const puppeteer = require('puppeteer');
const { config, assertAllowed } = require('./config');

const AD_HOSTS = new Set([
  'monetag.com', 'popads.net', 'propellerads.com', 'popcash.net', 'adsterra.com', 'onclicka.com'
]);

// نمط استبعاد الملفات الساكنة للموقع
const IGNORED_EXTENSIONS = /\.(css|png|jpg|jpeg|webp|gif|svg|woff|woff2|ttf|eot|js)(\?.*)?$/i;

function launchOptions(extra = {}) {
  return {
    headless: true,
    args: ['--no-sandbox'],
    ...(config.browserExecutablePath ? { executablePath: config.browserExecutablePath } : {}),
    ...extra
  };
}

async function discoverJobs(sources, allowlist) {
  const browser = await puppeteer.launch(launchOptions());
  const jobs = [];
  const seen = new Set();
  try {
    for (const source of sources) {
      if (jobs.length >= config.autoDiscoverLimit) break;
      const page = await browser.newPage();
      try {
        assertAllowed(source.listUrl, allowlist.sourceHosts, 'source list URL');
        await page.goto(source.listUrl, { waitUntil: 'networkidle2', timeout: config.timeoutMs });
        const cards = await page.$$eval(
          '.AY_Match, .match-container, .match-card, .match-item, article[class*="match"], [data-match-id], [data-match]',
          (elements) => elements.map((card) => {
            const text = (selector) => card.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || '';
            const link = [...card.querySelectorAll('a[href]')].map((a) => a.href).find((href) => href && !href.endsWith('#')) || '';
            return {
              homeTeam: text('.right-team .team-name, .home-team .team-name, .team1 .team-name, .MT_Team.TM1 .TM_Name, .TM1 .TM_Name'),
              awayTeam: text('.left-team .team-name, .away-team .team-name, .team2 .team-name, .MT_Team.TM2 .TM_Name, .TM2 .TM_Name'),
              channel: text('.channel, .match-channel, .match-info li:first-child'),
              matchUrl: link
            };
          })
        );
        for (const card of cards) {
          if (!card.homeTeam || !card.awayTeam) continue;
                   const matchId = `${card.homeTeam}_vs_${card.awayTeam}`.toLocaleLowerCase('ar').replace(/\s+/g, '_');
          if (seen.has(matchId)) continue;
          seen.add(matchId);
          jobs.push({ matchId, homeTeam: card.homeTeam, awayTeam: card.awayTeam, channel: card.channel, sourceName: source.name });
          if (jobs.length >= config.autoDiscoverLimit) break;
        }
      } catch (error) {
        console.warn(`[MEDIA QA] auto-discovery ${source.name}: ${error.message}`);
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    await browser.close();
  }
  return jobs;
}

function isAdUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return [...AD_HOSTS].some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return true;
  }
}

function isMediaUrl(value) {
  if (!value) return false;
  return /\.(m3u8|mp4)(?:$|[?#])/i.test(value) ||
         /\/(embed|player|live|stream|b-\d+|watch)/i.test(value) ||
         /\?m=\d+/i.test(value);
}

function normalize(value) {
  return String(value || '').toLocaleLowerCase('ar').replace(/\s+/g, ' ').trim();
}

async function resolveMatchUrl(job, sources, allowlist) {
  const result = await resolveMatchUrls(job, sources, allowlist);
  if (!result.matches.length) throw new Error(`No source matched ${job.homeTeam} vs ${job.awayTeam}`);
  return result.matches[0].matchUrl;
}

async function resolveMatchUrls(job, sources, allowlist) {
  const preferred = job.sourceName ? sources.find((item) => item.name === job.sourceName) : null;
  if (job.sourceName && !preferred) throw new Error(`Unknown authorized source: ${job.sourceName}`);
  const orderedSources = preferred ? [preferred, ...sources.filter((item) => item !== preferred)] : sources;
  const failures = [];
  const matches = [];

  for (const source of orderedSources) {
    try {
      const matchUrl = await resolveMatchUrlFromSource(job, source, allowlist);
      if (matchUrl) matches.push({ sourceName: source.name, matchUrl });
    } catch (error) {
      failures.push(`${source.name}: ${error.message}`);
    }
  }

  if (!matches.length) {
    throw new Error(`No source matched ${job.homeTeam} vs ${job.awayTeam}. ${failures.join(' | ')}`);
  }
  return { matches, failures };
}

async function resolveMatchUrlFromSource(job, source, allowlist) {
  assertAllowed(source.listUrl, allowlist.sourceHosts, 'source list URL');
  const browser = await puppeteer.launch(launchOptions());
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
  const browser = await puppeteer.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  const candidates = new Set();

  const collect = (value) => {
    if (!value || isAdUrl(value) || IGNORED_EXTENSIONS.test(value)) return;
    try {
      const host = new URL(value).hostname.toLowerCase();
      
      // فحص المسموحية مع دعم النطاقات الفرعية (Subdomains)
      const isAllowed = allowlist.isAllowed
        ? allowlist.isAllowed(value, 'mediaHosts')
        : allowlist.mediaHosts.length === 0 || allowlist.mediaHosts.some((h) => host === h || host.endsWith('.' + h));

      if (isAllowed) candidates.add(value);
    } catch {}
  };

  page.on('response', (response) => {
    const url = response.url();
    if (isMediaUrl(url)) collect(url);
  });

  try {
    await page.goto(matchUrl, { waitUntil: 'networkidle2', timeout: config.timeoutMs });

    // 1. استخراج الروابط المباشرة والمخفية داخل خصائص التبويبات (data-src, data-url, data-stream)
    const dynamicSrcs = await page.$$eval(
      'iframe, [data-src], [data-url], [data-stream], [data-player]',
      (elements) => elements.map((el) => {
        return el.src || el.getAttribute('data-src') || el.getAttribute('data-url') || el.getAttribute('data-stream') || el.getAttribute('data-player');
      }).filter((src) => src && !src.startsWith('javascript:'))
    );
    dynamicSrcs.forEach((src) => collect(src));

    // 2. النقر على أزرار التبويبات والسيرفرات لإنشاء المشغلات عند الطلب
    await page.evaluate(() => {
      const selectors = 'button, [role="button"], .play, .play-button, .btn-play, .server, [class*="server"], [data-src], [data-url]';
      document.querySelectorAll(selectors).forEach((element) => {
        try { element.click(); } catch (e) {}
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // 3. فحص كافة الإطارات المضمنة (Frames) بعد الضغط على السيرفرات
    for (const frame of page.frames()) {
      const frameUrl = frame.url();
      if (frameUrl && frameUrl !== 'about:blank' && frameUrl !== matchUrl) {
        collect(frameUrl);
      }
    }
  } finally {
    await browser.close();
  }
  return [...candidates];
}

module.exports = { scrapeMatch, resolveMatchUrl, resolveMatchUrls, discoverJobs, isAdUrl, isMediaUrl };
