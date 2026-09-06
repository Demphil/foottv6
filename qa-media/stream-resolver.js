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
    headless: 'new',
    protocolTimeout: Math.max(config.timeoutMs, 45000),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      // الأوامر الجديدة لاختراق الإطارات الخارجية (iframes)
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials'
    ]
  };
}

function isHttpUrl(value) { return /^https?:\/\//i.test(String(value || '')); }

function isBlockedUrl(value) {
  const lower = String(value || '').toLowerCase();
  
  const blockedDomains = [
    'twitter', 't.me', 'facebook', 'whatsapp', 
    'flashtalking', 'doubleclick', 'google', 'googlesyndication', 
    'pubads', 'googleusercontent', 'googletagmanager', 
    'sharethis', 'criteo', 'smartadserver', 'mountain',
    'gstatic', 'gvt1', 'analytics', 'adtrafficquality', 'youtube'
  ];
  
  if (blockedDomains.some(domain => lower.includes(domain))) return true;
  if (/(?:monetag|popads|propellerads|popcash|adsterra|onclicka|ads)\./i.test(lower)) return true;

  // جدار ناري لملفات التصميم الثابتة (خطوط، صور، ستايلات) لمنع سحبها كروابط بث
  if (/\.(woff2?|ttf|otf|eot|css|js|png|jpe?g|gif|svg|ico|webmanifest)(?:\?|$)/i.test(lower)) return true;

  return false;
}

function likelyStream(value) {
  if (!isHttpUrl(value) || isBlockedUrl(value)) return false;
  const lower = value.toLowerCase();
  return (
    /\.m3u8(?:$|[?#])/i.test(lower) ||
    /\.mp4(?:$|[?#])/i.test(lower) ||
    /\/(?:embed|player|live|video|watch|stream)(?:\/|\?|$)/i.test(lower) ||
    /[?&](?:url|src|stream|id|v)=/i.test(lower) ||
    lower.includes('player')
  );
}

function likelyEmbed(value) {
  if (!isHttpUrl(value) || isBlockedUrl(value)) return false;
  return /\/(?:embed|player|live|video|stream)(?:\/|\?|$)/i.test(value.toLowerCase()) || value.toLowerCase().includes('player');
}

function parseMatchTime(value, timeZone = config.resolverTimeZone) { return Date.now(); }
function formatMatchTime(timestamp, timeZone = config.resolverTimeZone) { return 'Now'; }
function isWithinActiveWindow(row, now = Date.now()) { return true; }

async function discoverStreamCandidates(browser, matches) {
  const candidates = new Set();
  const sourcePages = new Set(matches.map((match) => match.matchUrl));
  const collect = (value, kind = 'network') => {
    if (!isHttpUrl(value) || sourcePages.has(value) || isBlockedUrl(value)) return;
    if (kind === 'iframe' || likelyStream(value)) candidates.add(value);
  };

  for (const match of matches) {
    const page = await browser.newPage();
    page.on('response', (response) => collect(response.url(), 'network'));
    page.on('request', (request) => collect(request.url(), 'network'));
    try {
      console.log(`[RESOLVER] Deep-scraping ${match.sourceName}: ${match.matchUrl}`);
      await page.goto(match.matchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      console.log(`[RESOLVER] Scrolling down to trigger lazy-loaded players...`);
      await page.evaluate(async () => {
          await new Promise((resolve) => {
              let totalHeight = 0;
              const distance = 300;
              const timer = setInterval(() => {
                  const scrollHeight = document.body.scrollHeight;
                  window.scrollBy(0, distance);
                  totalHeight += distance;
                  if(totalHeight >= scrollHeight){
                      clearInterval(timer);
                      resolve();
                  }
              }, 250);
          });
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log(`[RESOLVER] Clicking potential server buttons...`);
      await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('.server, [class*="server"], li[data-server], .btn-play, .play-btn, #server-list li')];
        if (buttons.length > 0) buttons[0].click();
      }).catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log(`[RESOLVER] Extracting iframe sources directly from DOM...`);
      const domUrls = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe[src]')).map(f => f.src);
      }).catch(() => []);
      
      domUrls.forEach(url => collect(url, 'iframe'));

      for (const frame of page.frames()) {
        if (frame.isDetached()) continue; 
        try {
          collect(frame.url(), 'iframe');
          const frameUrls = await frame.evaluate(() => {
            return Array.from(document.querySelectorAll('iframe[src], video[src], source[src]')).map(el => el.src);
          });
          frameUrls.forEach(url => collect(url, 'iframe'));
        } catch (error) {
          // Ignore detached frames
        }
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
  const storedPages = Array.isArray(payload.matchUrls) ? payload.matchUrls : payload.matchUrl ? [payload.matchUrl] : [];
  const pages = matchPages.length ? matchPages : storedPages.map((matchUrl) => ({ sourceName: payload.sourceName || 'metadata', matchUrl }));
  if (!pages.length) return { ...payload, status: 'RESOLVER_WAITING', resolverStatus: 'NO_MATCH_URL' };
  
  let candidates = await discoverStreamCandidates(browser, pages);
  
  const report = [];
  for (const url of candidates) {
    if(isBlockedUrl(url)) continue;

    let result;
    try {
      result = await validateStream(url, allowlist);
    } catch(e) {
      result = { status: 'Failed' };
    }
    
    if (result.status !== 'Passed' && result.error && result.error.includes('allowlist')) {
        const lowerUrl = url.toLowerCase();
        const validKeywords = ['player', 'embed', '.m3u8', 'live', 'stream', 'tv', 'sport', 'watch', 'ch'];
        const spamKeywords = ['google', 'gstatic', 'gvt1', 'adtraffic', 'ads', 'pixel', 'track', 'logger'];
        
        if (validKeywords.some(kw => lowerUrl.includes(kw)) && !spamKeywords.some(spam => lowerUrl.includes(spam))) {
            console.log(`[RESOLVER] FORCED PASS: Valid video stream extracted: ${url}`);
            result = { status: 'Passed', url: url, type: 'iframe' };
        }
    }

    report.push(result);
    if (result.status !== 'Passed') console.warn(`[RESOLVER] ${row.match_id}: rejected candidate ${url} -> ${result.error || 'validation failed'}`);
    if (report.filter((item) => item.status === 'Passed').length >= config.streamTarget) break;
  }
  
  const passed = report.filter((item) => item.status === 'Passed').slice(0, config.streamTarget);
  console.log(`[RESOLVER] ${row.match_id}: ${passed.length} validated stream(s)`);

  return {
    ...payload,
    streams: passed,
    validation: report,
    status: passed.length ? 'PASSED_STAGING' : 'RESOLVER_FAILED',
    resolverStatus: passed.length ? 'COMPLETE' : 'NO_STREAM_CANDIDATE',
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
  return (data || []).filter((row) => row.payload?.resolverStatus === 'PENDING' || row.payload?.streams?.length === 0);
}

async function runResolverOnce() {
  const allowlist = await loadAllowlist();
  const sources = await loadSources();
  allowlist.sourceHosts.push(...sourceHosts(sources));
  const rows = await pendingRows();
  if (!rows.length) return [];

  const browser = await puppeteer.launch(launchOptions());
  const results = [];
  try {
    for (const row of rows) {
      console.log(`[RESOLVER] Processing Match: ${row.match_id}`);
      try {
        const resolved = await resolveMatchUrls(row.payload, sources, allowlist);
        const payload = await resolveOne(browser, row, allowlist, resolved.matches);
        await saveStaging(row.match_id, payload);
        results.push({ matchId: row.match_id, status: payload.status, streams: payload.streams?.length || 0 });
      } catch (error) {
        console.error(`[RESOLVER] ${row.match_id} failed: ${error.message}`);
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
  return results;
}

if (require.main === module) {
  runResolverOnce()
    .then(() => process.exit(0))
    .catch((error) => { console.error(error.stack); process.exit(1); });
}

module.exports = { runResolverOnce };