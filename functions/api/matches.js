function json(body, status, origin = '*') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, max-age=0, s-maxage=0, must-revalidate',
      pragma: 'no-cache',
      expires: '0',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, OPTIONS'
    }
  });
}

function moroccoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function moroccoTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Casablanca',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function moroccoParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Casablanca',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date);

  return Object.fromEntries(parts
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value }) => [type, Number(value)]));
}

function localMoroccoDateTimeToUtcIso(dateKey, hour = 0, minute = 0, second = 0) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const zoned = moroccoParts(new Date(localAsUtc));
  const offsetAsUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second);
  return new Date(localAsUtc - (offsetAsUtc - localAsUtc)).toISOString();
}

function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function normalizeChannelName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[|/\\_\-:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('ar');
}

function firstNumber(value) {
  const normalizedDigits = String(value || '').replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const match = normalizedDigits.match(/\d+/);
  return match ? match[0] : '';
}

function canonicalChannelName(value) {
  const text = normalizeChannelName(value);
  const compact = text.replace(/\s+/g, '');
  const number = firstNumber(text);

  if (/bein|be in|بي ?ان|بى ?ان|بين/.test(text) || compact.includes('بيان') || compact.includes('بين')) {
    if (/max|ماكس/i.test(text)) return `bein sports max ${number || '1'}`;
    return `bein sports hd ${number || '1'}`;
  }

  if (/ssc|اس ?اس ?سي/i.test(text)) return `ssc ${number || '1'} hd`;
  if (/on ?time|on ?sport|اون ?تايم|اون ?سبورت|أون ?سبورت/i.test(text) || compact.includes('اونسبورت')) {
    if (/plus|بلس/i.test(text)) return 'on sport plus';
    if (/max|ماكس/i.test(text)) return 'on sport max';
    return `on time sports ${number || '1'}`;
  }
  if (/arryadia|رياضيه|الرياضيه|المغربيه الرياضيه/i.test(text)) return 'arryadia tnt';
  if (/shahid|شاهد/i.test(text)) return 'shahid vip';
  if (/mbc/i.test(text)) return 'mbc action';
  if (/ad sports|abu dhabi|ابو ظبي|ابوظبي/i.test(text)) return `ad sports premium ${number || '1'}`;

  return text;
}

function channelKeyVariants(value) {
  const text = normalizeChannelName(value);
  const canonical = canonicalChannelName(value);
  const variants = new Set([text, canonical].filter(Boolean));
  if (/on ?sport|اون ?سبورت|أون ?سبورت/i.test(text) && /max|ماكس/i.test(text)) {
    variants.add('on time sports 1');
  }
  return variants;
}

function addChannelKeys(target, value) {
  for (const key of channelKeyVariants(value)) target.add(key);
}

function channelExists(activeChannelNames, value) {
  for (const key of channelKeyVariants(value)) {
    if (activeChannelNames.has(key)) return true;
  }
  return false;
}

async function readActiveChannelNames(env, origin) {
  const endpoint = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/channels`);
  endpoint.searchParams.set('select', 'name,active');
  endpoint.searchParams.set('active', 'eq.true');
  endpoint.searchParams.set('limit', '2000');

  try {
    const response = await fetch(endpoint, {
      cache: 'no-store',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        accept: 'application/json',
        'cache-control': 'no-cache'
      }
    });
    if (!response.ok) return new Set();
    const rows = await response.json();
    const names = new Set();
    for (const row of Array.isArray(rows) ? rows : []) addChannelKeys(names, row.name);
    return names;
  } catch {
    return new Set();
  }
}

function toFrontendMatch(row, activeChannelNames = new Set()) {
  const payload = row.payload || {};
  const scheduledAt = row.kickoff_time || payload.scheduledAt || '';
  const homeTeam = row.home_team || payload.homeTeam?.name || payload.homeTeam || '';
  const awayTeam = row.away_team || payload.awayTeam?.name || payload.awayTeam || '';
  const channel = row.channel || payload.channel || '';
  const streamReady = channelExists(activeChannelNames, channel);

  return {
    ...(payload || {}),
    match_id: row.match_id || row.id,
    matchId: row.match_id || row.id,
    homeTeam,
    awayTeam,
    homeLogo: payload.homeLogo || payload.homeTeam?.logo || '',
    awayLogo: payload.awayLogo || payload.awayTeam?.logo || '',
    scheduledAt,
    time: payload.time || moroccoTime(scheduledAt),
    score: payload.score || 'VS',
    league: row.league || payload.league || '',
    channel,
    commentator: payload.commentator || '',
    streams: Array.isArray(payload.streams) ? payload.streams : [],
    streamReady,
    isLive: Boolean(payload.isLive),
    updatedAt: row.updated_at
  };
}

export async function onRequestOptions({ request, env }) {
  const origin = env.PUBLIC_SITE_ORIGIN || request.headers.get('origin') || '*';
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}

export async function onRequestGet({ request, env }) {
  const origin = env.PUBLIC_SITE_ORIGIN || request.headers.get('origin') || '*';
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Match service is not configured' }, 503, origin);
  }

  const table = env.SUPABASE_MATCHES_TABLE || 'matches';
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) return json({ error: 'Invalid matches table configuration' }, 500, origin);

  const endpoint = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`);
  endpoint.searchParams.set('select', 'id,match_id,home_team,away_team,league,kickoff_time,channel,payload,active,updated_at');
  const todayKey = moroccoDate(new Date());
  const rangeStart = localMoroccoDateTimeToUtcIso(todayKey, 0, 0, 0);
  const rangeEnd = localMoroccoDateTimeToUtcIso(addDaysToDateKey(todayKey, 2), 0, 0, 0);
  endpoint.searchParams.set('kickoff_time', `gte.${rangeStart}`);
  endpoint.searchParams.append('kickoff_time', `lt.${rangeEnd}`);
  endpoint.searchParams.set('order', 'kickoff_time.asc.nullslast');
  endpoint.searchParams.set('limit', '300');

  let response;
  try {
    response = await fetch(endpoint, {
      cache: 'no-store',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        accept: 'application/json',
        'cache-control': 'no-cache'
      }
    });
  } catch {
    return json({ error: 'Unable to reach match storage' }, 502, origin);
  }

  if (!response.ok) return json({ error: 'Unable to read match storage' }, 502, origin);
  const rows = await response.json();
  const activeChannelNames = await readActiveChannelNames(env, origin);
  const seen = new Set();
  const matches = (Array.isArray(rows) ? rows : [])
    .map((row) => toFrontendMatch(row, activeChannelNames))
    .filter((match) => match.homeTeam && match.awayTeam && match.scheduledAt)
    .filter((match) => String(match.homeTeam).trim() !== String(match.awayTeam).trim())
    .filter((match) => String(match.homeTeam).trim().toLocaleLowerCase('ar') !== String(match.awayTeam).trim().toLocaleLowerCase('ar'))
    .filter((match) => {
      const key = `${String(match.homeTeam).trim().normalize('NFKC').toLocaleLowerCase('ar')}|${String(match.awayTeam).trim().normalize('NFKC').toLocaleLowerCase('ar')}|${String(match.scheduledAt).slice(0, 10)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const day = new URL(request.url).searchParams.get('day');
  const today = moroccoDate(new Date());
  const tomorrow = moroccoDate(Date.now() + 86400000);
  const filtered = day === 'tomorrow'
    ? matches.filter((match) => moroccoDate(match.scheduledAt) === tomorrow)
    : day === 'today'
      ? matches.filter((match) => moroccoDate(match.scheduledAt) === today)
      : matches;

  return json({ matches: filtered }, 200, origin);
}
