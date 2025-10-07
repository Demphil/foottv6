// ad-manager.js

(function() {
    // --- الإعدادات ---
    // قائمة بجميع أكواد الإعلانات الخاصة بك
    const adScripts = [
        { src: 'https://fpyf8.com/88/tag.min.js', 'data-zone': '176038' },
        { src: '//pl27749993.revenuecpmgate.com/cd/63/af/cd63afe2e01f3ca410d046a3e7e0b784.js' },
        { src: '//pl27749999.revenuecpmgate.com/52/78/3c/52783c8a8062307c66371da73d0bae78.js' }
        // أضف أي سكريبتات أخرى هنا
    ];

    // التأخير الأولي قبل بدء أول دورة إعلانية (10 ثوانٍ)
    const initialDelay = 15000;

    // الفاصل الزمني بين تحميل كل إعلان داخل الدورة (5 ثوانٍ)
    const delayBetweenAds = 25000;

    // الفاصل الزمني بعد انتهاء الدورة وقبل بدء دورة جديدة (30 ثانية)
    const delayBetweenCycles = 50000;

    // --- لا تقم بتعديل أي شيء تحت هذا السطر ---

    // دالة لإنشاء وتحميل سكريبت إعلاني واحد
    function createAndLoadScript(adInfo) {
        const script = document.createElement('script');
        script.src = adInfo.src;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');

        // إضافة أي سمات 'data-' أخرى
        for (const key in adInfo) {
            if (key.startsWith('data-')) {
                script.dataset[key.replace('data-', '')] = adInfo[key];
            }
        }
        
        document.body.appendChild(script);
        console.log(`Ad script loaded: ${adInfo.src} with zone ${adInfo['data-zone'] || ''}`);
    }

    // دالة لتحميل السكريبتات بشكل متسلسل
    function loadScriptsSequentially(index = 0) {
        // إذا انتهت دورة الإعلانات
        if (index >= adScripts.length) {
            console.log(`Ad cycle complete. Scheduling next cycle in ${delayBetweenCycles / 1000} seconds.`);
            // جدولة الدورة التالية لتبدأ بعد 30 ثانية
            setTimeout(runAdCycle, delayBetweenCycles);
            return;
        }

        // تحميل الإعلان الحالي
        const adToLoad = adScripts[index];
        createAndLoadScript(adToLoad);

        // جدولة الإعلان التالي في السلسلة بعد 5 ثوانٍ
        console.log(`Scheduling next ad in ${delayBetweenAds / 1000} seconds.`);
        setTimeout(() => loadScriptsSequentially(index + 1), delayBetweenAds);
    }
    
    // الدالة الرئيسية التي تبدأ دورة إعلانية
    function runAdCycle() {
        console.log("Starting new ad loading cycle.");
        loadScriptsSequentially(0);
    }

    // انتظر حتى يتم تحميل الصفحة بالكامل
    window.addEventListener('load', function() {
        console.log(`Page loaded. Waiting ${initialDelay / 1000} seconds before starting the first ad cycle.`);
        // ابدأ الدورة الإعلانية الأولى بعد 10 ثوانٍ
        setTimeout(runAdCycle, initialDelay);
    });

})();

