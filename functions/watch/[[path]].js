function cleanOrigin(value) {
  const origin = String(value || 'http://51.170.48.95.nip.io:3000').replace(/\/$/, '');
  return origin.replace('http://51.170.48.95:3000', 'http://51.170.48.95.nip.io:3000');
}

function pathToken(params, url) {
  const rawPath = Array.isArray(params?.path) ? params.path.join('/') : String(params?.path || '');
  const legacyId = url.searchParams.get('id') || '';
  return (rawPath || legacyId || '').replace(/^\/+|\/+$/g, '');
}

function responseHeaders(response) {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-security-policy');
  return headers;
}

function liveWatchCss() {
  return `
<style id="koralive-watch-live-fix">
.watch-page{padding-top:16px!important}
.player-title,.player-seo-description,.watch-page .player-card>.alert-box{display:none!important}
.secure-player-shell{transform:translateZ(0)!important}
.player-topbar{grid-template-columns:auto minmax(260px,1fr) auto!important}
.player-topbar>.topbar-actions{grid-column:1!important;grid-row:1!important;direction:ltr!important;justify-content:flex-start!important}
.player-topbar>.quality-tabs{grid-column:2!important;grid-row:1!important}
.player-topbar>.header-logo{grid-column:3!important;grid-row:1!important;min-width:164px!important;min-height:44px!important;background:url("/assets/images/logo.png") center/148px auto no-repeat,linear-gradient(135deg,#6826a2,#e0187e)!important}
.player-topbar>.header-logo strong,.player-topbar>.header-logo span{opacity:0!important;font-size:0!important}
.news-image-wrapper{background:url("/assets/images/logo.png") center/62% auto no-repeat,linear-gradient(135deg,#16294b,#4b1d78 62%,#d9167b)!important}
.news-image-wrapper img[src*="default-news.jpg"]{display:none!important}
@media(max-width:720px){
  .player-topbar{grid-template-columns:1fr!important}
  .player-topbar>.topbar-actions,.player-topbar>.quality-tabs,.player-topbar>.header-logo{grid-column:1!important;grid-row:auto!important}
  .player-topbar>.header-logo{width:100%!important;background-size:150px auto!important}
}
</style>`;
}

function liveWatchScript() {
  return `
<script id="koralive-watch-stability-fix">
(function(){
  function clickQuality(label){
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.quality-tabs button'));
    var target = buttons.find(function(button){ return (button.textContent || '').indexOf(label) !== -1; });
    if (target && !target.classList.contains('active')) target.click();
  }
  window.addEventListener('load', function(){
    setTimeout(function(){ clickQuality('720'); }, 900);
    var tried360 = false;
    setInterval(function(){
      var errorBox = document.querySelector('.vjs-error-display');
      var visibleError = errorBox && getComputedStyle(errorBox).display !== 'none' && (errorBox.textContent || '').trim();
      if (visibleError && !tried360) {
        tried360 = true;
        clickQuality('360');
      }
    }, 2500);
  });
})();
</script>`;
}

async function patchWatchHtml(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();
  html = html
    .replaceAll('/assets/images/default-news.jpg', '/assets/images/logo.png')
    .replace('</head>', `${liveWatchCss()}${liveWatchScript()}</head>`);

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders(response)
  });
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

  const response = await fetch(new Request(target.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual'
  }));

  if (request.method === 'GET' && response.ok) {
    return patchWatchHtml(response);
  }

  return response;
}
