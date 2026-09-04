const puppeteer = require('puppeteer-extra'); // تم التعديل لاستخدام النسخة القابلة لإضافة التخفي
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin()); // تفعيل ميزة التخفي لتجاوز حماية المواقع

const fs = require('node:fs');
const { config, assertAllowed } = require('./config');
const { matchPageHosts } = require('./source-registry');

const AD_HOSTS = new Set([
  'monetag.com',
  'popads.net',
  'propellerads.com',
  'popcash.net',
  'adsterra.com',
  'onclicka.com',
  'al5sm.com',
  'nap5k.com',
  'quge5.com'
]);

const IGNORED_EXTENSIONS = /\.(css|png|jpg|jpeg|webp|gif|svg|woff|woff2|ttf|eot|js|ico)(\?.*)?$/i;
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u0640]/g;
const TEXT_SEPARATORS = /[^\p{L}\p{N}]+/gu;
const WEAK_TOKENS = new Set(['vs', 'v', 'ضد', 'مباراة', 'مشاهدة', 'بث', 'مباشر', 'اليوم', 'اونلاين', 'live', 'hd']);

function launchOptions(extra = {}) {
  const browserExecutablePath = config.browserExecutablePath || [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].find((filePath) => fs.existsSync(filePath));

  return {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled' // إضافة هامة لزيادة التخفي
    ],
    ...(browserExecutablePath ? { executablePath: browserExecutablePath } : {}),
    ...extra
  };
}

async function gotoWithFallback(page, url) {
  try {
    return await page.goto(url, { waitUntil: 'networkidle2', timeout: config.timeoutMs });
  } catch (error) {
    if (!/timeout/i.test(error.message)) throw error;
    console.warn(`[MEDIA QA] navigation retry after timeout: ${url}`);
    return page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.timeoutMs });
  }
}

async function discoverJobs(sources, allowlist) {
  const browser = await puppeteer.launch(launchOptions());
  const jobs = [];
  const seen = new Set();
  try {
    for (const source of sources) {
      if (jobs.length >= config.autoDiscoverLimit) break;
      const page = await browser.newPage();
      try {
        assertAllowed(source.listUrl, allowlist.sourceHosts, 'source list URL');
        await gotoWithFallback(page, source.listUrl);
        const cards = await page.$$eval(
          '.AY_Match, .match-container, .match-card, .match-item, article[class*="match"], [data-match-id], [data-match]',
          (elements) => elements.map((card) => {
            const text = (selector) => card.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || '';
            const link = [...card.querySelectorAll('a[href]')].map((a) => a.href).find((href) => href && !href.endsWith('#')) || '';
            return {
              homeTeam: text('.right-team .team-name, .home-team .team-name, .team1 .team-name, .MT_Team.TM1 .TM_Name, .TM1 .TM_Name'),
              awayTeam: text('.left-team .team-name, .away-team .team-name, .team2 .team-name, .MT_Team.TM2 .TM_Name, .TM2 .TM_Name'),
              channel: text('.channel, .match-channel, .match-info li:first-child'),
              matchUrl: link
            };
          })
        );
        for (const card of cards) {
          if (!card.homeTeam || !card.awayTeam) continue;
          const matchId = `${card.homeTeam}_vs_${card.awayTeam}`.toLocaleLowerCase('ar').replace(/\s+/g, '_');
          if (seen.has(matchId)) continue;
          seen.add(matchId);
          jobs.push({ matchId, homeTeam: card.homeTeam, awayTeam: card.awayTeam, channel: card.channel, sourceName: source.name });
          if (jobs.length >= config.autoDiscoverLimit) break;
        }
      } catch (error) {
        console.warn(`[MEDIA QA] auto-discovery ${source.name}: ${error.message}`);
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    await browser.close();
  }
  return jobs;
}

function isAdUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return [...AD_HOSTS].some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return true;
  }
}

