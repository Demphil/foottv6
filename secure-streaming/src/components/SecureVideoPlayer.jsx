"use client";

import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "@videojs/http-streaming";

const QUALITY_OPTIONS = [
  { id: "1080p", type: "quality", label: "سيرفر 1", sub: "1080 HD", file: "1080p.m3u8" },
  { id: "720p", type: "quality", label: "سيرفر 2", sub: "720 HD", file: "720p.m3u8" },
  { id: "360p", type: "quality", label: "سيرفر 3", sub: "360 SD", file: "360p.m3u8" }
];
const DEFAULT_SERVER_ID = "1080p";
const FALLBACK_SERVER_ORDER = ["1080p", "720p", "360p"];

const DEFAULT_AD_SCRIPTS = [
  { src: "https://al5sm.com/tag.min.js", zone: "11638896" },
  { src: "https://quge5.com/88/tag.min.js", zone: "260051", cfasync: "false" },
  { src: "https://nap5k.com/tag.min.js", zone: "11639220" }
];

function configuredAdScripts() {
  const custom = (process.env.NEXT_PUBLIC_MONETAG_SCRIPT_URLS || "")
    .split(",")
    .map((src) => src.trim())
    .filter(Boolean)
    .map((src) => ({ src }));
  return custom.length ? custom : DEFAULT_AD_SCRIPTS;
}

function buildAbrSrc(channelName, server, token) {
  const selected = server?.file ? server : QUALITY_OPTIONS.find((item) => item.id === server) || QUALITY_OPTIONS[0];
  return `/api/abr/${encodeURIComponent(channelName)}/${selected.file}?token=${encodeURIComponent(token)}`;
}

function buildStreamSrc(channelName, server, token, fallbackUrl = "") {
  const selected = typeof server === "string"
    ? QUALITY_OPTIONS.find((item) => item.id === server)
    : server;
  if (!selected?.file || selected.passthrough) {
    return `/api/stream/${encodeURIComponent(channelName)}?token=${encodeURIComponent(token)}`;
  }
  if (!fallbackUrl && !selected.file) return fallbackUrl;
  return buildAbrSrc(channelName, selected, token);
}

function parentOrigin() {
  if (!document.referrer) return "";
  try {
    return new URL(document.referrer).origin;
  } catch {
    return "";
  }
}

function opaqueWatchId(value) {
  let hash = 0x811c9dc5;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return String(hash).padStart(10, "0");
}

