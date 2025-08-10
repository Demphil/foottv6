// assets/js/watch.js

document.addEventListener('DOMContentLoaded', () => {
    // We are switching to a proxy that allows being iframed.
    const PROXY_URL = 'https://proxy.cors.sh/';

    const playerContainer = document.getElementById('player-container');
    const playerLoader = document.getElementById('player-loader');

    if (!playerContainer || !playerLoader) {
        console.error("Essential player elements are missing from the HTML!");
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
    // We construct the URL by adding the decoded match link directly after the proxy URL.
    iframe.setAttribute('src', `${PROXY_URL}${decodeURIComponent(matchLink)}`);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allowfullscreen', 'true');
    // Adding sandbox attribute for better security and to potentially bypass some restrictions
    iframe.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin allow-presentation');


    iframe.onload = () => {
        if (playerLoader) {
            playerLoader.style.display = 'none';
        }
        playerContainer.style.visibility = 'visible';
        playerContainer.style.opacity = '1';
    };
    
    playerContainer.style.visibility = 'hidden';
    playerContainer.style.opacity = '0';
    playerContainer.style.transition = 'opacity 0.5s ease-in-out';
    
    playerContainer.appendChild(iframe);
});
