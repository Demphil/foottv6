function cleanOrigin(value) {
  return String(value || 'http://51.170.48.95:3000').replace(/\/$/, '');
}

function pathToken(params, url) {
  const rawPath = Array.isArray(params?.path) ? params.path.join('/') : String(params?.path || '');
  const legacyId = url.searchParams.get('id') || '';
  return (rawPath || legacyId || '').replace(/^\/+|\/+$/g, '');
}

export async function onRequest({ request, params, env }) {
  const url = new URL(request.url);
  const secureOrigin = cleanOrigin(env.SECURE_STREAMING_ORIGIN || env.STREAM_APP_ORIGIN || env.NEXT_PUBLIC_STREAM_APP_ORIGIN);
  const token = pathToken(params, url);
  const target = new URL(token ? `/watch/${encodeURIComponent(token)}` : '/watch/KoraLive', secureOrigin);

  url.searchParams.delete('id');
  for (const [key, value] of url.searchParams.entries()) {
    target.searchParams.append(key, value);
  }

  return Response.redirect(target.toString(), 302);
}
