// assets/js/watch.js
document.addEventListener('DOMContentLoaded', () => {
    // استخدم البروكسي الجديد والموثوق الخاص بك!
    const PROXY_URL = 'https://foottv-proxy-1.koora-live.workers.dev/?url=';

    const playerContainer = document.getElementById('player-container');
    const playerLoader = document.getElementById('player-loader');

    if (!playerContainer || !playerLoader) {
        console.error("العناصر الأساسية للمشغل غير موجودة في HTML!");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const matchLink = urlParams.get('matchLink');

    if (!matchLink) {
        playerContainer.innerHTML = '<p class="error-message">رابط المباراة غير صالح أو مفقود.</p>';
        playerLoader.style.display = 'none';
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', `${PROXY_URL}${decodeURIComponent(matchLink)}`);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin allow-presentation');

    iframe.onload = () => {
        if (playerLoader) playerLoader.style.display = 'none';
        playerContainer.style.visibility = 'visible';
        playerContainer.style.opacity = '1';
    };
    
    playerContainer.style.visibility = 'hidden';
    playerContainer.style.opacity = '0';
    playerContainer.style.transition = 'opacity 0.5s ease-in-out';
    
    playerContainer.appendChild(iframe);
});
