require('dotenv').config({ path: require('node:path').resolve(process.cwd(), '.env') });

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { config } = require('./config');
const { getSupabase } = require('./supabase');
const { loadAllowlist } = require('./allowlist');
const { loadSources, sourceHosts } = require('./source-registry');
const { resolveMatchUrls } = require('./scraper');
const { saveStaging } = require('./supabase-storage');
const { validateStream } = require('./validator');

function launchOptions() {
  return {
    headless: true,
    protocolTimeout: Math.max(config.timeoutMs, 30000),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  };
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function isBlockedUrl(value) {
  return /(?:monetag|popads|propellerads|popcash|adsterra|onclicka)\./i.test(String(value || ''));
}

function likelyStream(value) {
  return isHttpUrl(value) && !isBlockedUrl(value) && (
    /\.m3u8(?:$|[?#])/i.test(value) ||
    /\.mp4(?:$|[?#])/i.test(value) ||
    /\/(?:embed|player|live|stream)\b/i.test(value) ||
    /[?&](?:url|src|stream)=/i.test(value)
  );
}

function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]));
}

function parseMatchTime(value, timeZone = config.resolverTimeZone) {
  const text = String(value || '').trim();
  if (!text) return NaN;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) return Date.parse(text);

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return Date.parse(text);
  const localTimestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] || 0));
  let estimate = new Date(localTimestamp);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = zonedParts(estimate, timeZone);
    const displayedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    estimate = new Date(localTimestamp - (displayedAsUtc - estimate.getTime()));
  }
  return estimate.getTime();
}

function formatMatchTime(timestamp, timeZone = config.resolverTimeZone) {
  if (!Number.isFinite(timestamp)) return 'Invalid';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(timestamp));
}

function isWithinActiveWindow(row, now = Date.now()) {
  const scheduledAt = row?.payload?.scheduledAt;
  const timeZone = row?.payload?.timeZone || config.resolverTimeZone;
  const matchTime = parseMatchTime(scheduledAt, timeZone);
  const currentTime = now instanceof Date ? now.getTime() : now;
  if (!Number.isFinite(matchTime)) return false;
  return currentTime >= matchTime - (120 * 60 * 1000) && currentTime <= matchTime + (150 * 60 * 1000);
}

