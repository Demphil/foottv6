// بيانات الأخبار (يمكن استبدالها بطلبات API فعلية)
const newsData = {
    breaking: [
        {
            id: 1,
            title: "ميسي يتعرض لإصابة قد تبعده عن الملاعب لمدة شهر",
            excerpt: "تعرض النجم الأرجنتيني ليونيل ميسي لإصابة في العضلة الخلفية خلال مباراة باريس سان جيرمان الأخيرة.",
            image: "https://via.placeholder.com/400x220?text=ميسي+إصابة",
            category: "injuries",
            date: "منذ ساعتين",
            views: "12.5K",
            tag: "عاجل"
        },
        {
            id: 2,
            title: "ريال مدريد يعلن عن تعاقده مع نجم جديد بقيمة قياسية",
            excerpt: "أعلن نادي ريال مدريد الإسباني اليوم عن تعاقده مع النجم الفرنسي كيليان مبابي لمدة 5 مواسم.",
            image: "https://via.placeholder.com/400x220?text=mbappe+transfer",
            category: "transfers",
            date: "منذ 5 ساعات",
            views: "24.3K",
            tag: "حصري"
        },
        {
            id: 3,
            title: "الاتحاد الدولي يعلن عن تغييرات جديدة في قوانين اللعبة",
            excerpt: "أعلن الاتحاد الدولي لكرة القدم عن سلسلة من التغييرات في قوانين اللعبة ستدخل حيز التنفيذ الموسم القادم.",
            image: "https://via.placeholder.com/400x220?text=FIFA+قوانين",
            category: "analysis",
            date: "منذ 8 ساعات",
            views: "8.7K",
            tag: "هام"
        }
    ],
    main: [
        {
            id: 4,
            title: "تحليل: كيف سيؤثر رحيل رونالدو على مستقبل مانشستر يونايتد؟",
            excerpt: "نحلل في هذا التقرير الآثار المحتملة لرحيل البرتغالي كريستيانو رونالدو عن مانشستر يونايتد.",
            image: "https://via.placeholder.com/300x180?text=رونالدو+مانشستر",
            category: "analysis",
            date: "منذ يومين",
            views: "15.2K"
        },
        {
            id: 5,
            title: "إصابة جديدة تضرب صفوف برشلونة قبل كلاسيكو الأرض",
            excerpt: "تعرض لاعب خط وسط برشلونة لإصابة في التدريبات تهدد بمشاركته في مباراة الكلاسيكو القادمة.",
            image: "https://via.placeholder.com/300x180?text=برشلونة+إصابة",
            category: "injuries",
            date: "منذ يوم",
            views: "9.8K"
        },
        {
            id: 6,
            title: "رسمياً: نجم ليفربول يوقع لنادي سعودي",
            excerpt: "أعلن نادي الاتحاد السعودي عن تعاقده مع لاعب خط وسط ليفربول البرازيلي فابينيو.",
            image: "https://via.placeholder.com/300x180?text=Fabinho+transfer",
            category: "transfers",
            date: "منذ 3 أيام",
            views: "18.6K"
        },
        {
            id: 7,
            title: "مدرب آرسنال: لدينا خطة خاصة لمواجهة مانشستر سيتي",
            excerpt: "صرح مدرب آرسنال ميكيل أرتيتا بأن فريقه أعد خطة خاصة لمواجهة مانشستر سيتي في الجولة المقبلة.",
            image: "https://via.placeholder.com/300x180?text=آرسنال+مانشستر",
            category: "interviews",
            date: "منذ 4 أيام",
            views: "7.3K"
        },
        {
            id: 8,
            title: "تقرير: الأندية الإنجليزية تهيمن على قائمة أغلى التشكيلات",
            excerpt: "تصدرت الأندية الإنجليزية قائمة أغلى تشكيلات في العالم وفقاً لأحدث التقارير المالية.",
            image: "https://via.placeholder.com/300x180?text=أغلى+تشكيلات",
            category: "analysis",
            date: "منذ 5 أيام",
            views: "11.4K"
        },
        {
            id: 9,
            title: "لاعب مصري شاب يوقع لأحد الأندية الأوروبية الكبرى",
            excerpt: "أعلن نادي روما الإيطالي عن تعاقده مع اللاعب المصري الشاب أحمد حجازي لمدة 4 مواسم.",
            image: "https://via.placeholder.com/300x180?text=مصري+روما",
            category: "transfers",
            date: "منذ أسبوع",
            views: "22.1K"
        }
    ],
    videos: [
        {
            id: 10,
            title: "أهداف مباراة برشلونة وريال مدريد في الكلاسيكو",
            thumbnail: "https://via.placeholder.com/300x180?text=كلاسيكو+أهداف",
            duration: "3:45",
            views: "1.2M",
            date: "منذ يومين"
        },
        {
            id: 11,
            title: "مقابلة حصرية مع هداف الدوري الإنجليزي",
            thumbnail: "https://via.placeholder.com/300x180?text=مقابلة+هداف",
            duration: "8:12",
            views: "856K",
            date: "منذ 3 أيام"
        },
        {
            id: 12,
            title: "أفضل لحظات كأس العالم 2022",
            thumbnail: "https://via.placeholder.com/300x180?text=كأس+العالم",
            duration: "12:30",
            views: "3.5M",
            date: "منذ أسبوع"
        }
    ],
    featuredArticles: [
        {
            id: 13,
            title: "كيف غير بيب جوارديولا مفهوم كرة القدم الحديثة؟",
            excerpt: "في هذا المقال التحليلي، نستعرض تأثير المدرب الإسباني بيب جوارديولا على تطور كرة القدم الحديثة والأساليب التكتيكية التي أدخلها.",
            author: "محمد التحليلي",
            avatar: "https://via.placeholder.com/40x40?text=محمد",
            date: "منذ أسبوع",
            views: "45.2K"
        },
        {
            id: 14,
            title: "الانتقالات الصيفية: الأفضل والأسوأ في أوروبا",
            excerpt: "تقييم شامل لأفضل وأسوأ الصفقات في سوق الانتقالات الصيفية الحالية بين الأندية الأوروبية الكبرى.",
            author: "أحمد الناقد",
            avatar: "https://via.placeholder.com/40x40?text=أحمد",
            date: "منذ 10 أيام",
            views: "32.7K"
        },
        {
            id: 15,
            title: "مستقبل كرة القدم العربية في ظل الاستثمارات الأخيرة",
            excerpt: "تحليل لمستقبل الكرة العربية في ضوء الاستثمارات الكبيرة التي تشهدها المنطقة وفرص تطوير اللعبة محلياً.",
            author: "علي الخبير",
            avatar: "https://via.placeholder.com/40x40?text=علي",
            date: "منذ أسبوعين",
            views: "28.9K"
        }
    ]
};

