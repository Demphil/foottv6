import { headers } from "next/headers";
import SecureVideoPlayer from "../../../components/SecureVideoPlayer";
import { isEmbedRequestAllowed } from "../../../lib/security";

export default async function EmbedPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const requestHeaders = await headers();
  const channelName = decodeURIComponent(resolvedParams.channelName);
  const abr = resolvedSearchParams?.abr !== "0";
  const matchId = resolvedSearchParams?.matchId || "";

  if (!isEmbedRequestAllowed(requestHeaders)) {
    return (
      <main className="embed-page">
        <section className="player-card">
          <div className="player-block-overlay static-lock">
            هذا النطاق غير مصرح له بتضمين مشغل KoraLive.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="embed-page">
      <section className="player-card">
        <div className="alert-box">تنبيه: إذا توقف البث أو واجهت تقطيعاً، يرجى تجربة سيرفر أو جودة أخرى.</div>
        <SecureVideoPlayer channelName={channelName} matchId={matchId} embed abr={abr} />
      </section>
    </main>
  );
}
