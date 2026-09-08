// assets/js/watch.js

// ==========================================
// 1. نظام حماية الصفحة من الاختطاف (Anti-Hijack)
// ==========================================
let isLegitNavigation = false;

document.addEventListener('click', (e) => {
    if (e.target.closest('a') || e.target.closest('button')) {
        isLegitNavigation = true;
        setTimeout(() => isLegitNavigation = false, 1000);
    }
});

window.addEventListener('beforeunload', (e) => {
    if (!isLegitNavigation) {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
});
// ==========================================

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

    if (!playerContainer || !playerLoader) return;

    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('id'); 
    const matchLink = urlParams.get('matchLink'); 

    let streams = [];

    if (matchId && supabaseClient) {
        try {
            const { data } = await supabaseClient
                .from('media_qa_staging')
                .select('payload')
                .eq('match_id', matchId)
                .single();

            if (data?.payload?.streams?.length > 0) {
                streams = data.payload.streams;
            }
        } catch (err) {
            console.error("خطأ في جلب بيانات البث:", err);
        }
    } else if (matchLink) {
        streams = [{ url: decodeURIComponent(matchLink), type: 'iframe' }];
    }

    if (streams.length === 0) {
        playerContainer.innerHTML = '<p class="error-message" style="color:#fff; text-align:center; padding: 40px;">عذراً، البث غير متوفر حالياً أو لم يبدأ بعد.</p>';
        if(playerLoader) playerLoader.style.display = 'none';
        return;
    }

    applyBaseCSS(playerContainer);
    renderServers(streams, playerContainer, playerLoader, serversContainer);
    
    loadWatchNews(); 
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

    // ==========================================
    // التعديل الجديد: إضافة رسالة التوجيه لتغيير السيرفر
    // ==========================================
    if (streams.length > 1) {
        const noticeMsg = document.createElement('div');
        noticeMsg.style.width = '100%'; // ليأخذ سطراً كاملاً فوق الأزرار
        noticeMsg.style.textAlign = 'center';
        noticeMsg.style.marginBottom = '12px';
        noticeMsg.style.color = '#ffcc00'; // لون أصفر جذاب
        noticeMsg.style.fontSize = '14px';
        noticeMsg.style.fontWeight = 'bold';
        noticeMsg.innerHTML = '⚠️ إذا لم يعمل معك البث أو كان يتقطع، يرجى تجربة السيرفرات الأخرى بالأسفل';
        serversContainer.appendChild(noticeMsg);
    }
    // ==========================================

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

    // ==========================================
    // التعديل 1: جعل المشغل عريضاً سينمائياً (16:9)
    // ==========================================
    container.style.paddingBottom = '0';
    container.style.width = '100%';          // يأخذ العرض بالكامل
    container.style.height = 'auto';         // الارتفاع يتعدل تلقائياً
    container.style.aspectRatio = '16 / 9';  // نسبة سينمائية مثالية تمنع المشغل من أن يكون طويلاً
    container.style.minHeight = '250px';     // للهواتف الصغيرة جداً
    container.style.maxHeight = '80vh';      // لعدم تجاوز الشاشة
    // ==========================================

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

        const clickTrap = document.createElement('div');
        clickTrap.style.position = 'absolute';
        clickTrap.style.top = '0';
        clickTrap.style.left = '0';
        clickTrap.style.width = '100%';
        clickTrap.style.height = '100%';
        clickTrap.style.zIndex = '999'; 
        clickTrap.style.cursor = 'pointer';
        clickTrap.style.backgroundColor = 'rgba(0,0,0,0)'; 

        clickTrap.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            clickTrap.remove();
        }, { once: true }); 

        container.appendChild(clickTrap);
    }
}

// ==========================================
// التعديل 2: جلب الأخبار من جدول 'articles' الصحيح
// ==========================================
// ==========================================
// جلب الأخبار من ملف أو رابط news.api
// ==========================================
async function loadWatchNews() {
    const newsContainer = document.getElementById('watch-news-container');
    if (!newsContainer) return;

    try {
        // الاتصال بملف API الأخبار (إذا كان المسار مختلفاً، قم بتعديل 'news.api' إلى المسار الصحيح مثل '/api/news' أو 'assets/js/news.api')
        const response = await fetch('news.api'); 
        
        if (!response.ok) throw new Error('فشل الاتصال بملف الأخبار');
        
        const data = await response.json();
        
        // استخراج المصفوفة (سواء كانت البيانات مباشرة أو داخل كائن مثل data.articles) وأخذ أحدث 4 مقالات
        const articles = Array.isArray(data) ? data.slice(0, 4) : (data.articles ? data.articles.slice(0, 4) : []);

        if (articles && articles.length > 0) {
            newsContainer.innerHTML = articles.map(article => `
                <a href="/news.html?slug=${article.slug || article.id}" class="watch-news-card">
                    <h4>${article.title}</h4>
                    <span>${article.created_at ? new Date(article.created_at).toLocaleDateString('ar-MA') : ''}</span>
                </a>
            `).join('');
        } else {
            newsContainer.innerHTML = '<p class="news-empty-msg">لا توجد أخبار حالياً. سيتم إضافة الأخبار قريباً.</p>';
        }
    } catch (err) {
        console.error("خطأ في جلب الأخبار لصفحة المشاهدة:", err);
        newsContainer.innerHTML = '<p class="news-empty-msg">حدث خطأ أثناء تحميل الأخبار.</p>';
    }
}
