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

  const streams = Array.isArray(data.payload.streams) ? data.payload.streams : [];
  return json({
    matchId: data.match_id,
    updatedAt: data.updated_at,
    streams: streams.filter((stream) => stream?.status === 'Passed' && typeof stream.url === 'string').slice(0, 5)
  }, 200, origin);
}
