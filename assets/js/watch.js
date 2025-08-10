// assets/js/watch.js

document.addEventListener('DOMContentLoaded', () => {
    // A reliable proxy
    const PROXY_URL = 'https://corsproxy.io/?';

    const playerContainer = document.getElementById('player-container');
    const playerLoader = document.getElementById('player-loader');

    // --- Defensive Check ---
    // First, check if the essential elements exist on the page.
    if (!playerContainer || !playerLoader) {
        console.error("Essential player elements are missing from the HTML!");
        return;
    }

    // Get the match link from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const matchLink = urlParams.get('matchLink');

    if (!matchLink) {
        playerContainer.innerHTML = '<p class="error-message">رابط المباراة غير صالح أو مفقود.</p>';
        playerLoader.style.display = 'none';
        return;
    }

    // Create and configure the iframe
    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', `${PROXY_URL}${decodeURIComponent(matchLink)}`);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allowfullscreen', 'true');

    // Hide loader and show iframe only after it has fully loaded
    iframe.onload = () => {
        if (playerLoader) {
            playerLoader.style.display = 'none';
        }
        playerContainer.style.visibility = 'visible';
        playerContainer.style.opacity = '1';
    };
    
    // Hide the container initially to prevent a "flash" of empty space
    playerContainer.style.visibility = 'hidden';
    playerContainer.style.opacity = '0';
    playerContainer.style.transition = 'opacity 0.5s ease-in-out';
    
    playerContainer.appendChild(iframe);
});
