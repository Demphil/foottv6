function json(body, status, origin = '*') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, OPTIONS'
    }
  });
}

const BLOCKED_HOSTS = ['monetag.com', 'popads.net', 'propellerads.com', 'popcash.net', 'adsterra.com'];
const MAX_DISPLAY_STREAMS = 4;

function isBlockedUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return true;
  }
}

async function isWorkingStream(stream) {
  if (!stream || typeof stream.url !== 'string' || isBlockedUrl(stream.url)) return false;
  const isHls = /\.m3u8(?:$|[?#])/i.test(stream.url);
  const isMp4 = /\.mp4(?:$|[?#])/i.test(stream.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(stream.url, {
      method: isMp4 ? 'HEAD' : 'GET',
      headers: { accept: isHls ? 'application/vnd.apple.mpegurl,*/*' : 'text/html,*/*' },
      signal: controller.signal
    });
    if (response.status !== 200 && !(isMp4 && response.status === 206)) return false;
    if (isHls) return (await response.text()).includes('#EXTM3U');
    if (!isMp4) return (response.headers.get('content-type') || '').toLowerCase().includes('text/html');
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
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
  const maxStreamAgeMs = Number.parseInt(env.MEDIA_STREAM_MAX_AGE_MS || '900000', 10);
  const origin = env.PUBLIC_SITE_ORIGIN || request.headers.get('origin') || '*';
  const matchId = new URL(request.url).searchParams.get('matchId')?.trim();
  if (!matchId || !/^[\p{L}\p{N}_-]{1,180}$/u.test(matchId)) {
    return json({ error: 'A valid matchId is required' }, 400, origin);
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Media stream service is not configured' }, 503, origin);
  }

  const table = env.SUPABASE_STAGING_TABLE || 'media_qa_staging';
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
    return json({ error: 'Invalid staging table configuration' }, 500, origin);
  }

  const baseUrl = env.SUPABASE_URL.endsWith('/') ? env.SUPABASE_URL.slice(0, -1) : env.SUPABASE_URL;
  const endpoint = new URL(`${baseUrl}/rest/v1/${table}`);
  endpoint.searchParams.set('select', 'match_id,payload,environment,updated_at');
  endpoint.searchParams.set('match_id', `eq.${matchId}`);
  endpoint.searchParams.set('environment', 'eq.staging');
  endpoint.searchParams.set('limit', '1');

  let response;
  try {
    response = await fetch(endpoint, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        accept: 'application/json'
      }
    });
  } catch {
    return json({ error: 'Unable to reach stream storage' }, 502, origin);
  }

  if (!response.ok) return json({ error: 'Unable to read validated stream state' }, 502, origin);
  const rows = await response.json();
  const data = Array.isArray(rows) ? rows[0] : null;
  if (!data || data.payload?.status !== 'PASSED_STAGING') {
    return json({ error: 'No validated stream is available' }, 404, origin);
  }

  const updatedAt = Date.parse(data.updated_at || '');
  if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > maxStreamAgeMs) {
    return json({ error: 'Validated stream state is stale' }, 404, origin);
  }

  const streams = Array.isArray(data.payload.streams) ? data.payload.streams : [];
  const freshStreams = [];
  for (const stream of streams.filter((item) => item?.status === 'Passed')) {
    if (await isWorkingStream(stream)) freshStreams.push(stream);
    if (freshStreams.length === MAX_DISPLAY_STREAMS) break;
  }
  if (!freshStreams.length) return json({ error: 'No working stream is available' }, 404, origin);

  return json({
    matchId: data.match_id,
    updatedAt: data.updated_at,
    streams: freshStreams
  }, 200, origin);
}
