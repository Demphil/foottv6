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
    // 1. إخفاء الحاوية القديمة لتجنب أي تعارض مع ملف watch.css
    if (serversContainer) {
        serversContainer.style.display = 'none';
    }

    // 2. إنشاء حاوية شريط علوي جديدة ومستقلة
    let topBar = document.getElementById('custom-top-bar');
    if (!topBar) {
        topBar = document.createElement('div');
        topBar.id = 'custom-top-bar';
        topBar.style.width = '100%';
        topBar.style.marginBottom = '15px';
        // وضع الشريط مباشرة فوق مشغل الفيديو
        playerContainer.parentNode.insertBefore(topBar, playerContainer);
    }
    topBar.innerHTML = ''; // تنظيف المحتوى القديم

    // 3. إضافة رسالة التوجيه (أعلى الشريط)
    if (streams.length > 1) {
        const noticeMsg = document.createElement('div');
        noticeMsg.style.color = '#ffcc00';
        noticeMsg.style.fontSize = '14px';
        noticeMsg.style.fontWeight = 'bold';
        noticeMsg.style.textAlign = 'center';
        noticeMsg.style.marginBottom = '10px';
        noticeMsg.innerHTML = '⚠️ إذا لم يعمل معك البث أو كان يتقطع، يرجى تجربة السيرفرات الأخرى';
        topBar.appendChild(noticeMsg);
    }

    // 4. إنشاء "الشريط الرئيسي المدمج"
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
    logoImg.style.height = '35px'; // الحجم المثالي
    logoImg.style.width = 'auto';
    logoImg.onerror = function() { this.style.display='none'; };
    logoLink.appendChild(logoImg);

    // ب: حاوية أزرار السيرفرات (وسط)
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.style.display = 'flex';
    buttonsWrapper.style.gap = '10px';
    buttonsWrapper.style.justifyContent = 'center';
    buttonsWrapper.style.flexWrap = 'wrap';
    buttonsWrapper.style.flex = '1'; // لملء المساحة الوسطى

    streams.forEach((stream, index) => {
        const btn = document.createElement('button');
        btn.innerText = `سيرفر ${index + 1}`;
        // استخدمنا كلاس جديد لنهرب من ستايل watch.css القديم!
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
    barContent.appendChild(logoLink);      // يمين
    barContent.appendChild(buttonsWrapper); // وسط
    barContent.appendChild(backBtn);        // يسار

    topBar.appendChild(barContent);

    // تشغيل السيرفر الأول تلقائياً
    loadPlayer(streams[1], playerContainer, playerLoader);
}
function loadPlayer(stream, container, loader) {
    container.innerHTML = ''; 
    if(loader) {
        loader.style.display = 'block';
        container.appendChild(loader);
    }

    // ==========================================
    // فرض الشكل السينمائي العريض 16:9 (مضمونة 100%)
    // ==========================================
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '0';
    container.style.paddingBottom = '56.25%'; /* هذه النسبة تصنع مستطيلاً مثالياً */
    container.style.overflow = 'hidden';
    container.style.backgroundColor = '#000';
    container.style.borderRadius = '12px';
    // ==========================================

    if (stream.url.includes('.m3u8')) {
        const video = document.createElement('video');
        video.controls = true;
        // إجبار الفيديو على ملء المستطيل
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        video.style.width = '100%';
        video.style.height = '100%';
// ... (باقي كود الدالة كما هو بدون تغيير)
        
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
// ==========================================
// جلب الأخبار من NewsData.io (نفس مصدر صفحة الأخبار)
// ==========================================
// ==========================================
// جلب الأخبار من NewsData.io (مع الصور)
// ==========================================
// ==========================================
// جلب الأخبار من NewsData.io (مع الفلترة الشاملة)
// ==========================================
async function loadWatchNews() {
    const newsContainer = document.getElementById('watch-news-container');
    if (!newsContainer) return;

    try {
        const API_KEY = "pub_61602747de664b4e9e96b8b6bf40ed1b";
        const keywords = 'كرة القدم';
        const targetUrl = `https://newsdata.io/api/1/latest?apikey=${API_KEY}&size=4&removeduplicate=1&language=ar&category=sports&q=${encodeURIComponent(keywords)}`;

        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error('فشل الاتصال بمزود الأخبار');

        const result = await response.json();
        const articles = result.results || [];

        if (articles && articles.length > 0) {
            newsContainer.innerHTML = articles.map(article => {
                // الفلتر الذكي: إذا كان العنوان فارغاً أو ينتهي بصيغة صورة، نضع عنواناً بديلاً
                let title = article.title || 'أحدث الأخبار الرياضية';
                if (/\.(jpg|jpeg|png|webp|gif)$/i.test(title)) {
                    title = 'تحديث رياضي جديد'; 
                }

                const articleUrl = article.link || '#';
                const imgUrl = article.image_url || 'assets/images/default-news.jpg';
                
                let dateStr = '';
                if (article.pubDate) {
                    const date = new Date(article.pubDate);
                    dateStr = date.toLocaleDateString('ar-EG-u-nu-latn', { month: 'short', day: 'numeric', year: 'numeric' });
                }

                return `
                    <a href="${articleUrl}" target="_blank" rel="noopener noreferrer" class="watch-news-card" style="display: flex; flex-direction: column; gap: 10px; text-decoration: none;">
                        <img src="${imgUrl}" alt="${title}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px;" loading="lazy" onerror="this.src='assets/images/default-news.jpg'">
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <h4 style="margin: 0; font-size: 14px; line-height: 1.4;">${title}</h4>
                            <span style="font-size: 12px; color: #888;">${dateStr}</span>
                        </div>
                    </a>
                `;
            }).join('');
        } else {
            newsContainer.innerHTML = '<p class="news-empty-msg">لا توجد أخبار حالياً.</p>';
        }
    } catch (err) {
        console.error("خطأ في جلب الأخبار لصفحة المشاهدة:", err);
        newsContainer.innerHTML = '<p class="news-empty-msg">حدث خطأ أثناء تحميل الأخبار.</p>';
    }
}