export default function SecureVideoPlayer({ channelName, matchId = "", publicStreamId = "", embed = false, abr = true }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const mpegtsPlayerRef = useRef(null);
  const tokenRef = useRef("");
  const activeChannelRef = useRef(channelName);
  const selectedServerRef = useRef(DEFAULT_SERVER_ID);
  const [selectedServerId, setSelectedServerId] = useState(DEFAULT_SERVER_ID);
  const [languageServers, setLanguageServers] = useState([]);
  const [blocked, setBlocked] = useState("");
  const [adNotice, setAdNotice] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const brandUrl = process.env.NEXT_PUBLIC_BRAND_URL || "https://koralive.football";
  const brandRoot = brandUrl.replace(/\/$/, "");
  const logoSrc = `${brandRoot}/assets/images/logo.png`;

  function fallbackToNextServer() {
    const currentIndex = FALLBACK_SERVER_ORDER.indexOf(selectedServerRef.current);
    const nextServerId = currentIndex >= 0 ? FALLBACK_SERVER_ORDER[currentIndex + 1] : "360p";
    if (nextServerId) {
      selectedServerRef.current = nextServerId;
      setSelectedServerId(nextServerId);
      return true;
    }
    setBlocked("تعذر تشغيل هذا السيرفر الآن. يرجى تحديث البث أو المحاولة لاحقاً.");
    return false;
  }

  function disposeMpegtsPlayer() {
    if (!mpegtsPlayerRef.current) return;
    try {
      mpegtsPlayerRef.current.pause();
      mpegtsPlayerRef.current.unload();
      mpegtsPlayerRef.current.detachMediaElement();
      mpegtsPlayerRef.current.destroy();
    } catch {}
    mpegtsPlayerRef.current = null;
  }

  async function applyPlayerSource({ src, streamType = "hls", autoplay = false }) {
    if (!playerRef.current) return;
    const videoElement = playerRef.current.tech?.(true)?.el?.() || videoRef.current;
    if (streamType === "mpegts") {
      disposeMpegtsPlayer();
      playerRef.current.pause();
      const module = await import("mpegts.js");
      const mpegts = module.default || module;
      if (!videoElement || !mpegts.isSupported()) throw new Error("mpegts unsupported");
      const mpegtsPlayer = mpegts.createPlayer(
        { type: "mpegts", isLive: true, url: src },
        {
          enableWorker: true,
          liveBufferLatencyChasing: true,
          liveBufferLatencyMaxLatency: 8,
          liveBufferLatencyMinRemain: 1,
          lazyLoad: false,
          stashInitialSize: 384 * 1024
        }
      );
      mpegtsPlayerRef.current = mpegtsPlayer;
      mpegtsPlayer.on(mpegts.Events.ERROR, () => fallbackToNextServer());
      mpegtsPlayer.attachMediaElement(videoElement);
      mpegtsPlayer.load();
      if (autoplay) videoElement.play().catch(() => {});
      return;
    }

    disposeMpegtsPlayer();
    playerRef.current.src({ src, type: "application/x-mpegURL" });
    if (autoplay) playerRef.current.play().catch(() => {});
  }

  useEffect(() => {
    if (embed || !brandUrl) return;
    const canonical = new URL(brandUrl);
    const currentHost = window.location.hostname;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(currentHost) && currentHost !== canonical.hostname) {
      window.location.replace(`${canonical.origin}${window.location.pathname}${window.location.search}`);
    }
  }, [brandUrl, embed]);

  useEffect(() => {
    let loaded = 0;
    const scripts = configuredAdScripts().map((item) => {
      const script = document.createElement("script");
      script.src = item.src;
      script.async = true;
      if (item.zone) script.dataset.zone = item.zone;
      if (item.cfasync) script.dataset.cfasync = item.cfasync;
      script.onload = () => { loaded += 1; };
      script.onerror = () => {
        setAdNotice("قد تمنع بعض الإضافات ظهور الإعلانات، لكن البث سيبقى يعمل.");
      };
      document.head.appendChild(script);
      return script;
    });

    const timer = window.setTimeout(() => {
      if (scripts.length && loaded === 0) {
        setAdNotice("إذا لم تظهر الإعلانات لديك فربما توجد إضافة حجب، ويمكنك متابعة البث بشكل عادي.");
      }
    }, 5500);

    return () => {
      window.clearTimeout(timer);
      scripts.forEach((script) => script.remove());
    };
  }, [embed]);

  useEffect(() => {
    let disposed = false;
    async function loadAlternatives() {
      try {
        const query = matchId ? `?matchId=${encodeURIComponent(matchId)}` : "";
        const response = await fetch(`/api/channel-alternatives/${encodeURIComponent(channelName)}${query}`, {
          credentials: "include"
        });
        if (!response.ok) return;
        const data = await response.json();
        const nextServers = (data.alternatives || [])
          .filter((item) => item.language === "fr" || item.language === "en")
          .map((item) => ({
            id: `lang-${item.language}`,
            type: "language",
            label: item.language.toUpperCase(),
            sub: item.language === "fr" ? "Audio FR" : "Audio EN",
            file: "720p.m3u8",
            channelName: item.channelName
          }));
        if (!disposed) setLanguageServers(nextServers);
      } catch {
        if (!disposed) setLanguageServers([]);
      }
    }
    loadAlternatives();
    return () => {
      disposed = true;
    };
  }, [channelName, matchId]);

  useEffect(() => {
    const bait = document.createElement("div");
    bait.className = "adsbox ad-banner ad-unit pub_300x250";
    bait.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;";
    document.body.appendChild(bait);

    const timer = window.setTimeout(() => {
      const style = window.getComputedStyle(bait);
      if (bait.offsetParent === null || style.display === "none" || style.visibility === "hidden") {
        setAdNotice("تم اكتشاف حجب لبعض الإعلانات. البث لن يتوقف، لكن دعم الإعلانات يساعد على استمرار الخدمة.");
      }
      bait.remove();
    }, 1200);

    return () => {
      window.clearTimeout(timer);
      bait.remove();
    };
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => setPromoOpen(true), 2500);
    const every = window.setInterval(() => setPromoOpen(true), 8 * 60 * 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, []);

  useEffect(() => {
    if (!embed || !videoRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      const box = entry.boundingClientRect;
      if (!entry.isIntersecting || box.width < 240 || box.height < 140) {
        setBlocked("تم إيقاف البث لأن إطار المشاهدة غير ظاهر بشكل صحيح.");
      }
    }, { threshold: 0.35 });
    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [embed]);

  useEffect(() => {
    let disposed = false;

    async function issueToken(targetChannelName = channelName) {
      const response = await fetch("/api/stream-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channelName: targetChannelName,
          embed,
          parentOrigin: embed ? parentOrigin() : undefined
        })
      });
      if (!response.ok) throw new Error("token");
      const data = await response.json();
      tokenRef.current = data.token;
      activeChannelRef.current = data.channelName || targetChannelName;
      return data;
    }

    async function boot() {
      const initialServer = QUALITY_OPTIONS.find((item) => item.id === selectedServerRef.current) || QUALITY_OPTIONS[0];
      const data = await issueToken(channelName);
      const resolvedChannelName = data.channelName || activeChannelRef.current || channelName;
      const src = abr ? buildStreamSrc(resolvedChannelName, initialServer, data.token, data.streamUrl) : data.streamUrl;
      if (disposed || !videoRef.current) return;
      setBlocked("");

      playerRef.current = videojs(videoRef.current, {
        controls: true,
        autoplay: false,
        preload: "auto",
        fluid: true,
        liveui: true,
        html5: {
          vhs: {
            overrideNative: true,
            enableLowInitialPlaylist: true,
            handleManifestRedirects: true,
            playlistExclusionDuration: 12
          }
        },
        sources: []
      });

      playerRef.current.on("error", () => {
        fallbackToNextServer();
      });

      await applyPlayerSource({ src, streamType: "hls" });
    }

    boot().catch(() => setBlocked("تعذر تشغيل البث الآمن."));
    return () => {
      disposed = true;
      if (playerRef.current) {
        disposeMpegtsPlayer();
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [channelName, abr]);

  useEffect(() => {
    if (!playerRef.current || !abr) return;
    const allServers = [...QUALITY_OPTIONS, ...languageServers];
    const selected = allServers.find((item) => item.id === selectedServerId) || QUALITY_OPTIONS[0];
    const targetChannelName = selected.channelName || channelName;

    async function switchServer() {
      try {
        setBlocked("");
        const response = await fetch("/api/stream-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            channelName: targetChannelName,
            embed,
            parentOrigin: embed ? parentOrigin() : undefined
          })
        });
        if (!response.ok) throw new Error("token");
        const data = await response.json();
        tokenRef.current = data.token;
        activeChannelRef.current = data.channelName || targetChannelName;
        const wasPaused = playerRef.current.paused();
        await applyPlayerSource({
          src: buildStreamSrc(activeChannelRef.current, selected, data.token, data.streamUrl),
          streamType: "hls",
          autoplay: !wasPaused
        });
      } catch {
        setBlocked("تعذر تشغيل هذا السيرفر الآن.");
      }
    }

    switchServer();
  }, [selectedServerId, languageServers, channelName, embed, abr]);

  useEffect(() => {
    if (blocked && playerRef.current) playerRef.current.pause();
  }, [blocked]);

  useEffect(() => {
    const protectedSelectors = [".korlive-corner-logo", ".brand-watermark"];
    const isHidden = (element) => {
      if (!element) return true;
      const style = window.getComputedStyle(element);
      return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) < 0.15;
    };

    const checkProtection = () => {
      const tampered = protectedSelectors.some((selector) => isHidden(document.querySelector(selector)));
      if (tampered) setBlocked("تم إيقاف البث بسبب تعديل عناصر الحماية داخل المشغل.");
    };

    const observer = new MutationObserver(() => {
      checkProtection();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden"]
    });

    const timer = window.setInterval(checkProtection, 2200);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  async function refreshStream() {
    try {
      setBlocked("");
      const response = await fetch("/api/stream-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channelName: activeChannelRef.current,
          embed,
          parentOrigin: embed ? parentOrigin() : undefined
        })
      });
      const data = await response.json();
      tokenRef.current = data.token;
      activeChannelRef.current = data.channelName || activeChannelRef.current;
      if (playerRef.current) {
        const allServers = [...QUALITY_OPTIONS, ...languageServers];
        const selected = allServers.find((item) => item.id === selectedServerId) || QUALITY_OPTIONS[0];
        await applyPlayerSource({
          src: buildStreamSrc(activeChannelRef.current, selected, data.token, data.streamUrl),
          streamType: "hls",
          autoplay: true
        });
      }
    } catch {
      setBlocked("تعذر تحديث البث الآن.");
    }
  }

  const embedId = publicStreamId || opaqueWatchId(matchId || channelName);
  const embedUrl = `${brandRoot}/embed/${encodeURIComponent(embedId)}`;
  const embedCode = `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" sandbox="allow-scripts allow-same-origin allow-presentation" allow="encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;

  async function copyEmbedCode() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function goHome(event) {
    event.preventDefault();
    window.location.assign(brandUrl);
  }

  function selectServer(event, id) {
    event.preventDefault();
    event.stopPropagation();
    setBlocked("");
    selectedServerRef.current = id;
    setSelectedServerId(id);
  }

  return (
    <div className="secure-player-shell">
      <div className="player-topbar">
        <div className="topbar-actions">
          {!embed ? (
            <button type="button" className="embed-open-btn" onClick={() => setEmbedOpen(true)} aria-label="كود التضمين">
              <span aria-hidden="true">&lt;/&gt;</span>
              <strong>Embed</strong>
            </button>
          ) : null}
          {!embed ? (
            <a className="back-site-btn" href={brandUrl} onClick={goHome}>العودة للموقع</a>
          ) : null}
        </div>
        <div className="quality-tabs" aria-label="اختيار سيرفر المشاهدة">
          {[...QUALITY_OPTIONS, ...languageServers].map((item) => (
            <button
              key={item.id}
              type="button"
              className={selectedServerId === item.id ? "active" : ""}
              onClick={(event) => selectServer(event, item.id)}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <span>{item.label}</span>
              <small>{item.sub}</small>
            </button>
          ))}
        </div>
        <a className="header-logo" href={brandUrl} target="_blank" rel="noreferrer" aria-label="KoraLive football">
          <img src={logoSrc} alt="KoraLive football" />
        </a>
      </div>

      <div data-vjs-player className="secure-video-frame">
        <video ref={videoRef} className="video-js vjs-big-play-centered" playsInline />

        <button type="button" className="player-refresh" onClick={refreshStream} aria-label="تحديث البث">↻</button>

        <div className="korlive-corner-logo" aria-hidden="true">
          <strong>KoraLive</strong>
          <small>.football</small>
        </div>

        <div className="brand-watermark bottom-line">
          <span>مرحبا بك في موقع كورة لايف Koralive.football &gt;</span>
          <b aria-hidden="true">KoraLive.football</b>
        </div>

        {adNotice ? (
          <div className="adblock-modal" role="alert" aria-live="polite">
            <div className="adblock-modal-card">
              <div className="adblock-modal-icon">!</div>
              <h3>مانع الإعلانات مفعّل</h3>
              <p>من فضلك أوقف مانع الإعلانات لهذا الموقع، ثم اضغط تحديث للعودة إلى المشاهدة بشكل عادي.</p>
              <button type="button" onClick={() => window.location.reload()}>
                تحديث الصفحة
              </button>
            </div>
          </div>
        ) : null}

        {promoOpen ? (
          <aside className="promo-pop" aria-label="إعلان">
            <button type="button" className="promo-close" onClick={() => setPromoOpen(false)} aria-label="إغلاق الإعلان">×</button>
            <div className="promo-badge">🏆 بث مباشر بجودة عالية</div>
            <h3>تابع المباريات على KoraLive</h3>
            <p>إذا واجهت تقطيعاً، بدّل السيرفر من الأعلى أو اضغط تحديث البث.</p>
            <a href={brandUrl} target="_blank" rel="noreferrer">زيارة الموقع</a>
          </aside>
        ) : null}

        {blocked ? <div className="player-block-overlay">{blocked}</div> : null}
      </div>

      {embedOpen ? (
        <div className="embed-modal" role="dialog" aria-modal="true" aria-label="كود تضمين المشغل">
          <div className="embed-modal-card">
            <button type="button" className="embed-close" onClick={() => setEmbedOpen(false)} aria-label="إغلاق">×</button>
            <h2>كود تضمين البث</h2>
            <p>انسخ هذا الكود وضعه في أي صفحة تريد عرض المشغل داخلها.</p>
            <textarea readOnly value={embedCode} onFocus={(event) => event.currentTarget.select()} />
            <button type="button" className="copy-embed-btn" onClick={copyEmbedCode}>
              {copied ? "تم النسخ" : "Copy Code"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
