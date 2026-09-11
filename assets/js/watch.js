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
                // ==========================================
                // 1. فلترة وطرد الروابط غير المرغوب فيها (موقع المباريات)
                // ==========================================
                streams = data.payload.streams.filter(stream => {
                    const streamData = JSON.stringify(stream).toLowerCase();
                    // إذا كان الرابط يحتوي على yallashoot سيتم حذفه من القائمة نهائياً
                    return !streamData.includes('yallashoot'); 
                });
                
                // ==========================================
                // 2. الفرز الشامل للمصادر المتبقية (الأولوية لـ fabor و yassirtv)
                // ==========================================
                streams.sort((a, b) => {
                    const dataA = JSON.stringify(a).toLowerCase();
                    const dataB = JSON.stringify(b).toLowerCase();
                    
                    const isFavA = (dataA.includes('yassirtv') || dataA.includes('fabor')) ? 0 : 1;
                    const isFavB = (dataB.includes('yassirtv') || dataB.includes('fabor')) ? 0 : 1;
                    
                    return isFavB - isFavA; 
                });
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
    if (serversContainer) {
        serversContainer.style.display = 'none';
    }

    let topBar = document.getElementById('custom-top-bar');
    if (!topBar) {
        topBar = document.createElement('div');
        topBar.id = 'custom-top-bar';
        topBar.style.width = '100%';
        topBar.style.marginBottom = '15px';
        playerContainer.parentNode.insertBefore(topBar, playerContainer);
    }
    topBar.innerHTML = ''; 

    // إنشاء "الشريط الرئيسي المدمج" أولاً
    const barContent = document.createElement('div');
    barContent.style.display = 'flex';
    barContent.style.justifyContent = 'space-between';
    barContent.style.alignItems = 'center';
    barContent.style.width = '100%';
    barContent.style.backgroundColor = '#1e1e1e';
    barContent.style.padding = '10px 15px';
    barContent.style.borderRadius = '8px';
    barContent.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
    barContent.style.boxSizing = 'border-box';

    // أ: اللوغو (يمين)
    const logoLink = document.createElement('a');
    logoLink.href = 'index.html';
    logoLink.style.display = 'flex';
    logoLink.style.alignItems = 'center';
    
    const logoImg = document.createElement('img');
    logoImg.src = 'assets/images/logo.png';
    logoImg.alt = 'شعار الموقع';
    logoImg.style.height = '35px'; 
    logoImg.style.width = 'auto';
    logoImg.onerror = function() { this.style.display='none'; };
    logoLink.appendChild(logoImg);

    // ب: حاوية أزرار السيرفرات (وسط)
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.style.display = 'flex';
    buttonsWrapper.style.gap = '10px';
    buttonsWrapper.style.justifyContent = 'center';
    buttonsWrapper.style.flexWrap = 'wrap';
    buttonsWrapper.style.flex = '1'; 

    streams.forEach((stream, index) => {
        const btn = document.createElement('button');
        btn.innerText = `سيرفر ${index + 1}`;
        btn.className = 'custom-srv-btn'; 
        btn.style.padding = '8px 16px';
        btn.style.cursor = 'pointer';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.backgroundColor = index === 0 ? '#e50914' : '#333';
        btn.style.color = '#fff';
        btn.style.fontFamily = 'inherit';
        btn.style.fontWeight = 'bold';
        btn.style.margin = '0';
        btn.style.transition = 'background 0.3s ease';

        btn.onclick = () => {
            document.querySelectorAll('.custom-srv-btn').forEach(b => b.style.backgroundColor = '#333');
            btn.style.backgroundColor = '#e50914';
            loadPlayer(stream, playerContainer, playerLoader);
        };

        buttonsWrapper.appendChild(btn);
    });

    // ج: زر العودة (يسار)
    const backBtn = document.createElement('a');
    backBtn.href = 'index.html';
    backBtn.innerHTML = 'عودة للمباريات &rarr;';
    backBtn.style.display = 'inline-flex';
    backBtn.style.alignItems = 'center';
    backBtn.style.color = '#ffffff';
    backBtn.style.textDecoration = 'none';
    backBtn.style.fontSize = '13px';
    backBtn.style.fontWeight = 'bold';
    backBtn.style.backgroundColor = '#e50914';
    backBtn.style.padding = '8px 12px';
    backBtn.style.borderRadius = '4px';
    backBtn.style.whiteSpace = 'nowrap';
    backBtn.style.transition = 'opacity 0.3s';
    backBtn.onmouseover = () => backBtn.style.opacity = '0.8';
    backBtn.onmouseout = () => backBtn.style.opacity = '1';

    // تجميع العناصر داخل الشريط
    barContent.appendChild(logoLink);      
    barContent.appendChild(buttonsWrapper); 
    barContent.appendChild(backBtn);        

    // 1. إضافة الشريط الأسود ليكون في الأعلى
    topBar.appendChild(barContent);

    // 2. إضافة رسالة التوجيه لتكون تحت الشريط الأسود
    if (streams.length > 1) {
        const noticeMsg = document.createElement('div');
        noticeMsg.style.color = '#ffcc00';
        noticeMsg.style.fontSize = '14px';
        noticeMsg.style.fontWeight = 'bold';
        noticeMsg.style.textAlign = 'center';
        noticeMsg.style.marginTop = '10px'; // أضفنا مسافة من الأعلى ليفصل عن الشريط
        noticeMsg.innerHTML = '⚠️ إذا لم يعمل معك البث أو كان يتقطع، يرجى تجربة السيرفرات الأخرى';
        topBar.appendChild(noticeMsg);
    }

    loadPlayer(streams[0], playerContainer, playerLoader);
}
function loadPlayer(stream, container, loader) {
    container.innerHTML = ''; 
    if(loader) {
        loader.style.display = 'block';
        container.appendChild(loader);
    }

    // ==========================================
    // 🛡️ حماية الصفحة من الانهيار (هذا ما كان يوقف الأخبار)
    // ==========================================
    if (!stream || !stream.url) {
        if(loader) loader.style.display = 'none';
        container.innerHTML = '<p style="color:#ffcc00; text-align:center; padding: 60px; font-weight: bold; font-size: 16px;">عذراً، البث غير متوفر حالياً. يرجى المحاولة لاحقاً.</p>';
        return; // إيقاف دالة المشغل هنا بسلام، والسماح لباقي الصفحة (والأخبار) بالعمل!
    }

    // ==========================================
    // فرض الشكل السينمائي العريض 16:9
    // ==========================================
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '0';
    container.style.paddingBottom = '56.25%'; 
    container.style.overflow = 'hidden';
    container.style.backgroundColor = '#000';
    container.style.borderRadius = '12px';

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
        
        // ==========================================
        // 🛡️ تجاوز حماية الشاشة السوداء (CORS/Referrer)
        // تم مسح حماية الـ Sandbox لتجنب خطأ الحظر
        // ==========================================
        iframe.setAttribute('referrerpolicy', 'no-referrer');
        
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
async function loadWatchNews() {
    const newsContainer = document.getElementById('watch-news-container');
    if (!newsContainer) return;

    // مفتاح كاش جديد خاص بصفحة المشاهدة لكسر أي عناد من المتصفح
    const CACHE_KEY = "koralive_watch_news_v3";
    const CACHE_TIME = 2 * 60 * 60 * 1000; // ساعتين

    try {
        // 1. التحقق من الكاش أولاً
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            const { timestamp, articles } = JSON.parse(cachedData);
            if (Date.now() - timestamp < CACHE_TIME && articles && articles.length > 0) {
                renderWatchNewsCards(articles.slice(0, 4), newsContainer); // عرض 4 أخبار فقط
                return;
            }
        }

        // 2. جلب الأخبار من مصدرين إذا الكاش فارغ أو منتهي
        const url1 = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://arabic.rt.com/rss/sport/')}`;
        const url2 = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://www.skynewsarabia.com/web/rss/sport')}`;

        const [res1, res2] = await Promise.all([
            fetch(url1).catch(() => null),
            fetch(url2).catch(() => null)
        ]);

        const data1 = (res1 && res1.ok) ? await res1.json() : { items: [] };
        const data2 = (res2 && res2.ok) ? await res2.json() : { items: [] };

        let allArticles = [...(data1.items || []), ...(data2.items || [])];

        // ترتيب الأخبار من الأحدث للأقدم
        allArticles.sort((a, b) => {
            const dateA = new Date((a.pubDate || '').replace(/-/g, '/'));
            const dateB = new Date((b.pubDate || '').replace(/-/g, '/'));
            return dateB - dateA;
        });

        if (allArticles.length > 0) {
            // حفظ في الكاش
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                articles: allArticles
            }));
            // عرض 4 أخبار فقط
            renderWatchNewsCards(allArticles.slice(0, 4), newsContainer);
        } else {
            newsContainer.innerHTML = '<p class="news-empty-msg" style="text-align:center; padding: 20px;">لا توجد أخبار حالياً.</p>';
        }

    } catch (err) {
        console.error("خطأ في جلب الأخبار لصفحة المشاهدة:", err);
        newsContainer.innerHTML = '<p class="news-empty-msg" style="text-align:center; padding: 20px;">حدث خطأ أثناء تحميل الأخبار.</p>';
    }
}

