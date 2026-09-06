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
const MATCH_SELECTORS = '.BoxContent .AY_Match, .BoxContent .match-card, .BoxContent .match-container, .BoxContent .match-item, .AY_Match, .match-card, .match-container, article[class*="match"], [data-match-id]';
const HOME_SELECTORS = ['.right-team .team-name', '.home-team .team-name', '.team-home .team-name', '.team1 .team-name', '.team1 .TM_Name', '.MT_Team.TM1 .TM_Name', '.TM1 .TM_Name', '[data-team="home"] .team-name'];
const AWAY_SELECTORS = ['.left-team .team-name', '.away-team .team-name', '.team-away .team-name', '.team2 .team-name', '.team2 .TM_Name', '.MT_Team.TM2 .TM_Name', '.TM2 .TM_Name', '[data-team="away"] .team-name'];
const HOME_CONTAINERS = ['.right-team', '.home-team', '.team-home', '.team1', '.MT_Team.TM1', '.TM1', '[data-team="home"]'];
const AWAY_CONTAINERS = ['.left-team', '.away-team', '.team-away', '.team2', '.MT_Team.TM2', '.TM2', '[data-team="away"]'];
const CHANNEL_SELECTORS = ['.channel', '.match-channel', '.c3-channel', '.broadcast', '.broadcast-channel', '.tv-channel', '.channel-name', '.channel-info', '[data-channel]', '[data-broadcaster]', '[class*="channel"]', '[class*="broadcast"]'];
const LEAGUE_SELECTORS = ['.league', '.match-league', '.c3-league', '.competition', '.tournament', '.league-name'];

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function sameTeam(left, right) { return clean(left).normalize('NFKC').toLocaleLowerCase('ar') === clean(right).normalize('NFKC').toLocaleLowerCase('ar'); }
function first($, root, selectors) { for (const selector of selectors) { const item = $(root).find(selector).first()[0]; if (item) return item; } return null; }
function absoluteUrl(value, baseUrl) { try { const url = new URL(value, baseUrl); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
function slug(value) { return clean(value).toLocaleLowerCase('ar').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, ''); }
function sourceDate() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); return parts; }

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

function matchIdFor(homeTeam, awayTeam, scheduledAt) { return `${slug(homeTeam)}-${slug(awayTeam)}-${scheduledAt.slice(0, 10) || sourceDate()}`; }
function imageUrl($, element) { return absoluteUrl($(element).attr('data-src') || $(element).attr('data-lazy-src') || $(element).attr('src') || '', SCHEDULE_URL); }
function titleTeams(value) { const parts = clean(value).split(/\s+(?:vs|v|ضد|مباراة)\s+|\s+-\s+/i).map(clean); return parts.length >= 2 ? { homeTeam: parts[0], awayTeam: parts[1] } : null; }

function parseSchedule(html) {
  const $ = cheerio.load(html);
  const matches = [];
  $(MATCH_SELECTORS).each((_, card) => {
    const homeElement = first($, card, HOME_SELECTORS);
    const awayElement = first($, card, AWAY_SELECTORS);
    const homeContainer = first($, card, HOME_CONTAINERS) || homeElement;
    const awayContainer = first($, card, AWAY_CONTAINERS) || awayElement;
    const title = clean($(card).attr('title') || $(card).find('[title]').first().attr('title') || $(card).text());
    const fallback = titleTeams(title);
    const homeTeam = clean($(homeElement || homeContainer).text()) || fallback?.homeTeam || '';
    const awayTeam = clean($(awayElement || awayContainer).text()) || fallback?.awayTeam || '';
    if (!homeTeam || !awayTeam || sameTeam(homeTeam, awayTeam)) return;

    const cardText = clean($(card).text());
    const timeMatch = cardText.match(/(?:^|\D)([01]?\d|2[0-3])\s*:\s*([0-5]\d)(?!\d)/);
    
    // إصلاح مشكلة المباريات الجارية (Live) التي لا يظهر فيها وقت
    let time = timeMatch ? `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}` : '';
    let scheduledAt = time ? localTimeToIso(time) : '';
    
    if (!scheduledAt) {
      // إذا لم يجد وقتاً، نعطيها وقت افتراضي لكي يتم حفظها بنجاح ولا يتم تجاهلها
      time = 'مباشر الآن';
      scheduledAt = localTimeToIso('00:00'); // تعيين وقت منتصف الليل كقيمة افتراضية
    }

    const channelElement = first($, card, CHANNEL_SELECTORS);
    const channel = clean($(channelElement).attr('data-channel') || $(channelElement).attr('data-broadcaster') || $(channelElement).text()) || 'تحدد لاحقا';
    const league = clean($(first($, card, LEAGUE_SELECTORS)).text()) || clean($(card).find('.match-info, .match-details, .match-meta').first().text()) || '';
    const link = $(card).find('a[href]').map((__, anchor) => $(anchor).attr('href')).get().find((href) => href && href !== '#' && !/^javascript:/i.test(href));
    const matchUrl = absoluteUrl(link || '', SCHEDULE_URL);
    
    matches.push({
      matchId: matchIdFor(homeTeam, awayTeam, scheduledAt),
      homeTeam,
      awayTeam,
      homeLogo: imageUrl($, $(homeContainer).find('img').first()[0]),
      awayLogo: imageUrl($, $(awayContainer).find('img').first()[0]),
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
    await page.goto(SCHEDULE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log(`[METADATA] Waiting for matches to fully render...`);
    await page.waitForSelector('.AY_Match, .match-card, article', { timeout: 25000 }).catch(() => console.log('[METADATA] Timeout waiting for match selectors.'));
    
    // انتظار إضافي لتأكيد تحميل كل السكربتات الخاصة بالبث
    await new Promise(resolve => setTimeout(resolve, 3000));

    const html = await page.content();
    await browser.close();
    
    console.log(`[METADATA] Successfully extracted HTML (Length: ${html.length}).`);
    return html;
  } catch (error) {
    if (browser) await browser.close();
    console.error(`[METADATA] Schedule request error for ${SCHEDULE_URL}: ${error.stack || error.message}`);
    throw error;
  }
}

function metadataKey(match) { return `${clean(match.homeTeam).normalize('NFKC').toLocaleLowerCase('ar')}|${clean(match.awayTeam).normalize('NFKC').toLocaleLowerCase('ar')}|${match.scheduledAt.slice(0, 10)}`; }

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
    runMetadataOnce().catch((error) => { console.error(error.stack); process.exitCode = 1; });
  } else { 
    cron.schedule(config.cron, () => runMetadataOnce().catch((error) => console.error(error.stack))); 
    console.log(`[METADATA] Scheduler active: ${config.cron}`); 
  }
}

module.exports = { fetchScheduleHtml, parseSchedule, metadataKey, runMetadataOnce };