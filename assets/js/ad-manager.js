(function() {
    // --- الإعدادات ---
    const AD_INTERVAL = 10 * 60 * 1000; // 10 دقائق بالمللي ثانية

    // قائمة بجميع أكواد الإعلانات الخاصة بك
    const adScripts = [
        { type: 'script', src: 'https://fpyf8.com/88/tag.min.js', 'data-zone': '176035', async: true, 'data-cfasync': 'false' },
        { type: 'script', src: 'https://fpyf8.com/88/tag.min.js', 'data-zone': '176038', async: true, 'data-cfasync': 'false' },
        { type: 'script', src: '//pl27749993.revenuecpmgate.com/cd/63/af/cd63afe2e01f3ca410d046a3e7e0b784.js', typeAttr: 'text/javascript' },
        { type: 'script', src: '//pl27749999.revenuecpmgate.com/52/78/3c/52783c8a8062307c66371da73d0bae78.js', typeAttr: 'text/javascript' }
        // أضف أي سكريبتات أخرى هنا بنفس الطريقة
    ];

    // --- لا تقم بتعديل أي شيء تحت هذا السطر ---

    // دالة لإنشاء وتحميل سكريبت إعلاني
    function loadAdScript(adInfo) {
        const script = document.createElement('script');
        
        if (adInfo.src) {
            script.src = adInfo.src;
        }
        if (adInfo.typeAttr) {
            script.type = adInfo.typeAttr;
        }
        if (adInfo.async) {
            script.async = true;
        }
        // إضافة أي سمات 'data-' أخرى
        for (const key in adInfo) {
            if (key.startsWith('data-')) {
                script.dataset[key.replace('data-', '')] = adInfo[key];
            }
        }
        
        // إضافة السكريبت إلى نهاية الـ body
        document.body.appendChild(script);
        console.log('Ad script loaded:', adInfo.src || 'Inline script');
    }

    // دالة لتحميل كل الإعلانات
    function loadAllAds() {
        console.log('Loading all ads...');
        adScripts.forEach(loadAdScript);
    }

    // انتظر حتى يتم تحميل الصفحة بالكامل قبل تحميل أي شيء
    window.addEventListener('load', function() {
        // تحميل الإعلانات لأول مرة بعد فترة قصيرة (مثلاً 5 ثوانٍ)
        setTimeout(loadAllAds, 5000); 

        // إعداد مؤقت لتحميل الإعلانات كل 10 دقائق
        setInterval(loadAllAds, AD_INTERVAL);
    });

})();
