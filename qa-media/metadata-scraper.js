require('dotenv').config({ path: require('node:path').resolve(process.cwd(), '.env') });

const cron = require('node-cron');
const { config } = require('./config');
const { saveStaging } = require('./supabase-storage');

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function valueFrom(object, keys) {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function teamName(value) {
  return clean(typeof value === 'object' ? value.name || value.title || value.team : value);
}

function absoluteUrl(value, baseUrl) {
  if (!value) return '';
  try {
    const url = new URL(String(value), baseUrl);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function slug(value) {
  return clean(value).toLocaleLowerCase('ar')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeScheduledAt(value, timeZone = 'Africa/Casablanca') {
  const text = clean(value);
  if (!text) return '';
  if (/\d{4}-\d{2}-\d{2}/.test(text)) {
    const parsed = /[zZ]|[+-]\d{2}:?\d{2}$/.test(text) ? new Date(text) : new Date(`${text.replace(' ', 'T')}+00:00`);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
  }
  const time = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!time) return '';
  const now = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const local = new Date(`${now}T${String(time[1]).padStart(2, '0')}:${time[2]}:00`);
  return Number.isNaN(local.getTime()) ? '' : local.toISOString();
}

function metadataKey(job) {
  return `${clean(job.homeTeam).normalize('NFKC').toLocaleLowerCase('ar')}|${clean(job.awayTeam).normalize('NFKC').toLocaleLowerCase('ar')}|${clean(job.scheduledAt).slice(0, 10) || 'undated'}`;
}

function normalizeMatch(raw, index, baseUrl) {
  const homeValue = valueFrom(raw, ['homeTeam', 'home_team', 'team_home', 'home', 'team1']);
  const awayValue = valueFrom(raw, ['awayTeam', 'away_team', 'team_away', 'away', 'team2']);
  const homeTeam = teamName(homeValue);
  const awayTeam = teamName(awayValue);
  if (!homeTeam || !awayTeam || homeTeam.normalize('NFKC').toLocaleLowerCase('ar') === awayTeam.normalize('NFKC').toLocaleLowerCase('ar')) return null;

  const timeZone = clean(valueFrom(raw, ['timeZone', 'timezone'])) || 'Africa/Casablanca';
  const scheduledAt = normalizeScheduledAt(valueFrom(raw, ['scheduledAt', 'scheduled_at', 'date', 'matchDate', 'match_date', 'time']), timeZone);
  const homeLogo = absoluteUrl(valueFrom(typeof homeValue === 'object' ? homeValue : {}, ['logo', 'logoUrl', 'logo_url']) || valueFrom(raw, ['homeLogo', 'home_logo']), baseUrl);
  const awayLogo = absoluteUrl(valueFrom(typeof awayValue === 'object' ? awayValue : {}, ['logo', 'logoUrl', 'logo_url']) || valueFrom(raw, ['awayLogo', 'away_logo']), baseUrl);
  const channel = clean(valueFrom(raw, ['channel', 'channelName', 'channel_name', 'broadcaster', 'tvChannel', 'tv_channel'])) || 'تحدد لاحقاً';
  const matchUrl = absoluteUrl(valueFrom(raw, ['matchUrl', 'match_url', 'url', 'link']), baseUrl);
  const matchId = `${slug(homeTeam)}-${slug(awayTeam)}-${scheduledAt.slice(0, 10) || `undated-${index}`}`;

  return {
    matchId,
    homeTeam,
    awayTeam,
    homeLogo,
    awayLogo,
    time: clean(valueFrom(raw, ['time', 'matchTime', 'match_time'])) || (scheduledAt ? new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(scheduledAt)) : '--:--'),
    scheduledAt,
    timeZone,
    channel,
    league: clean(valueFrom(raw, ['league', 'competition', 'tournament'])) || '',
    matchUrl,
    matchUrls: matchUrl ? [matchUrl] : [],
    sourceName: 'schedule-api'
  };
}

function extractMatches(body) {
  if (Array.isArray(body)) return body;
  return body?.matches || body?.data || body?.results || [];
}

async function fetchSchedule() {
  if (!config.scheduleApiUrl) throw new Error('SCHEDULE_API_URL is required for JSON schedule ingestion');
  const response = await fetch(config.scheduleApiUrl, { headers: { accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Schedule API HTTP ${response.status}`);
  return response.json();
}

async function runMetadataOnce() {
  const body = await fetchSchedule();
  const deduplicated = new Map();
  const rawMatches = extractMatches(body);
  if (!Array.isArray(rawMatches)) throw new Error('Schedule API response must contain an array of matches');

  rawMatches.forEach((raw, index) => {
    const match = normalizeMatch(raw, index, config.scheduleApiUrl);
    if (match) deduplicated.set(metadataKey(match), match);
  });

  const jobs = [...deduplicated.values()].slice(0, config.autoDiscoverLimit);
  for (const job of jobs) {
    await saveStaging(job.matchId, {
      ...job,
      status: 'METADATA_READY',
      resolverStatus: 'PENDING',
      streams: [],
      sourceReports: [],
      updatedBy: 'schedule-api'
    });
  }
  console.log(`[METADATA] Schedule API returned ${rawMatches.length} match(es); saved ${jobs.length} unique match(es)`);
  return jobs;
}

if (require.main === module) {
  if (process.argv.includes('--once')) runMetadataOnce().catch((error) => { console.error(error.stack); process.exitCode = 1; });
  else { cron.schedule(config.cron, () => runMetadataOnce().catch((error) => console.error(error.stack))); console.log(`[METADATA] Scheduler active: ${config.cron}`); }
}

module.exports = { fetchSchedule, normalizeMatch, metadataKey, runMetadataOnce };
