// Replace a channel page's fallback player only with a validated staging stream.
(async function loadValidatedStream() {
  const params = new URLSearchParams(window.location.search);
  const matchId = params.get('matchId');
  if (!matchId) return;

  try {
    const response = await fetch(`/api/media-stream?matchId=${encodeURIComponent(matchId)}`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return;
    const data = await response.json();
    const stream = data.streams?.[0];
    if (!stream?.url) return;

    const iframe = document.querySelector('#player-container iframe, .iframe-container iframe, body > iframe');
    if (stream.type === 'hls' || /\.m3u8(?:$|[?#])/i.test(stream.url)) {
      const container = document.querySelector('#player-container, .iframe-container');
      if (!container) return;
      container.innerHTML = '<video id="qa-validated-video" controls autoplay playsinline></video>';
      const video = container.querySelector('video');
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = stream.url;
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
      script.onload = () => {
        if (!window.Hls || !window.Hls.isSupported()) return;
        const hls = new window.Hls();
        hls.loadSource(stream.url);
        hls.attachMedia(video);
      };
      document.head.appendChild(script);
      return;
    }
    if (iframe) iframe.src = stream.url;
  } catch (error) {
    console.warn('Validated stream lookup unavailable; keeping fallback player.', error);
  }
})();
