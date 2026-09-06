require('dotenv').config({ path: require('node:path').resolve(process.cwd(), '.env') });

const cron = require('node-cron');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { config } = require('./config');
const { loadAllowlist } = require('./allowlist');
const { loadSources, sourceHosts } = require('./source-registry');
const { saveStaging } = require('./supabase-storage');

const MATCH_SELECTORS = '.AY_Match, .match-container, .match-card, .match-item, article[class*="match"], article.match, [data-match-id], [data-match]';
const TEAM_SELECTORS = {
  home: ['.right-team .team-name', '.home-team .team-name', '.team-home .team-name', '.team1 .team-name', '.MT_Team.TM1 .TM_Name', '.TM1 .TM_Name', '[data-team="home"] .team-name', '[data-team="home"] .TM_Name'],
  away: ['.left-team .team-name', '.away-team .team-name', '.team-away .team-name', '.team2 .team-name', '.MT_Team.TM2 .TM_Name', '.TM2 .TM_Name', '[data-team="away"] .team-name', '[data-team="away"] .TM_Name']
};
const CONTAINER_SELECTORS = {
  home: ['.right-team', '.home-team', '.team-home', '.team1', '.MT_Team.TM1', '.TM1', '[data-team="home"]'],
  away: ['.left-team', '.away-team', '.team-away', '.team2', '.MT_Team.TM2', '.TM2', '[data-team="away"]']
};
const TRUSTED_METADATA_SOURCES = new Set(['yallashoot2day', 'm8nstar', 'shooot', 'yacinee-tv']);
const BROWSER_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9,ar;q=0.8',
  'accept-encoding': 'gzip, deflate, br',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'sec-ch-ua': '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  referer: 'https://www.google.com/'
};

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sameTeam(left, right) {
  return clean(left).normalize('NFKC').toLocaleLowerCase('ar') === clean(right).normalize('NFKC').toLocaleLowerCase('ar');
}