// دالة مساعدة لترتيب وعرض الأخبار في صفحة المشاهدة حصراً
function renderWatchNewsCards(articles, container) {
    container.innerHTML = articles.map(article => {
        let title = article.title || 'أحدث الأخبار الرياضية';
        const articleUrl = article.link || '#';
        
        let imgUrl = article.thumbnail || (article.enclosure && article.enclosure.link) || 'assets/images/default-news.jpg';
        
        let dateStr = '';
        if (article.pubDate) {
            const date = new Date(article.pubDate.replace(/-/g, '/'));
            dateStr = date.toLocaleDateString('ar-EG-u-nu-latn', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        // قص العنوان إذا كان طويلاً جداً للحفاظ على تناسق الشبكة
        const shortTitle = title.length > 60 ? title.substring(0, 60) + '...' : title;

        return `
            <a href="${articleUrl}" target="_blank" rel="noopener noreferrer" class="watch-news-card" style="display: flex; flex-direction: column; gap: 10px; text-decoration: none;">
                <img src="${imgUrl}" alt="${title}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px;" loading="lazy" onerror="this.src='assets/images/default-news.jpg'">
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <h4 style="margin: 0; font-size: 14px; line-height: 1.4; color: #fff;">${shortTitle}</h4>
                    <span style="font-size: 12px; color: #888;">${dateStr}</span>
                </div>
            </a>
        `;
    }).join('');
}

// تشغيل الأخبار فور تحميل الصفحة
document.addEventListener('DOMContentLoaded', loadWatchNews);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadWatchNews();
}
