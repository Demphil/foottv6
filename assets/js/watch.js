// assets/js/watch.js

// 1. إعداد الاتصال بقاعدة البيانات (نفس الطريقة المستخدمة في المباريات)
const publicSupabaseConfig = window.__SUPABASE_CONFIG__ || {};
const supabaseClient = window.supabase?.createClient && publicSupabaseConfig.url && publicSupabaseConfig.anonKey
  ? window.supabase.createClient(publicSupabaseConfig.url, publicSupabaseConfig.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

document.addEventListener('DOMContentLoaded', async () => {
    const playerContainer = document.getElementById('player-container');
    const playerLoader = document.getElementById('player-loader');
    
    // إنشاء حاوية لأزرار السيرفرات إذا لم تكن موجودة في HTML
    const serversContainer = document.getElementById('servers-container') || createServersContainer(playerContainer);

    if (!playerContainer || !playerLoader) {
        console.error("العناصر الأساسية للمشغل غير موجودة في HTML!");
        return;
    }

    // 2. قراءة المعرفات من الرابط
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('id'); 
    const matchLink = urlParams.get('matchLink'); // للتوافق مع الروابط القديمة

    let streams = [];

    // 3. جلب الروابط المتعددة من Supabase
    if (matchId && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('media_qa_staging')
                .select('payload')
                .eq('match_id', matchId)
                .single();

            if (data && data.payload && data.payload.streams && data.payload.streams.length > 0) {
                streams = data.payload.streams;
            }
        } catch (err) {
            console.error("خطأ في جلب بيانات البث:", err);
        }
    } 
    // إذا لم يجد في القاعدة، يستخدم الرابط القديم كحل بديل
    else if (matchLink) {
        streams = [{ url: decodeURIComponent(matchLink), type: 'iframe' }];
    }

    if (streams.length === 0) {
        playerContainer.innerHTML = '<p class="error-message" style="color:#fff; text-align:center;">عذراً، البث غير متوفر حالياً أو لم يبدأ بعد.</p>';
        playerLoader.style.display = 'none';
        return;
    }

    // 4. تطبيق تنسيق 16:9 للقضاء على الحواف السوداء
    applyResponsiveCSS(playerContainer);

    // 5. رسم أزرار السيرفرات وتشغيل الأول تلقائياً
    renderServers(streams, playerContainer, playerLoader, serversContainer);
});

// --- الدوال المساعدة ---

function createServersContainer(playerContainer) {
    const div = document.createElement('div');
    div.id = 'servers-container';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.marginBottom = '15px';
    div.style.flexWrap = 'wrap';
    div.style.justifyContent = 'center';
    playerContainer.parentNode.insertBefore(div, playerContainer);
    return div;
}

function applyResponsiveCSS(container) {
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.paddingBottom = '56.25%'; // السر هنا: يحافظ على أبعاد 16:9 الخاصة بالفيديو
    container.style.overflow = 'hidden';
    container.style.backgroundColor = '#000';
    container.style.borderRadius = '12px'; // حواف دائرية أنيقة للمشغل
    container.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
}

function renderServers(streams, playerContainer, playerLoader, serversContainer) {
    serversContainer.innerHTML = '';

    streams.forEach((stream, index) => {
        const btn = document.createElement('button');
        btn.innerText = `سيرفر ${index + 1}`;
        btn.className = 'server-btn';
        // تنسيق مبدئي للأزرار (يمكنك تغييره في ملف CSS لاحقاً)
        btn.style.padding = '10px 20px';
        btn.style.cursor = 'pointer';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.backgroundColor = index === 0 ? '#e50914' : '#222';
        btn.style.color = '#fff';
        btn.style.fontFamily = 'inherit';
        btn.style.fontWeight = 'bold';
        btn.style.transition = 'background 0.3s ease';

        btn.onclick = () => {
            // تلوين الزر النشط
            document.querySelectorAll('.server-btn').forEach(b => b.style.backgroundColor = '#222');
            btn.style.backgroundColor = '#e50914';
            loadPlayer(stream, playerContainer, playerLoader);
        };

        serversContainer.appendChild(btn);
    });

    // تشغيل السيرفر الأول كوضع افتراضي
    loadPlayer(streams[0], playerContainer, playerLoader);
}

function loadPlayer(stream, container, loader) {
    container.innerHTML = ''; // تفريغ المشغل القديم
    loader.style.display = 'block';

    // دعم الروابط المباشرة (m3u8)
    if (stream.url.includes('.m3u8')) {
        const video = document.createElement('video');
        video.controls = true;
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        video.style.width = '100%';
        video.style.height = '100%';
        
        // التحقق من وجود مكتبة HLS (لتشغيل m3u8)
        if (window.Hls && Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(stream.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                loader.style.display = 'none';
                video.play().catch(()=>console.log("Auto-play blocked"));
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) { // لأجهزة أبل
            video.src = stream.url;
            video.addEventListener('loadedmetadata', () => {
                loader.style.display = 'none';
                video.play().catch(()=>console.log("Auto-play blocked"));
            });
        } else {
            container.innerHTML = '<p class="error-message" style="color:#fff; text-align:center;">متصفحك لا يدعم هذا السيرفر.</p>';
            loader.style.display = 'none';
            return;
        }
        container.appendChild(video);
    } 
    // دعم الإطارات (iframes)
    else {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('src', stream.url);
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('allowfullscreen', 'true');
        
        // تم إزالة sandbox لأنه يمنع مشغلات الفيديو من العمل وعرض الشاشة الكاملة
        
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';

        iframe.onload = () => {
            loader.style.display = 'none';
            container.style.visibility = 'visible';
            container.style.opacity = '1';
        };
        
        container.style.visibility = 'hidden';
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.5s ease-in-out';
        
        container.appendChild(iframe);
    }
}