// عناصر DOM
const breakingNewsContainer = document.getElementById('breaking-news');
const mainNewsContainer = document.getElementById('main-news');
const videosContainer = document.getElementById('news-videos');
const featuredArticlesContainer = document.getElementById('featured-articles');
const categoryButtons = document.querySelectorAll('.category-btn');

// إنشاء بطاقة خبر عاجل
const createBreakingNewsCard = (news) => {
    return `
        <div class="breaking-news-card" onclick="window.location.href='news-details.html?id=${news.id}'">
            <img src="${news.image}" alt="${news.title}" onerror="this.src='assets/images/default-news.jpg'">
            <div class="breaking-news-content">
                <span class="breaking-news-tag">${news.tag}</span>
                <h3 class="breaking-news-title">${news.title}</h3>
                <p class="breaking-news-excerpt">${news.excerpt}</p>
                <div class="breaking-news-meta">
                    <span>📅 ${news.date}</span>
                    <span>👁️ ${news.views} مشاهدة</span>
                </div>
            </div>
        </div>
    `;
};

// إنشاء بطاقة خبر عادي
const createNewsCard = (news) => {
    return `
        <div class="news-card" onclick="window.location.href='news-details.html?id=${news.id}'">
            <img src="${news.image}" alt="${news.title}" onerror="this.src='assets/images/default-news.jpg'">
            <div class="news-content">
                <span class="news-category">${getCategoryName(news.category)}</span>
                <h3 class="news-title">${news.title}</h3>
                <p class="news-excerpt">${news.excerpt}</p>
                <div class="news-meta">
                    <span>📅 ${news.date}</span>
                    <span>👁️ ${news.views} مشاهدة</span>
                </div>
            </div>
        </div>
    `;
};

// إنشاء بطاقة فيديو
const createVideoCard = (video) => {
    return `
        <div class="video-card" onclick="window.location.href='video.html?id=${video.id}'">
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}" onerror="this.src='assets/images/default-video.jpg'">
                <div class="play-icon">▶</div>
                <span class="video-duration">${video.duration}</span>
            </div>
            <div class="video-content">
                <h3 class="video-title">${video.title}</h3>
                <div class="video-views">
                    <span>👁️ ${video.views}</span>
                    <span>•</span>
                    <span>📅 ${video.date}</span>
                </div>
            </div>
        </div>
    `;
};

// إنشاء بطاقة مقال مميز
const createFeaturedArticle = (article) => {
    return `
        <div class="featured-article" onclick="window.location.href='article.html?id=${article.id}'">
            <div class="article-author">
                <img src="${article.avatar}" alt="${article.author}" class="author-avatar" onerror="this.src='assets/images/default-avatar.png'">
                <div>
                    <div class="author-name">${article.author}</div>
                    <div class="article-date">${article.date}</div>
                </div>
            </div>
            <h3 class="article-title">${article.title}</h3>
            <p class="article-excerpt">${article.excerpt}</p>
            <a href="#" class="read-more">قراءة المزيد <i class="fas fa-arrow-left"></i></a>
        </div>
    `;
};

// الحصول على اسم التصنيف
const getCategoryName = (category) => {
    const categories = {
        'transfers': 'انتقالات',
        'injuries': 'إصابات',
        'analysis': 'تحليلات',
        'interviews': 'مقابلات'
    };
    return categories[category] || 'أخبار';
};

// تصفية الأخبار حسب التصنيف
const filterNewsByCategory = (category) => {
    if (category === 'all') {
        return newsData.main;
    }
    return newsData.main.filter(news => news.category === category);
};

// عرض الأخبار العاجلة
const renderBreakingNews = () => {
    breakingNewsContainer.innerHTML = newsData.breaking.map(createBreakingNewsCard).join('');
};

// عرض الأخبار الرئيسية
const renderMainNews = (category = 'all') => {
    const filteredNews = filterNewsByCategory(category);
    mainNewsContainer.innerHTML = filteredNews.map(createNewsCard).join('');
};

// عرض الفيديوهات
const renderVideos = () => {
    videosContainer.innerHTML = newsData.videos.map(createVideoCard).join('');
};

// عرض المقالات المميزة
const renderFeaturedArticles = () => {
    featuredArticlesContainer.innerHTML = newsData.featuredArticles.map(createFeaturedArticle).join('');
};

// تبديل التصنيفات
categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const category = button.getAttribute('data-category');
        renderMainNews(category);
    });
});

// تهيئة الصفحة
const initPage = () => {
    renderBreakingNews();
    renderMainNews();
    renderVideos();
    renderFeaturedArticles();
};

// بدء التحميل
document.addEventListener('DOMContentLoaded', initPage);
