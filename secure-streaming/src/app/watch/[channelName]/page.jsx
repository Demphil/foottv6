import SecureVideoPlayer from "../../../components/SecureVideoPlayer";
import WatchNews from "../../../components/WatchNews";
import { buildWatchJsonLd, getWatchSeoDetails, publicWatchIdFor, watchUrl } from "../../../lib/seo";

export async function generateMetadata({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const routeToken = decodeURIComponent(resolvedParams.channelName);
  const matchId = resolvedSearchParams?.matchId || "";
  const seo = await getWatchSeoDetails({ routeToken, matchId });
  const canonical = watchUrl(seo.playerChannelName || routeToken, matchId || seo.matchId);

  return {
    title: {
      absolute: "Koralive.football"
    },
    description: seo.description,
    alternates: {
      canonical
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      type: "video.other",
      locale: "ar_MA"
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1
      }
    }
  };
}

export default async function WatchPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const routeToken = decodeURIComponent(resolvedParams.channelName);
  const abr = resolvedSearchParams?.abr !== "0";
  const matchId = resolvedSearchParams?.matchId || "";
  const seo = await getWatchSeoDetails({ routeToken, matchId });
  const channelName = seo.playerChannelName || routeToken;
  const publicStreamId = publicWatchIdFor({ channelName, matchId: matchId || seo.matchId });
  const jsonLd = buildWatchJsonLd({ seo, channelName, matchId });

  return (
    <main className="watch-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="player-card">
        <SecureVideoPlayer channelName={channelName} matchId={matchId || seo.matchId} publicStreamId={publicStreamId} abr={abr} />
        <WatchNews />
      </section>
    </main>
  );
}
