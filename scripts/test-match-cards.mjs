import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join, extname } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.PLAYWRIGHT_MODULES || process.cwd()] }));
const root = process.cwd();
const matches = Array.from({ length: 12 }, (_, i) => ({
  matchId: `api-football_fixture-${i}`, homeTeam: `ريال مدريد ${i}`, awayTeam: `مانشستر يونايتد ${i}`,
  homeLogo: '/assets/images/default-logo.jpg', awayLogo: '/assets/images/default-logo.jpg',
  scheduledAt: new Date(Date.now() + (i < 8 ? -45 * 60000 : 86400000)).toISOString(),
  league: 'الدوري الإسباني', score: i < 8 ? '2 - 1' : 'VS', liveMinute: 85,
  isLive: i < 8, playbackState: i < 8 ? 'live' : 'upcoming',
  yellowCards: { home: i ? 0 : 2, away: 0 }, redCards: { home: 0, away: 0 },
  goals: i === 0 ? Array.from({ length: 6 }, (_, j) => ({ player: `مسجل الهدف ${j + 1}`, minute: 10 + j * 10 })) : [],
}));
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/assets/css/matches.css"><body><main class="matches-main"><section class="all-matches"><h2>جدول المواجهات والنتائج</h2><div class="matches-tabs"><button id="today-tab" class="tab-btn active">مواجهات اليوم</button><button id="tomorrow-tab" class="tab-btn">مواجهات الغد</button></div><div id="today-matches" class="tab-content active"></div><div id="tomorrow-matches" class="tab-content"></div></section></main><script type="module" src="/assets/js/matches.js"></script></body></html>`);
    return;
  }
  const file = resolve(root, '.' + pathname);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const mime = { '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg' };
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'text/plain' }).end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  let streamRequests = 0;
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('/api/generate-token')) streamRequests++;
    if (url.includes('/api/matches')) return route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ matches }) });
    return url.startsWith(base) ? route.continue() : route.abort();
  });
  await page.goto(base);
  await page.locator('#today-matches .match-card').first().waitFor();
  assert.equal(await page.locator('#today-matches .match-card').count(), 8);
  const first = page.locator('#today-matches .match-card[data-match-id="api-football_fixture-0"]');
  assert.equal(await first.locator('.score').textContent(), '2 - 1');
  assert.equal(await first.locator('.time').textContent(), "85'");
  assert.equal(await first.locator('.live-data-strip, .live-detail-panel, .live-score').count(), 0);
  assert.equal(await first.locator('.match-scorers > span').count(), 6);
  assert.equal(await page.locator('#today-matches .match-card[data-match-id="api-football_fixture-1"] .match-card-counts').count(), 0);
  assert.deepEqual(await first.locator('.api-map-node').allTextContents(), ['مباشر', 'أحداث', 'إحصائيات', 'الفرق']);
  assert.equal(await first.locator('.api-map-detail').isVisible(), false);
  for (const key of ['live', 'events', 'statistics', 'teams']) {
    await first.locator(`[data-endpoint="${key}"]`).click();
    assert.equal(await first.locator(`[data-endpoint="${key}"]`).getAttribute('aria-selected'), 'true');
    assert.equal(await first.locator('.api-map-detail').isVisible(), key !== 'teams');
  }
  assert.equal(streamRequests, 0, 'tabs must not open or authorize playback');
  await mkdir('dist/qa', { recursive: true });
  for (const width of [1920, 1366, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(100);
    const layout = await page.evaluate(() => {
      const grid = document.getElementById('today-matches');
      const tabs = [...grid.querySelectorAll('.api-map-node')];
      const cards = [...grid.querySelectorAll('.match-card')].map((el) => el.getBoundingClientRect());
      return { columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        overlap: cards.some((a, i) => cards.some((b, j) => j > i && Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1)),
        overflow: document.documentElement.scrollWidth > innerWidth,
        clippedTabs: tabs.some((tab) => tab.scrollWidth > tab.clientWidth),
        scorersHeight: grid.querySelector('.match-scorers').clientHeight };
    });
    assert.ok(layout.columns <= 4 && layout.columns >= 1, JSON.stringify(layout));
    assert.equal(layout.overflow, false, `${width}: page overflow`);
    assert.equal(layout.overlap, false, `${width}: overlapping cards`);
    assert.equal(layout.clippedTabs, false, `${width}: clipped tabs`);
    assert.ok(layout.scorersHeight <= 44);
    await page.screenshot({ path: join('dist/qa', `cards-${width}.png`) });
    console.log(width, JSON.stringify(layout));
  }
  await page.locator('#tomorrow-tab').click();
  assert.equal(await page.locator('#tomorrow-matches .match-card').count(), 4);
  assert.equal(await page.locator('#today-matches').isVisible(), false);
  console.log('PASS: today/tomorrow, four Arabic tabs, no duplicates, zero playback requests from tabs');
} finally { await browser?.close(); await new Promise((done) => server.close(done)); }
