require('dotenv').config({ path: require('node:path').resolve(process.cwd(), '.env') });

const cron = require('node-cron');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { config } = require('./config');
const { saveStaging } = require('./supabase-storage');

puppeteer.use(StealthPlugin());

const SCHEDULE_URL = 'https://yallashoot2day.online/';
const TIME_ZONE = 'Africa/Casablanca';

const MATCH_SELECTORS = '.match-container, .c3-card, #today .match-container, .albaflex > div';
const CHANNEL_SELECTORS = ['.channel', '.match-channel', '.c3-channel', '.broadcast', '.broadcast-channel', '.tv-channel', '.channel-name', '.channel-info', '[data-channel]', '[data-broadcaster]', '[class*="channel"]', '[class*="broadcast"]'];
const LEAGUE_SELECTORS = ['.league', '.match-league', '.c3-league', '.competition', '.tournament', '.league-name'];

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function sameTeam(left, right) { return clean(left).normalize('NFKC').toLocaleLowerCase('ar') === clean(right).normalize('NFKC').toLocaleLowerCase('ar'); }
function absoluteUrl(value, baseUrl) { try { const url = new URL(value, baseUrl); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
function slug(value) { return clean(value).toLocaleLowerCase('ar').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, ''); }
function sourceDate() { return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function first($, root, selectors) { for (const selector of selectors) { const item = $(root).find(selector).first()[0]; if (item) return item; } return null; }

function localTimeToIso(time) {
  const date = sourceDate();
  const [hour, minute] = time.split(':').map(Number);
  const localTimestamp = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), hour, minute, 0);
  let estimate = new Date(localTimestamp);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(estimate);
    const values = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]));
    const displayedTimestamp = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
    estimate = new Date(localTimestamp - (displayedTimestamp - estimate.getTime()));
  }
  return estimate.toISOString();
}

function matchIdFor(homeTeam, awayTeam, scheduledAt) { 
  return `${slug(homeTeam)}-${slug(awayTeam)}-${scheduledAt.slice(0, 10) || sourceDate()}`; 
}

function parseSchedule(html) {
  const $ = cheerio.load(html);
  const matches = [];

  $(MATCH_SELECTORS).each((_, card) => {
    const hitAnchor = $(card).find('a.hit, a[aria-label]').first();
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
      const rawNames = $(card).find('img[alt]').map((__, img) => $(img).attr('alt')).get().filter(Boolean);
      if (rawNames.length >= 2) {
        homeTeam = clean(rawNames[0]);
        awayTeam = clean(rawNames[1]);
      }
    }

    if (!homeTeam || !awayTeam || sameTeam(homeTeam, awayTeam)) return;

    const cardText = clean($(card).text());
    const timeMatch = cardText.match(/(?:^|\D)([01]?\d|2[0-3])\s*:\s*([0-5]\d)(?!\d)/);
    let time = timeMatch ? `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}` : '';
    let scheduledAt = time ? localTimeToIso(time) : '';

    if (!scheduledAt) {
      time = 'مباشر الآن';
      scheduledAt = localTimeToIso('00:00');
    }

    // استخراج الدوري والقناة بشكل ذكي
    let league = '';
    let channel = '';

    const channelElement = first($, card, CHANNEL_SELECTORS);
    if (channelElement) channel = clean($(channelElement).attr('data-channel') || $(channelElement).attr('data-broadcaster') || $(channelElement).text());

    const leagueElement = first($, card, LEAGUE_SELECTORS);
    if (leagueElement) league = clean($(leagueElement).text());

    // البحث في النصوص عن الفاصل (• أو -) إذا لم يجد القناة بالكلاسات
    if (!channel || !league) {
      const allTexts = $(card).find('div, span, p').map((_, el) => clean($(el).text())).get();
      for (const text of allTexts) {
        if (text.includes('•')) {
          const parts = text.split('•').map(clean);
          if (!league) league = parts[0];
          if (!channel) channel = parts[1];
          break;
        }
      }
    }

    if (!channel) channel = 'تحدد لاحقا';

    const images = $(card).find('img').map((__, img) => $(img).attr('data-src') || $(img).attr('src') || '').get().filter(Boolean);
    const homeLogo = absoluteUrl(images[0] || '', SCHEDULE_URL);
    const awayLogo = absoluteUrl(images[1] || '', SCHEDULE_URL);
    const matchUrl = absoluteUrl(hitAnchor.attr('href') || '', SCHEDULE_URL);

    matches.push({
      matchId: matchIdFor(homeTeam, awayTeam, scheduledAt),
      homeTeam,
      awayTeam,
      homeLogo,
      awayLogo,
      time,
      scheduledAt,
      timeZone: TIME_ZONE,
      league,
      channel,
      matchUrl,
      matchUrls: matchUrl ? [matchUrl] : [],
      sourceName: 'yallashoot2day'
    });
  });

  return matches;
}

async function fetchScheduleHtml() {
  let browser;
  try {
    console.log(`[METADATA] Launching stealth browser to bypass Cloudflare...`);
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    
    console.log(`[METADATA] Navigating to ${SCHEDULE_URL}...`);
    await page.goto(SCHEDULE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log(`[METADATA] Waiting for .match-container or .c3-card to render...`);
    await page.waitForSelector('.match-container, .c3-card, #today', { timeout: 30000 }).catch(() => console.log('[METADATA] Selector wait timeout, proceeding...'));
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    const html = await page.content();
    console.log(`[METADATA] Successfully extracted HTML (Length: ${html.length}).`);
    return html;
  } catch (error) {
    console.error(`[METADATA] Schedule request error for ${SCHEDULE_URL}: ${error.stack || error.message}`);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

function metadataKey(match) { 
  return `${clean(match.homeTeam).normalize('NFKC').toLocaleLowerCase('ar')}|${clean(match.awayTeam).normalize('NFKC').toLocaleLowerCase('ar')}|${match.scheduledAt.slice(0, 10)}`; 
}

async function runMetadataOnce() {
  const deduplicated = new Map();
  const rawMatches = parseSchedule(await fetchScheduleHtml());
  for (const match of rawMatches) deduplicated.set(metadataKey(match), match);
  const jobs = [...deduplicated.values()].slice(0, config.autoDiscoverLimit);
  
  for (const job of jobs) {
    await saveStaging(job.matchId, { ...job, status: 'METADATA_READY', resolverStatus: 'PENDING', streams: [], sourceReports: [], updatedBy: 'yallashoot2day-puppeteer' });
  }
  
  console.log(`[METADATA] ${rawMatches.length} scraped match(es); saved ${jobs.length} unique match(es) from ${SCHEDULE_URL}`);
  return jobs;
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