const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { matchSlug, matchPage, generate } = require('./generate-match-pages.cjs');

const sample = {
  id: 'fixture-123', match_id: 'fixture-123', home_team: 'الرجاء <script>', away_team: 'الوداد',
  league: 'البطولة', kickoff_time: '2026-09-29T19:00:00Z', updated_at: '2026-09-29T18:00:00Z',
  payload: { score: '2 - 1', isFinished: true, goals: [{ player: 'لاعب', minute: 42 }], statistics: [{ statistics: [{ type: 'الاستحواذ', value: '55%' }] }] }
};

test('match detail path stays deterministic and includes unique fixture id', () => {
  assert.equal(matchSlug(sample), matchSlug(sample));
  assert.match(matchSlug(sample), /2026-09-29-/);
  assert.notEqual(matchSlug(sample), matchSlug({ ...sample, match_id: 'fixture-456' }));
});

test('generated page exposes supplied match facts and escapes text', () => {
  const page = matchPage(sample, { siteUrl: 'https://fraja.online', brand: 'فرجة' });
  assert.ok(page);
  assert.match(page.html, /2 - 1/);
  assert.match(page.html, /الاستحواذ/);
  assert.match(page.html, /55%/);
  assert.match(page.html, /لاعب/);
  assert.doesNotMatch(page.html, /<script>\/script>/);
  assert.match(page.html, /canonical/);
  assert.match(page.html, /BreadcrumbList/);
});

test('rows without teams or a valid kickoff are not indexable', () => {
  const config = { siteUrl: 'https://fraja.online', brand: 'فرجة' };
  assert.equal(matchPage({ ...sample, home_team: '' }, config), null);
  assert.equal(matchPage({ ...sample, kickoff_time: 'invalid' }, config), null);
});

test('static build writes detail pages and keeps core sitemap URLs', async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'match-pages-'));
  try {
    fs.writeFileSync(path.join(output, 'sitemap.xml'), '<urlset><url><loc>https://fraja.online/</loc></url><url><loc>https://fraja.online/news.html</loc></url></urlset>');
    const result = await generate(output, [sample]);
    const pagePath = path.join(output, 'match', matchSlug(sample), 'index.html');
    const sitemap = fs.readFileSync(result.sitemap, 'utf8');
    assert.equal(result.count, 1);
    assert.ok(fs.existsSync(pagePath));
    assert.match(sitemap, /https:\/\/fraja\.online\//);
    assert.match(sitemap, /https:\/\/fraja\.online\/news\.html/);
    assert.match(sitemap, new RegExp(`/match/${matchSlug(sample)}/`));
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
});

test('homepage includes only public non-cancelled fixture links without provider data', async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'public-schedule-'));
  try {
    fs.writeFileSync(path.join(output, 'index.html'), '<html><body><div id="featured-matches"></div></body></html>');
    const kickoff = new Date().toISOString();
    const row = { ...sample, kickoff_time: kickoff, payload: { status: 'FT', score: '2 - 1', streamUrl: 'PRIVATE_STREAM' } };
    const hidden = { ...row, match_id: 'not-public', home_team: 'Hidden Team' };
    const cancelled = { ...row, match_id: 'cancelled', home_team: 'Cancelled Team', payload: { status: 'CANC' } };
    await generate(output, [row, hidden, cancelled], new Set([row.match_id, cancelled.match_id]));
    const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    assert.ok(html.includes(encodeURIComponent(matchSlug(row))));
    assert.match(html, /النتيجة النهائية/);
    assert.doesNotMatch(html, /Hidden Team|Cancelled Team|PRIVATE_STREAM/);
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
});