function slug(value) {
  return clean(value).toLocaleLowerCase('ar')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function matchIdFor(homeTeam, awayTeam, scheduledAt = '') {
  const date = scheduledAt ? scheduledAt.slice(0, 10) : sourceToday('Africa/Casablanca');
  const dateValue = typeof date === 'string' ? date : `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  return `${slug(homeTeam)}-${slug(awayTeam)}-${dateValue}`;
}

function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]));
}

function localToUtcIso(year, month, day, hour, minute, timeZone) {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const actual = zonedParts(new Date(localAsUtc), timeZone);
  const offsetAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
  return new Date(localAsUtc - (offsetAsUtc - localAsUtc)).toISOString();
}

function sourceToday(timeZone) {
  const today = zonedParts(new Date(), timeZone);
  return { year: today.year, month: today.month, day: today.day };
}

function extractTime(text) {
  const match = clean(text).match(/(?:^|\D)([01]?\d|2[0-3])\s*:\s*([0-5]\d)(?!\d)/);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

function teamsFromTitle(title) {
  const value = clean(title);
  const match = value.match(/(?:مباراة|match)\s+(.+?)\s+(?:و|vs|v|-|ضد)\s+(.+?)(?=\s+(?:بتاريخ|في|اليوم|غداً|tomorrow|today)(?:\s|$)|$)/i);
  if (!match) return null;
  const homeTeam = clean(match[1]);
  const awayTeam = clean(match[2]);
  return homeTeam && awayTeam ? { homeTeam, awayTeam } : null;
}

function imageUrl($, element, baseUrl) {
  if (!element) return '';
  const raw = $(element).attr('data-src') || $(element).attr('data-lazy-src') || $(element).attr('src') || '';
  if (!raw || /^data:/i.test(raw) || /(?:default|placeholder|no[-_ ]?image)/i.test(raw)) return '';
  try {
    const url = new URL(raw, baseUrl);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function first($, root, selectors) {
  for (const selector of selectors) {
    const element = $(root).find(selector).first()[0];
    if (element) return element;
  }
  return null;
}

function parseSchedule(html, source) {
  const $ = cheerio.load(html);
  const jobs = [];
  $(MATCH_SELECTORS).each((_, card) => {
    const homeElement = first($, card, TEAM_SELECTORS.home);
    const awayElement = first($, card, TEAM_SELECTORS.away);
    const homeContainer = first($, card, CONTAINER_SELECTORS.home) || homeElement;
    const awayContainer = first($, card, CONTAINER_SELECTORS.away) || awayElement;
    const title = clean($(card).attr('title') || $(card).find('a[title]').first().attr('title') || $(card).text());
    const titleTeams = teamsFromTitle(title);
    const homeTeam = clean($(homeElement || homeContainer).text()) || titleTeams?.homeTeam || '';
    const awayTeam = clean($(awayElement || awayContainer).text()) || titleTeams?.awayTeam || '';
    if (!homeTeam || !awayTeam) {
      console.log('[METADATA] Skipped:', title, 'Reason:', !homeTeam || !awayTeam ? 'Missing team name' : 'Duplicate teams');
      return;
    }
    if (homeTeam.trim() === awayTeam.trim()) {
      console.log('[METADATA] Skipped:', title, 'Reason: Duplicate teams');
      return;
    }
    if (sameTeam(homeTeam, awayTeam)) {
      console.log('[METADATA] Skipped:', title, 'Reason: Duplicate teams after normalization');
      return;
    }

    const link = $(card).find('a[href]').map((__, anchor) => $(anchor).attr('href')).get().find((href) => href && href !== '#');
    const time = extractTime($(card).text());
    const date = sourceToday(source.timeZone);
    const scheduledAt = time ? localToUtcIso(date.year, date.month, date.day, time.hour, time.minute, source.timeZone) : '';
    const channel = clean($(card).find('.channel, .match-channel, [class*="channel"], .match-info li, [data-channel]').first().text());
    const league = clean($(card).find('.league, .match-league, .match-info').last().text());

    jobs.push({
      matchId: matchIdFor(homeTeam, awayTeam, scheduledAt),
      homeTeam,
      awayTeam,
      homeLogo: imageUrl($, $(homeContainer).find('img').first()[0], source.listUrl),
      awayLogo: imageUrl($, $(awayContainer).find('img').first()[0], source.listUrl),
      time: time ? `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}` : '--:--',
      scheduledAt,
      league,
      channel,
      sourceName: source.name,
      matchUrl: link ? new URL(link, source.listUrl).href : ''
    });
  });
  return jobs;
}

async function fetchSchedule(source) {
  const referer = new URL(source.listUrl).origin + '/';
  const headers = { ...BROWSER_HEADERS, referer };
  const response = await fetch(source.listUrl, { headers, redirect: 'follow' });
  if (response.ok) return response.text();
  if (![401, 403, 429].includes(response.status)) throw new Error(`HTTP ${response.status}`);
  console.warn(`[METADATA] ${source.name}: fetch returned HTTP ${response.status}; trying stealth HTML fallback`);
  return fetchScheduleWithBrowser(source);
}

async function fetchScheduleWithBrowser(source) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      protocolTimeout: Math.max(config.timeoutMs, 30000),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    try {
      await page.setExtraHTTPHeaders({ ...BROWSER_HEADERS, referer: new URL(source.listUrl).origin + '/' });
      await page.setUserAgent(BROWSER_HEADERS['user-agent']);
      await page.goto(source.listUrl, { waitUntil: 'domcontentloaded', timeout: config.timeoutMs });
      return await page.content();
    } finally {
      await page.close().catch(() => {});
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function runMetadataOnce() {
  const allowlist = await loadAllowlist();
  const sources = await loadSources();
  allowlist.sourceHosts.push(...sourceHosts(sources));
  allowlist.sourceHosts = [...new Set(allowlist.sourceHosts)];
  const best = new Map();

  const trustedSources = sources.filter((source) => TRUSTED_METADATA_SOURCES.has(source.name) && source.metadataQuality === 'trusted');
  const metadataSources = trustedSources.length ? trustedSources : sources.filter((source) => source.metadataQuality !== 'fallback');
  for (const source of metadataSources) {
    try {
      const jobs = parseSchedule(await fetchSchedule(source), source);
      for (const job of jobs) {
        const previous = best.get(job.matchId);
        if (!previous || (job.homeLogo && job.awayLogo && !(previous.homeLogo && previous.awayLogo))) best.set(job.matchId, job);
      }
      console.log(`[METADATA] ${source.name}: ${jobs.length} match(es)`);
    } catch (error) {
      console.warn(`[METADATA] ${source.name} failed: ${error.message}`);
    }
  }

  const jobs = [...best.values()].slice(0, config.autoDiscoverLimit);
  for (const job of jobs) {
    await saveStaging(job.matchId, {
      ...job,
      status: 'METADATA_READY',
      resolverStatus: 'PENDING',
      streams: [],
      sourceReports: [],
      updatedBy: 'metadata-scraper'
    });
  }
  console.log(`[METADATA] Saved ${jobs.length} metadata record(s) to ${config.stagingCollection}`);
  return jobs;
}

if (require.main === module) {
  if (process.argv.includes('--once')) runMetadataOnce().catch((error) => { console.error(error.stack); process.exitCode = 1; });
  else { cron.schedule(config.cron, () => runMetadataOnce().catch((error) => console.error(error.stack))); console.log(`[METADATA] Scheduler active: ${config.cron}`); }
}

module.exports = { parseSchedule, runMetadataOnce };
