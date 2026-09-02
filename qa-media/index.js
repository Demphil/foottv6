const cron = require('node-cron');
const { config } = require('./config');
const { loadAllowlist } = require('./allowlist');
const { scrapeMatch } = require('./scraper');
const { validateStreams } = require('./validator');
const { saveStaging } = require('./firestore');

function readJobs() {
  return String(process.env.MEDIA_QA_JOBS || '').split(',').map((item) => item.trim()).filter(Boolean)
    .map((item) => { const [matchId, url, scheduledAt] = item.split('|'); return { matchId, url, scheduledAt }; });
}

function isDue(job, now = Date.now()) {
  if (!job.scheduledAt) return true;
  const scheduled = Date.parse(job.scheduledAt);
  if (Number.isNaN(scheduled)) throw new Error(`Invalid scheduledAt for ${job.matchId}`);
  return now >= scheduled - config.leadMinutes * 60 * 1000 && now <= scheduled;
}

async function runJob(job, allowlist) {
  const report = { matchId: job.matchId, source: job.url, startedAt: new Date().toISOString() };
  try {
    const scraped = await scrapeMatch(job.url, allowlist);
    const validation = await validateStreams(scraped, allowlist);
    report.scrapedCount = scraped.length;
    report.validation = validation.report;
    report.passedCount = validation.passed.length;
    console.table(validation.report);
    if (validation.passed.length < config.minValidStreams) {
      throw new Error(`ABORTED: ${validation.passed.length}/${config.minValidStreams} validated streams`);
    }
    report.streams = validation.passed;
    report.status = 'PASSED_STAGING';
    if (!config.dryRun) await saveStaging(job.matchId, report);
    else console.log('[DRY RUN] staging write skipped');
  } catch (error) {
    report.status = 'ABORTED';
    report.error = error.stack || error.message;
    console.error(JSON.stringify(report, null, 2));
    throw Object.assign(new Error(report.error), { report });
  }
  return report;
}

async function runOnce() {
  const jobs = readJobs().filter((job) => isDue(job));
  if (!jobs.length) throw new Error('MEDIA_QA_JOBS is empty; no authorized QA jobs configured');
  const allowlist = await loadAllowlist();
  if (!allowlist.sourceHosts.length) throw new Error('Runtime allowlist has no authorized source hosts');
  return Promise.all(jobs.map((job) => runJob(job, allowlist)));
}

if (require.main === module) {
  if (process.argv.includes('--once')) runOnce().catch((error) => { console.error(error.stack); process.exitCode = 1; });
  else { cron.schedule(config.cron, () => runOnce().catch((error) => console.error(error.stack))); console.log(`Media QA scheduler active: ${config.cron}`); }
}

module.exports = { runJob, runOnce };
