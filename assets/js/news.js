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
            views: "7.3K
