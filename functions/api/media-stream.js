import { createClient } from '@supabase/supabase-js';

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

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await supabase
    .from(env.SUPABASE_STAGING_TABLE || 'media_qa_staging')
    .select('match_id,payload,environment,updated_at')
    .eq('match_id', matchId)
    .eq('environment', 'staging')
    .maybeSingle();

  if (error) return json({ error: 'Unable to read validated stream state' }, 502, origin);
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
