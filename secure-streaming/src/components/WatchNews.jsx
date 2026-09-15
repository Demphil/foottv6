const WATCH_NEWS_FALLBACK_IMAGE = "https://koralive.football/assets/images/logo.png";

const fallbackArticles = [
  {
    title: "تابع آخر أخبار كرة القدم قبل وأثناء المباريات",
    description: "ملخصات سريعة حول القنوات، الفرق، وأهم المواجهات الجارية اليوم.",
    source_name: "KoraLive",
    link: "https://koralive.football/news.html",
    image_url: WATCH_NEWS_FALLBACK_IMAGE
  },
  {
    title: "جدول مباريات اليوم والقنوات الناقلة",
    description: "تحديثات مستمرة لمواعيد المباريات والسيرفرات المتاحة قبل انطلاق البث.",
    source_name: "KoraLive",
    link: "https://koralive.football/",
    image_url: WATCH_NEWS_FALLBACK_IMAGE
  },
  {
    title: "اختر جودة المشاهدة المناسبة لاتصالك",
    description: "يمكنك التبديل بين 1080 و720 و360 من شريط السيرفرات أعلى المشغل.",
    source_name: "KoraLive",
    link: "https://koralive.football/",
    image_url: WATCH_NEWS_FALLBACK_IMAGE
  }
];

function truncateText(text, length) {
  if (!text) return "";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function formatDate(dateString) {
  if (!dateString) return "الآن";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "الآن";
  return date.toLocaleDateString("ar-MA-u-nu-latn", {
    day: "numeric",
    month: "short"
  });
}

export default function WatchNews() {
  const articles = fallbackArticles;

  return (
    <section className="watch-news-section" dir="rtl" aria-label="آخر أخبار كرة القدم">
      <div className="watch-news-header">
        <h2>آخر أخبار كرة القدم</h2>
        <a href="https://koralive.football/news.html" target="_blank" rel="noreferrer">عرض كل الأخبار</a>
      </div>
      <div className="watch-news-grid">
        {articles.map((article, index) => {
          const title = article.title || "خبر كرة قدم";
          const imageUrl = article.image_url || WATCH_NEWS_FALLBACK_IMAGE;
          const sourceName = article.source_name || article.source_id || "مصدر رياضي";
          const link = article.link || "https://koralive.football/news.html";
          return (
            <article className="news-card watch-news-card" key={`${title}-${index}`}>
              <div className="news-image-wrapper">
                <span className="news-category-badge">عالمي</span>
                <img
                  src={imageUrl}
                  alt={title}
                  loading="lazy"
                  className={imageUrl === WATCH_NEWS_FALLBACK_IMAGE ? "is-logo-fallback" : ""}
                />
              </div>
              <div className="news-content">
                <h3 className="news-title">
                  <a href={link} target="_blank" rel="noreferrer">{truncateText(title, 82)}</a>
                </h3>
                <p className="news-summary">{truncateText(article.description || article.content || "", 110)}</p>
                <div className="news-meta">
                  <span>{formatDate(article.pubDate)}</span>
                  <span className="news-source">{truncateText(sourceName, 22)}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