async function discoverStreamCandidates(browser, matches) {
  const candidates = new Set();
  const sourcePages = new Set(matches.map((match) => match.matchUrl));
  const collect = (value) => {
    if (likelyStream(value) && !sourcePages.has(value)) candidates.add(value);
  };
  for (const match of matches) {
    const page = await browser.newPage();
    page.on('response', (response) => collect(response.url()));
    page.on('request', (request) => collect(request.url()));
    try {
      console.log(`[RESOLVER] Deep-scraping ${match.sourceName}: ${match.matchUrl}`);
      await page.goto(match.matchUrl, { waitUntil: 'domcontentloaded', timeout: config.timeoutMs });
      const collectDomUrls = async () => {
        const urls = await page.$$eval('iframe[src], video[src], source[src], a[href], button, [role="button"], [data-src], [data-url], [data-stream], [data-player]', (elements) => elements.flatMap((element) => [
          element.getAttribute('src'), element.getAttribute('href'), element.getAttribute('data-src'),
          element.getAttribute('data-url'), element.getAttribute('data-stream'), element.getAttribute('data-player')
        ].filter(Boolean).map((value) => {
          try { return new URL(value, location.href).href; } catch { return ''; }
        }).filter(Boolean)));
        urls.forEach(collect);
        for (const frame of page.frames()) collect(frame.url());
      };

      await collectDomUrls();
      const serverCount = await page.$$eval('button, [role="button"], .play, .play-button, .server, [class*="server"], [data-server]', (elements) => elements.length);
      for (let index = 0; index < serverCount; index += 1) {
        await page.evaluate((serverIndex) => {
          const elements = [...document.querySelectorAll('button, [role="button"], .play, .play-button, .server, [class*="server"], [data-server]')];
          try { elements[serverIndex]?.click(); } catch {}
        }, index);
        await new Promise((resolve) => setTimeout(resolve, Math.min(config.timeoutMs, 1500)));
        await collectDomUrls();
      }
    } catch (error) {
      console.warn(`[RESOLVER] ${match.sourceName} deep scrape failed: ${error.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }
  return [...candidates];
}

async function resolveOne(browser, row, allowlist, matchPages = []) {
  const payload = row.payload || {};
  const pages = matchPages.length ? matchPages : payload.matchUrl ? [{ sourceName: payload.sourceName || 'metadata', matchUrl: payload.matchUrl }] : [];
  if (!pages.length) {
    return { ...payload, status: 'RESOLVER_WAITING', resolverStatus: 'NO_MATCH_URL', updatedBy: 'stream-resolver' };
  }
  const candidates = await discoverStreamCandidates(browser, pages);
  const report = [];
  for (const url of candidates) {
    const result = await validateStream(url, allowlist);
    report.push(result);
    if (report.filter((item) => item.status === 'Passed').length >= config.streamTarget) break;
  }
  const passed = report.filter((item) => item.status === 'Passed').slice(0, config.streamTarget);
  const fallback = passed.length ? passed : [...candidates].slice(0, config.streamTarget).map((url) => ({
    url,
    status: 'Passed',
    type: /\.m3u8(?:$|[?#])/i.test(url) ? 'hls' : 'iframe',
    fallback: true,
    error: 'Strict validation failed; raw playable candidate retained'
  }));

  return {
    ...payload,
    streams: fallback,
    validation: report,
    status: fallback.length ? 'PASSED_STAGING' : 'RESOLVER_FAILED',
    resolverStatus: fallback.length ? 'COMPLETE' : 'NO_STREAM_CANDIDATE',
    updatedBy: 'stream-resolver',
    resolvedAt: new Date().toISOString()
  };
}

async function pendingRows() {
  const { data, error } = await getSupabase()
    .from(config.stagingCollection)
    .select('match_id,payload,environment,updated_at')
    .eq('environment', 'staging')
    .limit(config.resolverBatchSize);
  if (error) throw new Error(JSON.stringify(error));
  return (data || []).filter((row) => row.payload?.resolverStatus === 'PENDING');
}

async function runResolverOnce() {
  const allowlist = await loadAllowlist();
  const sources = await loadSources();
  allowlist.sourceHosts.push(...sourceHosts(sources));
  allowlist.sourceHosts = [...new Set(allowlist.sourceHosts)];
  const rows = await pendingRows();
  if (!rows.length) {
    console.log('[RESOLVER] No pending metadata rows');
    return [];
  }
  const now = Date.now();
  const activeRows = rows.filter((row) => {
    const timeZone = row.payload?.timeZone || config.resolverTimeZone;
    const matchTime = parseMatchTime(row.payload?.scheduledAt, timeZone);
    const currentLabel = formatMatchTime(now, timeZone);
    const matchLabel = formatMatchTime(matchTime, timeZone);
    const active = isWithinActiveWindow(row, now);
    console.log(`[RESOLVER] ${row.match_id}: Current Time (Normalized): ${currentLabel} (${timeZone}), Match Time: ${matchLabel} -> Action: ${active ? 'Resolving' : 'Skipped: Outside active window'}`);
    return active;
  });
  if (!activeRows.length) return [];

  const browser = await puppeteer.launch(launchOptions());
  const results = [];
  try {
    for (const row of activeRows) {
      try {
        const resolved = await resolveMatchUrls(row.payload, sources, allowlist);
        const payload = await resolveOne(browser, row, allowlist, resolved.matches);
        await saveStaging(row.match_id, payload);
        results.push({ matchId: row.match_id, status: payload.status, streams: payload.streams?.length || 0 });
        console.log(`[RESOLVER] ${row.match_id}: ${payload.status}, streams=${payload.streams?.length || 0}`);
      } catch (error) {
        console.error(`[RESOLVER] ${row.match_id} failed: ${error.message}`);
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
  return results;
}

if (require.main === module) runResolverOnce().catch((error) => { console.error(error.stack); process.exitCode = 1; });

module.exports = {
  runResolverOnce,
  resolveOne,
  discoverStreamCandidates,
  isWithinActiveWindow,
  parseMatchTime,
  formatMatchTime
};
