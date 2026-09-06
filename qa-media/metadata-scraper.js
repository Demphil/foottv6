require('dotenv').config({ path: require('node:path').resolve(process.cwd(), '.env') });

const cron = require('node-cron');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const { saveStaging } = require('./supabase-storage');

puppeteer.use(StealthPlugin());

// قراءة ملف المصادر المتعددة
const sourcesPath = path.join(__dirname, 'sources.json');
let sourcesList = [];
try {
  const sourcesData = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
  sourcesList = sourcesData.sources.filter(s => s.enabled);
} catch (error) {
  console.error('[METADATA] Error reading sources.json:', error.message);
  sourcesList = []; // Fallback
}

const MATCH_SELECTORS = '.match-container, .c3-card, #today .match-container, .albaflex > div, .match-item';
const CHANNEL_SELECTORS = ['.channel', '.match-channel', '.c3-channel', '.broadcast', '.broadcast-channel', '.tv-channel', '.channel-name', '.channel-info', '[data-channel]', '[data-broadcaster]'];
const LEAGUE_SELECTORS = ['.league', '.match-league', '.c3-league', '.competition', '.tournament', '.league-name'];

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function sameTeam(left, right) { return clean(left).normalize('NFKC').toLocaleLowerCase('ar') === clean(right).normalize('NFKC').toLocaleLowerCase('ar'); }
function absoluteUrl(value, baseUrl) { try { const url = new URL(value, baseUrl); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
function slug(value) { return clean(value).toLocaleLowerCase('ar').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, ''); }
function sourceDate(timeZone) { return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function first($, root, selectors) { for (const selector of selectors) { const item = $(root).find(selector).first()[0]; if (item) return item; } return null; }

function localTimeToIso(time, timeZone) {
  const tz = timeZone || 'Africa/Casablanca';
  const date = sourceDate(tz);
  const [hour, minute] = time.split(':').map(Number);
  const localTimestamp = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), hour, minute, 0);
  let estimate = new Date(localTimestamp);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(estimate);
    const values = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]));
    const displayedTimestamp = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
    estimate = new Date(localTimestamp - (displayedTimestamp - estimate.getTime()));
  }
  return estimate.toISOString();
}

function matchIdFor(homeTeam, awayTeam, scheduledAt, timeZone) { 
  return `${slug(homeTeam)}-${slug(awayTeam)}-${scheduledAt.slice(0, 10) || sourceDate(timeZone)}`; 
}

function parseSchedule(html, sourceConfig) {
  const $ = cheerio.load(html);
  const matches = [];

  $(MATCH_SELECTORS).each((_, card) => {
    const hitAnchor = $(card).find('a.hit, a[aria-label], a.match-link, a[href*="match"]').first();
    const ariaLabel = clean(hitAnchor.attr('aria-label') || '');
    const titleAttr = clean(hitAnchor.attr('title') || $(card).attr('title') || '');

    let homeTeam = '';
    let awayTeam = '';

    if (ariaLabel.includes('ضد') || ariaLabel.includes('vs') || ariaLabel.includes('v')) {
      const parts = ariaLabel.split(/\s+(?:vs|v|ضد|مباراة)\s+|\s+-\s+/i).map(clean);
      if (parts.length >= 2) {
        homeTeam = parts[0];
        awayTeam = parts[1];
      }
    }

    if (!homeTeam || !awayTeam) {
      const matchTitle = titleAttr.match(/مباراة\s+([^\s]+(?:\s+[^\s]+)*?)\s+(?:و|ضد|vs)\s+([^\s]+(?:\s+[^\s]+)*?)\s+بتاريخ/i);
      if (matchTitle) {
        homeTeam = clean(matchTitle[1]);
        awayTeam = clean(matchTitle[2]);
      }
    }

    if (!homeTeam || !awayTeam) {
      const rawNames = $(card).find('img[alt], .team-name').map((__, el) => $(el).attr('alt') || $(el).text()).get().map(clean).filter(Boolean);
      if (rawNames.length >= 2) {
        homeTeam = rawNames[0];
        awayTeam = rawNames[1];
      }
    }

    if (!homeTeam || !awayTeam || sameTeam(homeTeam, awayTeam)) return;

    const cardText = clean($(card).text());
    const timeMatch = cardText.match(/(?:^|\D)([01]?\d|2[0-3])\s*:\s*([0-5]\d)(?!\d)/);
    let time = timeMatch ? `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}` : '';
    let scheduledAt = time ? localTimeToIso(time, sourceConfig.timeZone) : '';

    if (!scheduledAt) {
      time = 'مباشر الآن';
      scheduledAt = localTimeToIso('00:00', sourceConfig.timeZone);
    }

    let league = '';
    let channel = '';

    const chyronSpan = clean($(card).find('.c3-chyron span, .match-info span').first().text());
    if (chyronSpan) {
      const parts = chyronSpan.split(/[·•\-]/).map(clean);
      if (parts.length >= 2) {
        league = parts[0];
        channel = parts[1];
      } else {
        league = chyronSpan;
      }
    }

    if (!channel) {
      const channelElement = first($, card, CHANNEL_SELECTORS);
      if (channelElement) channel = clean($(channelElement).attr('data-channel') || $(channelElement).attr('data-broadcaster') || $(channelElement).text());
    }
    if (!league) {
      const leagueElement = first($, card, LEAGUE_SELECTORS);
      if (leagueElement) league = clean($(leagueElement).text());
    }

    if (!channel) channel = 'تحدد لاحقا';

    const images = $(card).find('img').map((__, img) => $(img).attr('data-src') || $(img).attr('src') || '').get().filter(Boolean);
    const homeLogo = absoluteUrl(images[0] || '', sourceConfig.listUrl);
    const awayLogo = absoluteUrl(images[1] || '', sourceConfig.listUrl);
    const matchUrl = absoluteUrl(hitAnchor.attr('href') || '', sourceConfig.listUrl);

    matches.push({
      matchId: matchIdFor(homeTeam, awayTeam, scheduledAt, sourceConfig.timeZone),
      homeTeam,
      awayTeam,
      homeLogo,
      awayLogo,
      time,
      scheduledAt,
      timeZone: sourceConfig.timeZone,
      league,
      channel,
      matchUrl,
      matchUrls: matchUrl ? [matchUrl] : [], // نجهز المصفوفة لدعم الروابط المتعددة
      sourceName: sourceConfig.name
    });
  });

  return matches;
}

