const cron = require('node-cron');
const { config } = require('./config');
const { loadAllowlist } = require('./allowlist');
const { loadSources, sourceHosts } = require('./source-registry');
const { scrapeMatch, resolveMatchUrl } = require('./scraper');
const { validateStreams } = require('./validator');
const { saveStaging } = require('./supabase-storage');

function readJobs() {
  return String(process.env.MEDIA_QA_JOBS || '').split(',').map((item) => item.trim()).filter(Boolean)
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
    const matchUrl = job.url || await resolveMatchUrl(job, configuredSources, allowlist);
    report.source = matchUrl;
    const scraped = await scrapeMatch(matchUrl, allowlist);
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
  const sources = await loadSources();
  allowlist.sourceHosts.push(...sourceHosts(sources));
  allowlist.sourceHosts = [...new Set(allowlist.sourceHosts)];
  if (!allowlist.sourceHosts.length) throw new Error('Runtime allowlist has no authorized source hosts');
  return Promise.all(jobs.map((job) => runJob(job, allowlist, sources)));
}

if (require.main === module) {
  if (process.argv.includes('--once')) runOnce().catch((error) => { console.error(error.stack); process.exitCode = 1; });
  else { cron.schedule(config.cron, () => runOnce().catch((error) => console.error(error.stack))); console.log(`Media QA scheduler active: ${config.cron}`); }
}

module.exports = { runJob, runOnce };
