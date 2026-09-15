function cleanOrigin(value) {
  return String(value || 'http://51.170.48.95:3000').replace(/\/$/, '');
}

function pathToken(params) {
  const rawPath = Array.isArray(params?.path) ? params.path.join('/') : String(params?.path || '');
  return rawPath.replace(/^\/+/, '');
}

export async function onRequest({ request, params, env }) {
  const url = new URL(request.url);
  const secureOrigin = cleanOrigin(env.SECURE_STREAMING_ORIGIN || env.STREAM_APP_ORIGIN || env.NEXT_PUBLIC_STREAM_APP_ORIGIN);
  const target = new URL(`/embed/${pathToken(params)}`, secureOrigin);
  target.search = url.search;

  const headers = new Headers(request.headers);
  headers.set('x-koralive-proxied-embed', '1');
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

  return fetch(new Request(target.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual'
  }));
}
