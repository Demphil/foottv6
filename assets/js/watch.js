// assets/js/watch.js

document.addEventListener('DOMContentLoaded', () => {
    // استخدم أحد البروكسيات التي تعمل
    const PROXY_URL = 'https://corsproxy.io/?';

    const playerContainer = document.getElementById('player-container');
    const playerLoader = document.getElementById('player-loader');

    // 1. استخراج رابط المباراة من شريط العنوان
    const urlParams = new URLSearchParams(window.location.search);
    const matchLink = urlParams.get('matchLink');

    if (!matchLink) {
        playerContainer.innerHTML = '<p class="error-message">رابط المباراة غير موجود.</p>';
        playerLoader.style.display = 'none';
        return;
    }

    // 2. إنشاء iFrame
    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', `${PROXY_URL}${decodeURIComponent(matchLink)}`);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allowfullscreen', 'true');

    // 3. إظهار الـ iFrame بعد التحميل وإخفاء شاشة الانتظار
    iframe.onload = () => {
        playerLoader.style.display = 'none';
        playerContainer.style.visibility = 'visible';
    };

    playerContainer.style.visibility = 'hidden';
    playerContainer.appendChild(iframe);
});
