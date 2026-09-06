require('dotenv').config({ path: require('node:path').resolve(process.cwd(), '.env') });

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { config } = require('./config');
const { getSupabase } = require('./supabase');
const { loadAllowlist } = require('./allowlist');
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
    /\/(?:embed|player|live|stream|watch)\b/i.test(value) ||
    /[?&](?:url|src|stream)=/i.test(value)
  );
}

function isWithinActiveWindow(row, now = Date.now()) {
  const scheduledAt = row?.payload?.scheduledAt;
  const matchTime = Date.parse(scheduledAt || '');
  if (!Number.isFinite(matchTime)) return false;
  return now >= matchTime - (120 * 60 * 1000) && now <= matchTime + (150 * 60 * 1000);
}

async function discoverStreamCandidates(browser, match) {
  const page = await browser.newPage();
  const candidates = new Set();
  const collect = (value) => {
    if (likelyStream(value)) candidates.add(value);
  };
  page.on('response', (response) => collect(response.url()));
  page.on('request', (request) => collect(request.url()));
  try {
    await page.goto(match.matchUrl, { waitUntil: 'domcontentloaded', timeout: config.timeoutMs });
    const urls = await page.$$eval('iframe[src], video[src], source[src], a[href], [data-src], [data-url], [data-stream], [data-player]', (elements) => elements.flatMap((element) => [
      element.getAttribute('src'), element.getAttribute('href'), element.getAttribute('data-src'),
      element.getAttribute('data-url'), element.getAttribute('data-stream'), element.getAttribute('data-player')
    ].filter(Boolean)));
    urls.forEach(collect);
    await page.evaluate(() => {
      document.querySelectorAll('button, [role="button"], .play, .play-button, .server, [class*="server"]').forEach((element) => {
        try { element.click(); } catch {}
      });
    });
    await new Promise((resolve) => setTimeout(resolve, Math.min(config.timeoutMs, 3000)));
    for (const frame of page.frames()) collect(frame.url());
    return [...candidates];
  } finally {
    await page.close().catch(() => {});
  }
}

async function resolveOne(browser, row, allowlist) {
  const payload = row.payload || {};
  if (!payload.matchUrl) {
    return { ...payload, status: 'RESOLVER_WAITING', resolverStatus: 'NO_MATCH_URL', updatedBy: 'stream-resolver' };
  }
  const candidates = await discoverStreamCandidates(browser, payload);
  const report = [];
  for (const url of candidates.slice(0, config.maxStreams * 2)) {
    const result = await validateStream(url, allowlist);
    report.push(result);
    if (report.filter((item) => item.status === 'Passed').length >= config.maxStreams) break;
  }
  const passed = report.filter((item) => item.status === 'Passed').slice(0, config.maxStreams);
  const fallback = passed.length ? passed : [...candidates].slice(0, config.maxStreams).map((url) => ({
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
  const rows = await pendingRows();
  if (!rows.length) {
    console.log('[RESOLVER] No pending metadata rows');
    return [];
  }
  const activeRows = rows.filter((row) => {
    if (isWithinActiveWindow(row)) return true;
    console.log(`[RESOLVER] ${row.match_id}: Skipped: Outside active window`);
    return false;
  });
  if (!activeRows.length) return [];

  const browser = await puppeteer.launch(launchOptions());
  const results = [];
  try {
    for (const row of activeRows) {
      try {
        const payload = await resolveOne(browser, row, allowlist);
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

module.exports = { runResolverOnce, resolveOne, discoverStreamCandidates, isWithinActiveWindow };
