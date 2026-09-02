// Load only streams that passed the server-side freshness and health checks.
(async function loadValidatedStreams() {
  const params = new URLSearchParams(window.location.search);
  const matchId = params.get('matchId');
  if (!matchId) return;

  const playerFrame = document.querySelector('#player-container iframe, .iframe-container iframe, body > iframe');
  let container = document.querySelector('#player-container, .iframe-container') || playerFrame?.parentElement;
  if (!container) return;
  if (container === document.body && playerFrame) {
    const surface = document.createElement('div');
    surface.id = 'qa-player-surface';
    surface.style.cssText = 'width:100%;height:100%;';
    playerFrame.replaceWith(surface);
    container = surface;
  }

  document.querySelectorAll('.servers-menu, .alert-box').forEach((element) => {
    element.remove();
  });

  const stage = document.createElement('main');
  stage.className = 'qa-player-stage';
  stage.innerHTML = '<header class="qa-player-banner"><strong>كورة لايف | البث المباشر</strong><span>إذا توقف السيرفر الحالي، اختر سيرفراً آخر من الخيارات أسفل العنوان.</span></header><div class="qa-player-layout"><aside class="qa-ad-slot qa-ad-left" aria-label="إعلان"></aside><section class="qa-player-center"></section><aside class="qa-ad-slot qa-ad-right" aria-label="إعلان"></aside></div>';
  container.parentElement.insertBefore(stage, container);
  stage.querySelector('.qa-player-center').appendChild(container);

  let hlsInstance = null;
  const style = document.createElement('style');
  style.textContent = 'html,body{margin:0;min-width:0;overflow-x:hidden;background:#10172d;color:#fff}.qa-player-stage{box-sizing:border-box;width:min(1240px,calc(100% - 24px));margin:24px auto;padding:16px;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:#26345d;box-shadow:0 22px 60px rgba(8,12,30,.45);transform:perspective(1100px) rotateX(.35deg)}.qa-player-banner{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 18px;margin-bottom:14px;border-radius:12px;background:#111f45;color:#fff;box-shadow:0 8px 20px rgba(0,0,0,.2)}.qa-player-banner strong{min-width:0;font-size:clamp(16px,2vw,24px);overflow-wrap:anywhere}.qa-player-banner span{max-width:100%;font-size:14px;color:#f6d7e8;overflow-wrap:anywhere}.qa-player-layout{display:grid;grid-template-columns:minmax(100px,180px) minmax(0,900px) minmax(100px,180px);gap:14px;align-items:stretch}.qa-player-center{width:100%;height:min(68vh,620px);aspect-ratio:16/9;min-width:0;border-radius:12px;overflow:hidden;background:#080b14;box-shadow:0 14px 35px rgba(0,0,0,.45)}.stream-server-choices{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:10px;background:#111827}.stream-server-button{border:0;border-radius:6px;padding:8px 14px;background:#3b2a68;color:#fff;cursor:pointer}.stream-server-button.active{background:#e74c3c}.stream-unavailable{display:grid;place-items:center;height:100%;min-height:220px;padding:18px;text-align:center;color:#fff;background:#111827;font:600 16px Arial}.qa-ad-slot{min-height:250px;border-radius:10px;background:rgba(255,255,255,.06)}@media(max-width:760px){.qa-player-stage{width:calc(100% - 16px);margin:12px auto;padding:10px;transform:none}.qa-player-banner{display:block;text-align:center}.qa-player-banner span{display:block;margin-top:7px;line-height:1.5}.qa-player-layout{display:block}.qa-ad-slot{display:none}.qa-player-center{height:auto;min-height:220px;margin-top:8px}}';
  document.head.appendChild(style);
  const showUnavailable = () => {
    container.innerHTML = '<div class="stream-unavailable" role="status">البث غير متاح حالياً، يرجى المحاولة لاحقاً.</div>';
  };

  const loadHls = () => new Promise((resolve, reject) => {
    if (window.Hls) return resolve(window.Hls);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
    script.onload = () => resolve(window.Hls);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const playStream = async (stream) => {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    const isHls = stream.type === 'hls' || /\.m3u8(?:$|[?#])/i.test(stream.url);
    if (!isHls) {
      container.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.src = stream.url;
      iframe.title = 'مشغل البث';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.style.cssText = 'width:100%;height:100%;border:0;';
      container.appendChild(iframe);
      return;
    }

    container.innerHTML = '';
    const video = document.createElement('video');
    video.id = 'qa-validated-video';
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.cssText = 'width:100%;height:100%;';
    container.appendChild(video);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = stream.url;
      return;
    }

    const Hls = await loadHls();
    if (!Hls || !Hls.isSupported()) throw new Error('HLS playback is not supported');
    hlsInstance = new Hls();
    hlsInstance.loadSource(stream.url);
    hlsInstance.attachMedia(video);
  };

  const renderServerChoices = (streams) => {
    const controls = document.createElement('div');
    controls.className = 'stream-server-choices';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'اختيار سيرفر البث');

    streams.forEach((stream, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stream-server-button';
      button.textContent = `سيرفر ${index + 1}`;
      button.addEventListener('click', async () => {
        controls.querySelectorAll('button').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        try {
          await playStream(stream);
        } catch (error) {
          console.warn('Selected validated stream could not be played.', error);
          button.classList.remove('active');
        }
      });
      controls.appendChild(button);
    });

    container.parentElement?.insertBefore(controls, container);
    controls.firstElementChild?.click();
  };

  try {
    const response = await fetch(`/api/media-stream?matchId=${encodeURIComponent(matchId)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) return showUnavailable();

    const data = await response.json();
    const streams = Array.isArray(data.streams)
      ? data.streams.filter((stream) => stream && typeof stream.url === 'string').slice(0, 4)
      : [];
    if (!streams.length) return showUnavailable();
    renderServerChoices(streams);
  } catch (error) {
    console.warn('Validated stream lookup unavailable; hiding the unverified fallback player.', error);
    showUnavailable();
  }
})();