function isMediaUrl(value) {
  if (!value) return false;
  return /\.(m3u8|mp4)(?:$|[?#])/i.test(value) ||
    /\/(embed|player|live|stream|b-\d+|watch)/i.test(value) ||
    /\?m=\d+/i.test(value);
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function isCandidateUrl(value) {
  return isHttpUrl(value) && !isAdUrl(value) && !IGNORED_EXTENSIONS.test(value);
}

function uniquePush(list, value, limit = 20) {
  if (!value || list.includes(value) || list.length >= limit) return;
  list.push(value);
}

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('ar')
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return normalize(value)
    .split(TEXT_SEPARATORS)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !WEAK_TOKENS.has(token));
}

function compact(value) {
  return tokens(value).join('');
}

function diceScore(leftValue, rightValue) {
  const left = compact(leftValue);
  const right = compact(rightValue);
  if (!left || !right) return 0;
  if (left === right || left.includes(right) || right.includes(left)) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const pairs = new Map();
  for (let i = 0; i < left.length - 1; i += 1) {
    const pair = left.slice(i, i + 2);
    pairs.set(pair, (pairs.get(pair) || 0) + 1);
  }
  let hits = 0;
  for (let i = 0; i < right.length - 1; i += 1) {
    const pair = right.slice(i, i + 2);
    const count = pairs.get(pair) || 0;
    if (count) {
      hits += 1;
      pairs.set(pair, count - 1);
    }
  }
  return (2 * hits) / (left.length + right.length - 2);
}

function bestTermScore(terms, text) {
  const normalizedText = normalize(text);
  const textTokens = new Set(tokens(normalizedText));
  return Math.max(0, ...terms.filter(Boolean).map((term) => {
    const normalizedTerm = normalize(term);
    if (!normalizedTerm) return 0;
    if (normalizedText.includes(normalizedTerm) || compact(normalizedText).includes(compact(normalizedTerm))) return 1;
    const termTokens = tokens(normalizedTerm);
    if (!termTokens.length) return 0;
    const tokenScore = termTokens.filter((token) => textTokens.has(token)).length / termTokens.length;
    return Math.max(tokenScore, diceScore(normalizedTerm, normalizedText));
  }));
}

function termsFor(job, side) {
  const aliases = side === 'home' ? job.homeAliases : job.awayAliases;
  return [
    side === 'home' ? job.homeTeam : job.awayTeam,
    ...(Array.isArray(aliases) ? aliases : [])
  ].filter(Boolean);
}

function scoreCandidate(job, candidate) {
  const text = `${candidate.text || ''} ${candidate.title || ''}`.trim();
  const homeScore = bestTermScore(termsFor(job, 'home'), text);
  const awayScore = bestTermScore(termsFor(job, 'away'), text);
  if (homeScore < 0.58 || awayScore < 0.58) return 0;
  const channelTerms = [job.channel, ...(Array.isArray(job.channelAliases) ? job.channelAliases : [])].filter(Boolean);
  const channelScore = channelTerms.length ? bestTermScore(channelTerms, text) : 0;
  return homeScore + awayScore + (channelScore * 0.25);
}

async function resolveMatchUrl(job, sources, allowlist) {
  const result = await resolveMatchUrls(job, sources, allowlist);
  if (!result.matches.length) throw new Error(`No source matched ${job.homeTeam} vs ${job.awayTeam}`);
  return result.matches[0].matchUrl;
}

async function resolveMatchUrls(job, sources, allowlist) {
  const preferred = job.sourceName ? sources.find((item) => item.name === job.sourceName) : null;
  if (job.sourceName && !preferred) throw new Error(`Unknown authorized source: ${job.sourceName}`);
  const orderedSources = preferred ? [preferred, ...sources.filter((item) => item !== preferred)] : sources;
  const failures = [];
  const matches = [];
  const seen = new Set();

  for (const source of orderedSources) {
    try {
      const matchUrl = await resolveMatchUrlFromSource(job, source, allowlist);
      if (matchUrl && !seen.has(matchUrl)) {
        seen.add(matchUrl);
        matches.push({ sourceName: source.name, matchUrl, matchPageHosts: matchPageHosts(source) });
      }
    } catch (error) {
      failures.push(`${source.name}: ${error.message}`);
    }
  }

  if (!matches.length) {
    throw new Error(`No source matched ${job.homeTeam} vs ${job.awayTeam}. ${failures.join(' | ')}`);
  }
  return { matches, failures };
}

async function resolveMatchUrlFromSource(job, source, allowlist) {
  assertAllowed(source.listUrl, allowlist.sourceHosts, 'source list URL');
  const allowedMatchPageHosts = [...new Set([...allowlist.sourceHosts, ...matchPageHosts(source)])];
  const browser = await puppeteer.launch(launchOptions());
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1365, height: 768 });
    await gotoWithFallback(page, source.listUrl);
    const candidates = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((anchor) => ({
      href: anchor.href,
      text: anchor.textContent || '',
      title: anchor.title || ''
    })));

    const match = candidates
      .map((candidate) => ({ ...candidate, score: scoreCandidate(job, candidate) }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score)[0];

    if (match) {
      assertAllowed(match.href, allowedMatchPageHosts, 'resolved match URL');
      return match.href;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    let popupPage = null;
    page.once('popup', (popup) => { popupPage = popup; });

    const clicked = await page.evaluate(({ jobData }) => {
      const arabicDiacritics = /[\u064B-\u065F\u0670\u0640]/g;
      const separators = /[^\p{L}\p{N}]+/gu;
      const weakTokens = new Set(['vs', 'v', 'ضد', 'مباراة', 'مشاهدة', 'بث', 'مباشر', 'اليوم', 'اونلاين', 'live', 'hd']);
      const normalizeText = (value) => String(value || '')
        .toLocaleLowerCase('ar')
        .replace(arabicDiacritics, '')
        .replace(/[إأآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ')
        .trim();
      const tokenList = (value) => normalizeText(value).split(separators).filter((token) => token.length > 1 && !weakTokens.has(token));
      const compactText = (value) => tokenList(value).join('');
      const scoreTerm = (term, text) => {
        const normalizedTerm = normalizeText(term);
        const normalizedText = normalizeText(text);
        if (!normalizedTerm || !normalizedText) return 0;
        if (normalizedText.includes(normalizedTerm) || compactText(normalizedText).includes(compactText(normalizedTerm))) return 1;
        const textTokens = new Set(tokenList(normalizedText));
        const termTokens = tokenList(normalizedTerm);
        if (!termTokens.length) return 0;
        return termTokens.filter((token) => textTokens.has(token)).length / termTokens.length;
      };
      const termsForSide = (side) => [
        side === 'home' ? jobData.homeTeam : jobData.awayTeam,
        ...((side === 'home' ? jobData.homeAliases : jobData.awayAliases) || [])
      ].filter(Boolean);
      const nodes = [...document.querySelectorAll('a,button,[role="button"],[onclick],article,div')];
      const matches = nodes.map((node) => {
        const text = `${node.textContent || ''} ${node.getAttribute('title') || ''}`;
        const homeScore = Math.max(0, ...termsForSide('home').map((term) => scoreTerm(term, text)));
        const awayScore = Math.max(0, ...termsForSide('away').map((term) => scoreTerm(term, text)));
        return { node, score: homeScore >= 0.58 && awayScore >= 0.58 ? homeScore + awayScore : 0 };
      }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
      const target = matches.find((item) => item.node.matches('a,button,[role="button"],[onclick]')) || matches[0];
      if (!target) return false;
      target.node.scrollIntoView({ block: 'center', inline: 'center' });
      target.node.click();
      return true;
    }, { jobData: job });

    if (!clicked) throw new Error(`Match not found: ${job.homeTeam} vs ${job.awayTeam}`);

    await Promise.race([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: config.timeoutMs }).catch(() => null),
      new Promise((resolve) => setTimeout(resolve, 3000))
    ]);
    const destination = popupPage || page;
    if (popupPage) await popupPage.waitForNetworkIdle({ idleTime: 500, timeout: config.timeoutMs }).catch(() => {});
    const resolvedUrl = destination.url();
    assertAllowed(resolvedUrl, allowedMatchPageHosts, 'resolved match URL');
    return resolvedUrl;
  } finally {
    await browser.close();
  }
}

async function scrapeMatch(matchUrl, allowlist, extraSourceHosts = []) {
  const runtimeSourceHosts = [...new Set([...allowlist.sourceHosts, ...extraSourceHosts])];
  assertAllowed(matchUrl, runtimeSourceHosts, 'match URL');
  const browser = await puppeteer.launch(launchOptions());
  const candidates = new Set();
  const embeddedPages = new Set();
  const pagesToInspect = [];
  const inspectedPages = new Set();

  const collect = (value, options = {}) => {
    if (!isCandidateUrl(value)) return;
    try {
      const host = new URL(value).hostname.toLowerCase();
      const isAllowedMedia = allowlist.isAllowed
        ? allowlist.isAllowed(value, 'mediaHosts')
        : allowlist.mediaHosts.length === 0 || allowlist.mediaHosts.some((item) => host === item || host.endsWith(`.${item}`));
      const isAllowedSource = allowlist.isAllowed
        ? allowlist.isAllowed(value, 'sourceHosts') || runtimeSourceHosts.some((item) => host === item || host.endsWith(`.${item}`))
        : runtimeSourceHosts.some((item) => host === item || host.endsWith(`.${item}`));

      if (isMediaUrl(value) && (isAllowedMedia || isAllowedSource)) candidates.add(value);
      if (options.embed && isAllowedSource) {
        embeddedPages.add(value);
        candidates.add(value);
        uniquePush(pagesToInspect, value, 24);
      }
    } catch {}
  };

  async function inspectPage(url, depth = 0) {
    if (inspectedPages.has(url) || depth > 2) return;
    inspectedPages.add(url);
    const page = await browser.newPage();
    page.on('response', (response) => collect(response.url()));
    page.on('frameattached', (frame) => collect(frame.url(), { embed: true }));
    page.on('popup', async (popup) => {
      try {
        await popup.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: config.timeoutMs }).catch(() => null);
        const popupUrl = popup.url();
        if (isCandidateUrl(popupUrl)) collect(popupUrl, { embed: !isMediaUrl(popupUrl) });
        await popup.close().catch(() => {});
      } catch {
        await popup.close().catch(() => {});
      }
    });

    try {
      await page.setViewport({ width: 1365, height: 768 });
      await gotoWithFallback(page, url);

      const dynamicSrcs = await page.$$eval(
        'a[href], iframe[src], source[src], video[src], [data-src], [data-url], [data-stream], [data-player], [onclick], script',
        (elements) => elements.flatMap((element) => {
          const values = [
            element.href,
            element.src,
            element.getAttribute('data-src'),
            element.getAttribute('data-url'),
            element.getAttribute('data-stream'),
            element.getAttribute('data-player'),
            element.getAttribute('onclick'),
            element.tagName === 'SCRIPT' ? element.textContent : ''
          ].filter(Boolean);
          return values.flatMap((value) => {
            const urls = String(value).match(/https?:\/\/[^'"\s<>]+/g);
            return urls || [value];
          });
        }).filter((src) => src && !String(src).startsWith('javascript:'))
      );
      dynamicSrcs.forEach((src) => collect(src, { embed: !isMediaUrl(src) }));

      await page.evaluate(() => {
        const selectors = 'button, [role="button"], .play, .play-button, .btn-play, .server, [class*="server"], [data-src], [data-url]';
        document.querySelectorAll(selectors).forEach((element) => {
          try { element.click(); } catch {}
        });
      });
      await new Promise((resolve) => setTimeout(resolve, 3000));

      for (const frame of page.frames()) {
        const frameUrl = frame.url();
        if (frameUrl && frameUrl !== 'about:blank' && frameUrl !== url) collect(frameUrl, { embed: true });
      }
    } finally {
      await page.close().catch(() => {});
    }

    const nested = [...new Set([...embeddedPages, ...pagesToInspect])]
      .filter((item) => item !== url && !inspectedPages.has(item))
      .slice(0, depth === 0 ? 12 : 6);
    for (const nestedUrl of nested) {
      await inspectPage(nestedUrl, depth + 1).catch((error) => {
        console.warn(`[MEDIA QA] nested player skipped ${nestedUrl}: ${error.message}`);
      });
    }
  }

  try {
    await inspectPage(matchUrl);
  } finally {
    await browser.close();
  }
  return [...candidates];
}

module.exports = { scrapeMatch, resolveMatchUrl, resolveMatchUrls, discoverJobs, isAdUrl, isMediaUrl, normalize, scoreCandidate };