const { URL } = require('node:url');

function list(value) {
  return String(value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
}

const config = {
  dryRun: process.env.DRY_RUN !== 'false',
  minValidStreams: Number(process.env.MIN_VALID_STREAMS || 5),
  cron: process.env.MEDIA_QA_CRON || '* * * * *',
  leadMinutes: Number(process.env.MEDIA_QA_LEAD_MINUTES || 15),
  sourceHosts: list(process.env.ALLOWED_SOURCE_HOSTS),
  mediaHosts: list(process.env.ALLOWED_MEDIA_HOSTS),
  stagingCollection: process.env.FIRESTORE_STAGING_COLLECTION || 'media_qa_staging',
  timeoutMs: Number(process.env.MEDIA_QA_TIMEOUT_MS || 10000),
  maxStreams: Number(process.env.MAX_STREAMS || 5)
};

function assertAllowed(url, hosts, label) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol) || !hosts.includes(parsed.hostname.toLowerCase())) {
    throw new Error(`${label} is not in its configured allowlist: ${parsed.hostname}`);
  }
  return parsed;
}

module.exports = { config, assertAllowed };
