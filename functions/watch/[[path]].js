function cleanOrigin(value) {
  const origin = String(value || 'http://51.170.48.95.nip.io:3000').replace(/\/$/, '');
  return origin.replace('http://51.170.48.95:3000', 'http://51.170.48.95.nip.io:3000');
}

function pathToken(params, url) {
  const rawPath = Array.isArray(params?.path) ? params.path.join('/') : String(params?.path || '');
  const legacyId = url.searchParams.get('id') || '';
  return (rawPath || legacyId || '').replace(/^\/+|\/+$/g, '');
}

export async function onRequest({ request, params, env }) {
  const url = new URL(request.url);
  const secureOrigin = cleanOrigin(env.PAGES_STREAMING_ORIGIN || env.SECURE_STREAMING_ORIGIN || env.STREAM_APP_ORIGIN || env.NEXT_PUBLIC_STREAM_APP_ORIGIN);
  const token = pathToken(params, url);
  const target = new URL(token ? `/watch/${encodeURIComponent(token)}` : '/watch/KoraLive', secureOrigin);

  url.searchParams.delete('id');
  for (const [key, value] of url.searchParams.entries()) {
    target.searchParams.append(key, value);
  }

  const headers = new Headers();
  for (const name of ['accept', 'accept-language', 'cookie', 'user-agent']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('origin', url.origin);
  headers.set('referer', url.toString());
  headers.set('x-koralive-proxied-watch', '1');
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

  return fetch(new Request(target.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual'
  }));
}
