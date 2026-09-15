const WATCH_NEWS_FALLBACK_IMAGE = "https://koralive.football/assets/images/default-news.jpg";

const WATCH_NEWS_FEEDS = [
  "https://arabic.rt.com/rss/sport/",
  "https://www.france24.com/ar/%D8%B1%D9%8A%D8%A7%D8%B6%D8%A9/rss",
  "https://www.skynewsarabia.com/web/rss/sport"
];

function truncateText(text, length) {
  const cleaned = String(text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > length ? `${cleaned.slice(0, length)}...` : cleaned;
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

function safeUrl(value, fallback = "") {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
}

function firstImageFromHtml(value) {
  const match = String(value || "").match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : "";
}

function imageFromArticle(article) {
  return safeUrl(
    article.thumbnail ||
    article.enclosure?.link ||
    firstImageFromHtml(article.content) ||
    firstImageFromHtml(article.description),
    WATCH_NEWS_FALLBACK_IMAGE
  );
}

async function fetchFeed(feedUrl) {
  const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  const response = await fetch(endpoint, { next: { revalidate: 20 * 60 } });
  if (!response.ok) return [];
  const payload = await response.json();
  const feedTitle = payload?.feed?.title || "مصدر رياضي";
  return (Array.isArray(payload?.items) ? payload.items : []).map((article) => ({
    ...article,
    source_name: article.source_name || feedTitle
  }));
}

async function loadWatchArticles() {
  try {
    const results = await Promise.allSettled(WATCH_NEWS_FEEDS.map(fetchFeed));
    const seen = new Set();
    return results
      .flatMap((result) => result.status === "fulfilled" ? result.value : [])
      .filter((article) => article?.title && article?.link)
      .filter((article) => {
        const key = safeUrl(article.link) || article.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0))
      .slice(0, 6);
  } catch {
    return [];
  }
}

export default async function WatchNews() {
  const articles = await loadWatchArticles();

  if (!articles.length) return null;

  return (
    <section className="watch-news-section" dir="rtl" aria-label="آخر أخبار كرة القدم">
      <div className="watch-news-header">
        <h2>آخر أخبار كرة القدم</h2>
        <a href="https://koralive.football/news.html" target="_blank" rel="noreferrer">عرض كل الأخبار</a>
      </div>
      <div className="watch-news-grid">
        {articles.map((article, index) => {
          const title = truncateText(article.title, 90) || "خبر كرة قدم";
          const imageUrl = imageFromArticle(article);
          const sourceName = article.source_name || article.source_id || "مصدر رياضي";
          const link = safeUrl(article.link, "https://koralive.football/news.html");
          return (
            <article className="news-card watch-news-card" key={`${link}-${index}`}>
              <a className="news-image-wrapper" href={link} target="_blank" rel="noreferrer" aria-label={title}>
                <span className="news-category-badge">عالمي</span>
                <img
                  src={imageUrl}
                  alt={title}
                  loading="lazy"
                  className={imageUrl === WATCH_NEWS_FALLBACK_IMAGE ? "is-fallback-news-image" : ""}
                />
              </a>
              <div className="news-content">
                <h3 className="news-title">
                  <a href={link} target="_blank" rel="noreferrer">{title}</a>
                </h3>
                <p className="news-summary">{truncateText(article.description || article.content || "", 120)}</p>
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
