const { URL } = require('node:url');

function list(value) {
  return String(value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
}

const config = {
  dryRun: process.env.DRY_RUN !== 'false',
  minValidStreams: Number(process.env.MIN_VALID_STREAMS || 3),
  cron: process.env.MEDIA_QA_CRON || '*/5 * * * *',
  leadMinutes: Number(process.env.MEDIA_QA_LEAD_MINUTES || 15),
  postMatchMinutes: Number(process.env.MEDIA_QA_POST_MATCH_MINUTES || 180),
  allowlistFile: process.env.AUTHORIZED_SOURCES_FILE || 'qa-media/authorized-sources.json',
  jobsFile: process.env.MEDIA_QA_JOBS_FILE || 'qa-media/jobs.json',
  allowlistCollection: process.env.SUPABASE_ALLOWLIST_TABLE || 'media_qa_authorized_sources',
  stagingCollection: process.env.SUPABASE_STAGING_TABLE || 'media_qa_staging',
  timeoutMs: Number(process.env.MEDIA_QA_TIMEOUT_MS || 10000),
  maxStreams: Number(process.env.MAX_STREAMS || 4),
  browserExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '',
  autoDiscoverJobs: process.env.MEDIA_QA_AUTO_DISCOVER !== 'false',
  autoDiscoverLimit: Number(process.env.MEDIA_QA_AUTO_DISCOVER_LIMIT || 20)
};

function assertAllowed(url, hosts, label) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol) || !hosts.includes(parsed.hostname.toLowerCase())) {
    throw new Error(`${label} is not in its configured allowlist: ${parsed.hostname}`);
  }
  return parsed;
}

module.exports = { config, assertAllowed, list };
