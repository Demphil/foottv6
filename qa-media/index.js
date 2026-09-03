const cron = require('node-cron');
const fs = require('node:fs');
const { URL } = require('node:url');
const { config } = require('./config');
const { loadAllowlist } = require('./allowlist');
const { loadSources, sourceHosts } = require('./source-registry');
const { scrapeMatch, resolveMatchUrls, discoverJobs } = require('./scraper');
const { validateStreams } = require('./validator');
const { extractChannelLinks } = require('./channel-links');
const { saveStaging } = require('./supabase-storage');

// نمط استبعاد أصول الموقع الساكنة
const IGNORED_EXTENSIONS = /\.(css|png|jpg|jpeg|webp|gif|svg|woff|woff2|ttf|eot|js)(\?.*)?$/i;

function readJobs() {
  let raw = String(process.env.MEDIA_QA_JOBS || '').trim();
  if (!raw) {
    try {
      raw = fs.readFileSync(config.jobsFile, 'utf8');
      const fileJobs = JSON.parse(raw);
      if (Array.isArray(fileJobs)) return fileJobs.filter((job) => job && job.matchId);
      if (Array.isArray(fileJobs.jobs)) return fileJobs.jobs.filter((job) => job && job.matchId);
      throw new Error('jobs.json must contain an array or an object with a jobs array');
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new Error(`Cannot read ${config.jobsFile}: ${error.message}`);
    }
  }
  return raw.split(',').map((item) => item.trim()).filter(Boolean)
    .map((item) => {
      const parts = item.split('|');
      if (parts[1]?.startsWith('http')) return { matchId: parts[0], url: parts[1], scheduledAt: parts[2] };
      const [matchId, sourceName, homeTeam, awayTeam, channel, scheduledAt] = parts;
      return { matchId, sourceName, homeTeam, awayTeam, channel, scheduledAt };
    });
}

function isDue(job, now = Date.now()) {
  if (!job.scheduledAt) return true;
  const scheduled = Date.parse(job.scheduledAt);
  if (Number.isNaN(scheduled)) throw new Error(`Invalid scheduledAt for ${job.matchId}`);
  return now >= scheduled - config.leadMinutes * 60 * 1000
    && now <= scheduled + config.postMatchMinutes * 60 * 1000;
}