async function fetchScheduleHtml(browser, url) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector(MATCH_SELECTORS, { timeout: 15000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 3000));
    return await page.content();
  } finally {
    await page.close().catch(() => {});
  }
}

function metadataKey(match) { 
  return `${clean(match.homeTeam).normalize('NFKC').toLocaleLowerCase('ar')}|${clean(match.awayTeam).normalize('NFKC').toLocaleLowerCase('ar')}|${match.scheduledAt.slice(0, 10)}`; 
}

async function runMetadataOnce() {
  if (sourcesList.length === 0) {
    console.error('[METADATA] No enabled sources found in sources.json');
    return [];
  }

  let browser;
  const deduplicated = new Map();

  try {
    console.log(`[METADATA] Launching stealth browser...`);
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    for (const source of sourcesList) {
      console.log(`[METADATA] Scraping source: ${source.name} (${source.listUrl})`);
      try {
        const html = await fetchScheduleHtml(browser, source.listUrl);
        const rawMatches = parseSchedule(html, source);
        
        for (const match of rawMatches) {
          const key = metadataKey(match);
          if (deduplicated.has(key)) {
            // دمج الروابط إذا وجدنا نفس المباراة في موقع آخر
            const existingMatch = deduplicated.get(key);
            if (match.matchUrl && !existingMatch.matchUrls.includes(match.matchUrl)) {
              existingMatch.matchUrls.push(match.matchUrl);
            }
          } else {
            deduplicated.set(key, match);
          }
        }
        console.log(`[METADATA] Extracted ${rawMatches.length} match(es) from ${source.name}`);
      } catch (error) {
        console.error(`[METADATA] Failed to scrape ${source.name}:`, error.message);
      }
    }

    const jobs = [...deduplicated.values()].slice(0, config.autoDiscoverLimit);
    
    for (const job of jobs) {
      await saveStaging(job.matchId, { ...job, status: 'METADATA_READY', resolverStatus: 'PENDING', streams: [], sourceReports: [], updatedBy: 'multi-source-scraper' });
    }
    
    console.log(`[METADATA] Finished scraping. Saved ${jobs.length} unique match(es) across all sources.`);
    return jobs;
  } finally {
    if (browser) await browser.close();
  }
}

if (require.main === module) {
  if (process.argv.includes('--once')) {
    runMetadataOnce()
      .then(() => process.exit(0))
      .catch((error) => { console.error(error.stack); process.exit(1); });
  } else { 
    cron.schedule(config.cron, () => runMetadataOnce().catch((error) => console.error(error.stack))); 
    console.log(`[METADATA] Scheduler active: ${config.cron}`); 
  }
}

module.exports = { fetchScheduleHtml, parseSchedule, metadataKey, runMetadataOnce };