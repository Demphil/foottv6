const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const puppeteer = require('puppeteer');
const { legacyMatchPages } = require('./build-public-site.cjs');

async function main() {
  let server;
  const live = process.argv.includes('--live');
  let origin = 'https://fraja.online';
  if (!live) {
    const output = path.resolve(__dirname, '../_site');
    server = http.createServer(async (request, response) => {
      const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const filename = path.resolve(output, '.' + (requested === '/' ? '/index.html' : requested));
      if (!filename.startsWith(output + path.sep)) { response.writeHead(400).end(); return; }
      try {
        const body = await fs.readFile(filename);
        const type = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(filename)];
        response.writeHead(200, { 'Content-Type': type || 'application/octet-stream' }).end(body);
      } catch {
        response.writeHead(404, { 'Content-Type': 'text/html' }).end(await fs.readFile(path.join(output, '404.html')));
      }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = 'http://127.0.0.1:' + server.address().port;
  }
  let browser;
  try {
    for (const page of legacyMatchPages) {
      const response = await fetch(origin + '/' + page);
      assert.equal(response.status, 200, page);
      const html = await response.text();
      assert.match(html, /http-equiv="refresh" content="0; url=https:\/\/fraja.online\/"/);
      assert.match(html, /rel="canonical" href="https:\/\/fraja.online\/"/);
    }
    browser = await puppeteer.launch({ headless: true });
    for (const width of [390, 1366]) {
      for (const javaScriptEnabled of [true, false]) {
        const page = await browser.newPage();
        await page.setViewport({ width, height: 850 });
        await page.setJavaScriptEnabled(javaScriptEnabled);
        await page.setRequestInterception(true);
        page.on('request', request => {
          const url = new URL(request.url());
          // The local artifact deliberately has the production canonical URL.
          if (!live && url.origin === 'https://fraja.online') {
            return request.continue({ url: origin + url.pathname + url.search });
          }
          return url.origin === origin ? request.continue() : request.abort();
        });
        await page.goto(origin + '/kora-online.html', { waitUntil: 'domcontentloaded' }).catch(error => {
          if (!/ERR_ABORTED/.test(error.message)) throw error;
        });
        await page.waitForFunction(() => location.pathname === '/' && !!document.querySelector('#today-matches'));
        assert.equal(new URL(page.url()).pathname, '/');
        assert.match(await page.title(), /فرجة/);
        console.log(JSON.stringify({ live, width, javaScriptEnabled, googleEntryReachesHomepage: true }));
        await page.close();
      }
      const page = await browser.newPage();
      await page.setViewport({ width, height: 850 });
      const response = await page.goto(origin + '/missing-route-navigation-audit', { waitUntil: 'networkidle0' });
      assert.equal(response.status(), 404);
      assert.equal(await page.$eval('html', element => element.scrollWidth > innerWidth), false);
      assert.equal(await page.$eval('nav a', element => element.pathname), '/');
      assert.equal(await page.$eval('.brand img', element => element.complete && element.naturalWidth > 0), true);
      if (process.env.QA_OUTPUT_DIR) await page.screenshot({ path: path.join(process.env.QA_OUTPUT_DIR, 'fraja-404-' + width + '.png') });
      console.log(JSON.stringify({ live, width, actualMissingPageStatus: 404, mobileOverflow: false }));
      await page.close();
    }
    console.log('Verified ' + legacyMatchPages.length + ' retired match URLs.');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