async function runJob(job, allowlist, sources = null) {
  const report = { matchId: job.matchId, source: job.url || job.sourceName, startedAt: new Date().toISOString() };
  try {
    const configuredSources = sources || await loadSources();
    const resolved = job.url
      ? { matches: [{ sourceName: job.sourceName || 'direct-job-url', matchUrl: job.url }], failures: [] }
      : await resolveMatchUrls(job, configuredSources, allowlist);
    const allScraped = [];
    const sourceReports = [];
    const allValidation = [];
    const channelLinks = job.channel ? await extractChannelLinks(job.channel) : [];
    
    // فلترة الملفات الساكنة والتحقق من النطاقات المسموحة
    const allowedChannelLinks = channelLinks.filter((item) => {
      try {
        if (IGNORED_EXTENSIONS.test(item.url)) return false;
        return allowlist.sourceHosts.includes(new URL(item.url).hostname.toLowerCase());
      } catch {
        return false;
      }
    });

    allScraped.push(...allowedChannelLinks.map((item) => item.url));
    report.channelLinks = { found: channelLinks.length, allowed: allowedChannelLinks.length };
    if (channelLinks.length && !allowedChannelLinks.length) {
      console.warn(`[MEDIA QA] ${channelLinks.length} local channel link(s) skipped: host is not authorized or is a static asset`);
    }

    for (const candidate of resolved.matches) {
      try {
        const rawScraped = await scrapeMatch(candidate.matchUrl, allowlist);
        // استبعاد الملفات الساكنة المجلوبة من السكرايبر
        const scraped = rawScraped.filter((url) => !IGNORED_EXTENSIONS.test(url));
        
        allScraped.push(...scraped);
        const sourceValidation = await validateStreams(scraped, allowlist);
        allValidation.push(...sourceValidation.report.map((item) => ({ ...item, sourceName: candidate.sourceName, matchUrl: candidate.matchUrl })));
        sourceReports.push({
          sourceName: candidate.sourceName,
          matchUrl: candidate.matchUrl,
          scrapedCount: scraped.length,
          passedCount: sourceValidation.passed.length,
          status: 'CHECKED'
        });
      } catch (error) {
        sourceReports.push({ sourceName: candidate.sourceName, matchUrl: candidate.matchUrl, scrapedCount: 0, status: 'FAILED', error: error.message });
      }
    }

    // 1. تحديد السيرفرات المقبولة وتطبيق الحد الأقصى (maxStreams)
    const validation = {
      report: allValidation,
      passed: allValidation.filter((item) => item.status === 'Passed').slice(0, config.maxStreams)
    };

    if (allowedChannelLinks.length) {
      const channelValidation = await validateStreams(allowedChannelLinks.map((item) => item.url), allowlist);
      validation.report.unshift(...channelValidation.report.map((item) => ({ ...item, sourceName: 'local-channel-page', matchUrl: allowedChannelLinks[0].page })));
      validation.passed = [...channelValidation.passed, ...validation.passed]
        .filter((item, index, items) => items.findIndex((candidate) => candidate.url === item.url) === index)
        .slice(0, config.maxStreams); // عدم تجاوز الحد الأقصى للسيرفرات للمشغل
    }

    report.sourceReports = sourceReports;
    report.sourceFailures = resolved.failures;
    report.sourceCount = resolved.matches.length;
    report.scrapedCount = allScraped.length;
    report.validation = validation.report;
    report.passedCount = validation.passed.length;

    console.table(sourceReports);
    console.table(validation.report);

    // 2. شرط الإيقاف: يفشل الاختبار فقط إذا لم يتم العثور على أي سيرفر شغال (0)
    if (validation.passed.length < 1) {
      throw new Error(`ABORTED: 0 validated streams found across ${resolved.matches.length} source match pages`);
    }

    report.streams = validation.passed; // تحتوي على سيرفر واحد أو أكثر (بحد أقصى maxStreams)
    report.status = 'PASSED_STAGING';

    if (!config.dryRun) {
      await saveStaging(job.matchId, report);
    } else {
      console.log('[DRY RUN] staging write skipped');
    }
    
  } catch (error) {
    report.status = 'ABORTED';
    report.error = error.stack || error.message;
    console.error(JSON.stringify(report, null, 2));
    throw Object.assign(new Error(report.error), { report });
  }
  return report;
}

async function runOnce() {
  const configuredJobs = readJobs();
  const allowlist = await loadAllowlist();
  const sources = await loadSources();
  allowlist.sourceHosts.push(...sourceHosts(sources));
  allowlist.sourceHosts = [...new Set(allowlist.sourceHosts)];
  const jobs = configuredJobs.length || !config.autoDiscoverJobs
    ? configuredJobs.filter((job) => isDue(job))
    : (await discoverJobs(sources, allowlist)).filter((job) => isDue(job));
  if (!jobs.length) {
    console.log(`[MEDIA QA] No due jobs. Add matches to ${config.jobsFile} or set MEDIA_QA_JOBS.`);
    return [];
  }
  if (!allowlist.sourceHosts.length) throw new Error('Runtime allowlist has no authorized source hosts');
  return Promise.all(jobs.map((job) => runJob(job, allowlist, sources)));
}

if (require.main === module) {
  if (process.argv.includes('--once')) runOnce().catch((error) => { console.error(error.stack); process.exitCode = 1; });
  else { cron.schedule(config.cron, () => runOnce().catch((error) => console.error(error.stack))); console.log(`Media QA scheduler active: ${config.cron}`); }
}

module.exports = { runJob, runOnce };