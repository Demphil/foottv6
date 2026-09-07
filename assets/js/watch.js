// assets/js/watch.js

const publicSupabaseConfig = window.__SUPABASE_CONFIG__ || {};
const supabaseClient = window.supabase?.createClient && publicSupabaseConfig.url && publicSupabaseConfig.anonKey
  ? window.supabase.createClient(publicSupabaseConfig.url, publicSupabaseConfig.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

document.addEventListener('DOMContentLoaded', async () => {
    const playerContainer = document.getElementById('player-container');
    const playerLoader = document.getElementById('player-loader');
    
    const serversContainer = document.getElementById('servers-container') || createServersContainer(playerContainer);

    if (!playerContainer || !playerLoader) {
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('id'); 
    const matchLink = urlParams.get('matchLink'); 

    let streams = [];

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
    else if (matchLink) {
        streams = [{ url: decodeURIComponent(matchLink), type: 'iframe' }];
    }

    if (streams.length === 0) {
        playerContainer.innerHTML = '<p class="error-message" style="color:#fff; text-align:center; padding: 40px;">عذراً، البث غير متوفر حالياً أو لم يبدأ بعد.</p>';
        if(playerLoader) playerLoader.style.display = 'none';
        return;
    }

    // تطبيق التنسيق الأساسي للحاوية
    applyBaseCSS(playerContainer);
    renderServers(streams, playerContainer, playerLoader, serversContainer);
});

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

function applyBaseCSS(container) {
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.backgroundColor = '#000';
    container.style.borderRadius = '12px';
    container.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
    container.style.overflow = 'hidden'; 
}

function renderServers(streams, playerContainer, playerLoader, serversContainer) {
    serversContainer.innerHTML = '';

    streams.forEach((stream, index) => {
        const btn = document.createElement('button');
        btn.innerText = `سيرفر ${index + 1}`;
        btn.className = 'server-btn';
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
            document.querySelectorAll('.server-btn').forEach(b => b.style.backgroundColor = '#222');
            btn.style.backgroundColor = '#e50914';
            loadPlayer(stream, playerContainer, playerLoader);
        };

        serversContainer.appendChild(btn);
    });

    loadPlayer(streams[0], playerContainer, playerLoader);
}

function loadPlayer(stream, container, loader) {
    container.innerHTML = ''; 
    if(loader) {
        loader.style.display = 'block';
        container.appendChild(loader);
    }

    // السر هنا: فرض مقاس 16:9 السينمائي دائماً لجميع الروابط لحل مشكلة القص
    container.style.paddingBottom = '56.25%'; 
    container.style.height = '0';
    container.style.minHeight = '0';

    if (stream.url.includes('.m3u8')) {
        const video = document.createElement('video');
        video.controls = true;
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        video.style.width = '100%';
        video.style.height = '100%';
        
        if (window.Hls && Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(stream.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if(loader) loader.style.display = 'none';
                video.play().catch(()=>console.log("Auto-play blocked"));
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) { 
            video.src = stream.url;
            video.addEventListener('loadedmetadata', () => {
                if(loader) loader.style.display = 'none';
                video.play().catch(()=>console.log("Auto-play blocked"));
            });
        }
        container.appendChild(video);
    } 
    else {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('src', stream.url);
        iframe.setAttribute('frameborder', '0');
        // منع التمرير لكي لا يظهر شريط جانبي مزعج داخل الفيديو
        iframe.setAttribute('scrolling', 'no'); 
        iframe.setAttribute('allowfullscreen', 'true');
        
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';

        iframe.onload = () => {
            if(loader) loader.style.display = 'none';
        };
        
        container.appendChild(iframe);
    }
}