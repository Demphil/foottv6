import SecureVideoPlayer from "../../../components/SecureVideoPlayer";
import WatchNews from "../../../components/WatchNews";

export default async function WatchPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const channelName = decodeURIComponent(resolvedParams.channelName);
  const abr = resolvedSearchParams?.abr !== "0";
  const matchId = resolvedSearchParams?.matchId || "";
  return (
    <main className="watch-page">
      <section className="player-card">
        <h1 className="player-title">كورة لايف | البث المباشر</h1>
        <div className="alert-box">تنبيه: في حال توقف البث، قم بتحديث الصفحة أو جرّب جودة أقل.</div>
        <SecureVideoPlayer channelName={channelName} matchId={matchId} abr={abr} />
        <WatchNews />
      </section>
    </main>
  );
}
