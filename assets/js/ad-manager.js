// ad-manager.js

(function() {
    // --- الإعدادات ---
    // قائمة بجميع أكواد الإعلانات الخاصة بك
    const adScripts = [
        { src: 'https://fpyf8.com/88/tag.min.js', 'data-zone': '176035' },
        { src: 'https://fpyf8.com/88/tag.min.js', 'data-zone': '176038' },
        { src: '//pl27749993.revenuecpmgate.com/cd/63/af/cd63afe2e01f3ca410d046a3e7e0b784.js' },
        { src: '//pl27749999.revenuecpmgate.com/52/78/3c/52783c8a8062307c66371da73d0bae78.js' }
        // أضف أي سكريبتات أخرى هنا
    ];

    // الفاصل الزمني بين تحميل كل إعلان (بالمللي ثانية)
    // 15 ثانية = 15000
    const delayBetweenAds = 15000; 

    // --- لا تقم بتعديل أي شيء تحت هذا السطر ---

    // دالة لإنشاء وتحميل سكريبت إعلاني واحد
    function createAndLoadScript(adInfo) {
        // التحقق من عدم وجود السكريبت من قبل لتجنب التكرار
        if (document.querySelector(`script[src="${adInfo.src}"][data-zone="${adInfo['data-zone']}"]`)) {
            console.log('Ad script already loaded, skipping:', adInfo.src);
            return;
        }

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
        console.log('Ad script dynamically loaded:', adInfo.src);
    }

    // دالة لبدء التحميل المتدرج للإعلانات
    function startStaggeredLoading() {
        console.log('Starting staggered ad loading...');
        adScripts.forEach((ad, index) => {
            setTimeout(() => {
                createAndLoadScript(ad);
            }, index * delayBetweenAds); // التأخير يزداد مع كل إعلان
        });
    }

    // انتظر حتى يتم تحميل الصفحة بالكامل قبل بدء أي شيء
    window.addEventListener('load', startStaggeredLoading);

})();
