"use client";

import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "@videojs/http-streaming";

const QUALITY_OPTIONS = [
  { id: "1080p", type: "quality", label: "سيرفر 1", sub: "1080 HD", passthrough: true },
  { id: "720p", type: "quality", label: "سيرفر 2", sub: "720 HD", file: "720p.m3u8" },
  { id: "360p", type: "quality", label: "سيرفر 3", sub: "360 SD", file: "360p.m3u8" }
];
const DEFAULT_SERVER_ID = "1080p";
const FALLBACK_SERVER_ORDER = ["1080p", "720p", "360p"];
const AD_NORMAL_INTERVAL_MS = 3 * 60 * 1000;
const AD_FULLSCREEN_INTERVAL_MS = 10 * 60 * 1000;
const AD_SCRIPT_SLOT_MS = 25 * 1000;

const LOGO_LAYOUT_PROFILES = {
  normal: {
    left: 0.835,
    top: 0.083,
    width: 0.135,
    height: 0.04,
    minWidth: 138,
    maxWidth: 180,
    minHeight: 27,
    maxHeight: 34
  },
  desktopFullscreen: {
    fixedToViewport: true,
    left: 0.835,
    top: 0.063,
    width: 0.115,
    height: 0.034,
    minWidth: 198,
    maxWidth: 236,
    minHeight: 30,
    maxHeight: 38
  },
  mobileLandscape: {
    left: 0.8,
    top: 0.078,
    width: 0.16,
    height: 0.045,
    minWidth: 96,
    maxWidth: 160,
    minHeight: 22,
    maxHeight: 32
  },
  mobilePortrait: {
    left: 0.62,
    top: 0.06,
    width: 0.26,
    height: 0.035,
    minWidth: 86,
    maxWidth: 145,
    minHeight: 21,
    maxHeight: 30
  }
};

const SMART_LOGO_SCAN = {
  sampleWidth: 420,
  roiLeft: 0.74,
  roiTop: 0.04,
  roiRight: 0.985,
  roiBottom: 0.17,
  minComponentArea: 10,
  minMergedWidth: 32,
  maxMergedWidth: 96,
  minMergedHeight: 5,
  maxMergedHeight: 24,
  minAspect: 2.4,
  minLeft: 0.76,
  maxTop: 0.145
};
const SMART_LOGO_SCAN_INTERVAL_MS = 1200;
const SMART_LOGO_RESULT_TTL_MS = 5000;
const SMART_LOGO_BLOCKED_RETRY_MS = 15000;
const BROADCASTER_TEMPLATE_MANIFEST = "/api/broadcaster-templates/templates.json";
const BROADCASTER_TEMPLATE_MAX_WIDTH = 86;
const BROADCASTER_TEMPLATE_SCAN_STEP = 3;

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

function streamTypeForServer(server, tokenData = {}) {
  if (server?.file && !server.passthrough) return "hls";
  return tokenData.streamType || "hls";
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createFeatureMask(imageData, width, height) {
  const mask = new Uint8Array(width * height);
  const data = imageData.data;
  const lumaAt = (x, y) => {
    const offset = (y * width + x) * 4;
    return data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
  };

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const luma = r * 0.299 + g * 0.587 + b * 0.114;
      const contrast = Math.max(
        Math.abs(luma - lumaAt(x - 1, y)),
        Math.abs(luma - lumaAt(x + 1, y)),
        Math.abs(luma - lumaAt(x, y - 1)),
        Math.abs(luma - lumaAt(x, y + 1))
      );
      const isGraphicEdge = contrast > 34 && luma > 70;
      const isBroadcastPurple = b > 80 && r > 70 && g < 135 && max - min > 34;
      const isBrightGlyph = luma > 175 && contrast > 18;
      if (isGraphicEdge || isBroadcastPurple || isBrightGlyph) {
        mask[y * width + x] = 1;
      }
    }
  }

  return mask;
}

function matchBroadcasterTemplate(featureMask, sampleWidth, sampleHeight, templates) {
  if (!templates?.length) return null;
  let bestMatch = null;

  templates.forEach((template) => {
    if (!template.activePixels || template.width >= sampleWidth || template.height >= sampleHeight) return;
    const search = template.search || {};
    const left = Math.max(0, Math.floor(sampleWidth * (search.left ?? SMART_LOGO_SCAN.roiLeft)));
    const top = Math.max(0, Math.floor(sampleHeight * (search.top ?? SMART_LOGO_SCAN.roiTop)));
    const right = Math.min(sampleWidth - template.width, Math.floor(sampleWidth * (search.right ?? SMART_LOGO_SCAN.roiRight)));
    const bottom = Math.min(sampleHeight - template.height, Math.floor(sampleHeight * (search.bottom ?? SMART_LOGO_SCAN.roiBottom)));
    if (right <= left || bottom <= top) return;

    for (let y = top; y <= bottom; y += BROADCASTER_TEMPLATE_SCAN_STEP) {
      for (let x = left; x <= right; x += BROADCASTER_TEMPLATE_SCAN_STEP) {
        let hits = 0;
        for (let index = 0; index < template.points.length; index += 1) {
          const point = template.points[index];
          if (featureMask[(y + point.y) * sampleWidth + x + point.x]) hits += 1;
        }
        const score = hits / template.activePixels;
        if (score >= template.threshold && (!bestMatch || score > bestMatch.score)) {
          const cover = template.cover || {};
          const coverLeft = Number(cover.left ?? 0);
          const coverTop = Number(cover.top ?? 0);
          const coverWidth = Number(cover.width ?? 1);
          const coverHeight = Number(cover.height ?? 1);
          bestMatch = {
            left: (x + template.width * coverLeft) / sampleWidth,
            top: (y + template.height * coverTop) / sampleHeight,
            width: (template.width * coverWidth) / sampleWidth,
            height: (template.height * coverHeight) / sampleHeight,
            confidence: score,
            templateId: template.id
          };
        }
      }
    }
  });

  return bestMatch;
}

async function loadBroadcasterTemplates() {
  const response = await fetch(BROADCASTER_TEMPLATE_MANIFEST, { cache: "force-cache" });
  if (!response.ok) return [];
  const manifest = await response.json();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  const templates = await Promise.all((Array.isArray(manifest) ? manifest : []).map((item) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const targetWidth = Math.min(BROADCASTER_TEMPLATE_MAX_WIDTH, image.naturalWidth || BROADCASTER_TEMPLATE_MAX_WIDTH);
      const targetHeight = Math.max(1, Math.round(targetWidth * ((image.naturalHeight || 1) / (image.naturalWidth || targetWidth))));
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.clearRect(0, 0, targetWidth, targetHeight);
      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
      const mask = createFeatureMask(imageData, targetWidth, targetHeight);
      const points = [];
      for (let y = 0; y < targetHeight; y += 1) {
        for (let x = 0; x < targetWidth; x += 1) {
          if (mask[y * targetWidth + x]) points.push({ x, y });
        }
      }
      resolve(points.length ? {
        id: item.id || item.src,
        width: targetWidth,
        height: targetHeight,
        points,
        activePixels: points.length,
        threshold: Number(item.threshold || 0.58),
        search: item.search || null,
        cover: item.cover || null
      } : null);
    };
    image.onerror = () => resolve(null);
    image.decoding = "async";
    image.src = item.src;
  })));

  return templates.filter(Boolean);
}

function detectBroadcasterLogo(video, canvas, templates = []) {
  if (!video || !canvas || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;

  const sampleWidth = SMART_LOGO_SCAN.sampleWidth;
  const sampleHeight = Math.max(1, Math.round(sampleWidth * (video.videoHeight / video.videoWidth)));
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  try {
    context.drawImage(video, 0, 0, sampleWidth, sampleHeight);
  } catch {
    return { blocked: true };
  }

  let image;
  try {
    image = context.getImageData(0, 0, sampleWidth, sampleHeight);
  } catch {
    return { blocked: true };
  }

  const featureMask = createFeatureMask(image, sampleWidth, sampleHeight);
  const templateMatch = matchBroadcasterTemplate(featureMask, sampleWidth, sampleHeight, templates);
  if (templateMatch) return templateMatch;
  if (templates?.length) return null;

  const roi = {
    left: Math.floor(sampleWidth * SMART_LOGO_SCAN.roiLeft),
    top: Math.floor(sampleHeight * SMART_LOGO_SCAN.roiTop),
    right: Math.floor(sampleWidth * SMART_LOGO_SCAN.roiRight),
    bottom: Math.floor(sampleHeight * SMART_LOGO_SCAN.roiBottom)
  };
  const roiWidth = roi.right - roi.left;
  const roiHeight = roi.bottom - roi.top;
  if (roiWidth < 20 || roiHeight < 10) return null;

  const mask = new Uint8Array(roiWidth * roiHeight);
  for (let y = roi.top + 1; y < roi.bottom - 1; y += 1) {
    for (let x = roi.left + 1; x < roi.right - 1; x += 1) {
      if (featureMask[y * sampleWidth + x]) mask[(y - roi.top) * roiWidth + (x - roi.left)] = 1;
    }
  }

  const visited = new Uint8Array(mask.length);
  const components = [];
  const stack = [];

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || visited[index]) continue;
    visited[index] = 1;
    stack.length = 0;
    stack.push(index);
    let minX = roiWidth;
    let minY = roiHeight;
    let maxX = 0;
    let maxY = 0;
    let area = 0;

    while (stack.length) {
      const current = stack.pop();
      const x = current % roiWidth;
      const y = Math.floor(current / roiWidth);
      area += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= roiWidth || ny < 0 || ny >= roiHeight) continue;
          const next = ny * roiWidth + nx;
          if (mask[next] && !visited[next]) {
            visited[next] = 1;
            stack.push(next);
          }
        }
      }
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    if (
      area >= SMART_LOGO_SCAN.minComponentArea &&
      width >= 3 &&
      height >= 2 &&
      width <= roiWidth * 0.9 &&
      height <= roiHeight * 0.75
    ) {
      components.push({
        x: roi.left + minX,
        y: roi.top + minY,
        right: roi.left + maxX + 1,
        bottom: roi.top + maxY + 1,
        width,
        height,
        area
      });
    }
  }

  const rows = [];
  components
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .forEach((component) => {
      const centerY = (component.y + component.bottom) / 2;
      const row = rows.find((item) => {
        const rowCenterY = (item.y + item.bottom) / 2;
        const verticalDistance = Math.abs(centerY - rowCenterY);
        const closeEnough = verticalDistance <= Math.max(item.height, component.height, 8);
        const gap = component.x > item.right ? component.x - item.right : item.x - component.right;
        return closeEnough && gap <= sampleWidth * 0.045;
      });
      if (row) {
        row.x = Math.min(row.x, component.x);
        row.y = Math.min(row.y, component.y);
        row.right = Math.max(row.right, component.right);
        row.bottom = Math.max(row.bottom, component.bottom);
        row.area += component.area;
        row.width = row.right - row.x;
        row.height = row.bottom - row.y;
      } else {
        rows.push({ ...component });
      }
    });

  const candidates = rows
    .map((row) => ({
      ...row,
      aspect: row.width / Math.max(1, row.height),
      rightness: row.right / sampleWidth,
      score: row.area + row.width * 2 + (row.right / sampleWidth) * 120 - row.height * 1.8
    }))
    .filter((row) => (
      row.width >= SMART_LOGO_SCAN.minMergedWidth &&
      row.width <= SMART_LOGO_SCAN.maxMergedWidth &&
      row.height >= SMART_LOGO_SCAN.minMergedHeight &&
      row.height <= SMART_LOGO_SCAN.maxMergedHeight &&
      row.aspect >= SMART_LOGO_SCAN.minAspect &&
      row.x / sampleWidth >= SMART_LOGO_SCAN.minLeft &&
      row.y / sampleHeight <= SMART_LOGO_SCAN.maxTop &&
      row.rightness > 0.7
    ))
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best) return null;

  const padX = Math.max(4, best.width * 0.08);
  const padY = Math.max(2, best.height * 0.28);
  const left = clamp(best.x - padX, 0, sampleWidth);
  const top = clamp(best.y - padY, 0, sampleHeight);
  const right = clamp(best.right + padX, left + 1, sampleWidth);
  const bottom = clamp(best.bottom + padY, top + 1, sampleHeight);

  return {
    left: left / sampleWidth,
    top: top / sampleHeight,
    width: (right - left) / sampleWidth,
    height: (bottom - top) / sampleHeight,
    confidence: best.score
  };
}

export default function SecureVideoPlayer({ channelName, matchId = "", publicStreamId = "", embed = false, abr = true }) {
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const logoScanCanvasRef = useRef(null);
  const logoTrackerRef = useRef({ disabledUntil: 0, lastScanAt: 0, lastLogo: null, lastLogoAt: 0 });
  const broadcasterTemplatesRef = useRef({ loaded: false, templates: [] });
  const playerRef = useRef(null);
  const mpegtsPlayerRef = useRef(null);
  const adScriptsRef = useRef([]);
  const adCleanupTimerRef = useRef(null);
  const tokenRef = useRef("");
  const activeChannelRef = useRef(channelName);
  const selectedServerRef = useRef(DEFAULT_SERVER_ID);
  const activeStreamTypeRef = useRef("hls");
  const liveRefreshRef = useRef(0);
  const progressRef = useRef({ time: 0, at: 0 });
  const [selectedServerId, setSelectedServerId] = useState(DEFAULT_SERVER_ID);
  const [languageServers, setLanguageServers] = useState([]);
  const [blocked, setBlocked] = useState("");
  const [adNotice, setAdNotice] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const [canShowInterruptions, setCanShowInterruptions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  function seekToLiveEdge() {
    const player = playerRef.current;
    if (!player) return;
    try {
      const seekable = player.seekable();
      if (seekable?.length) {
        const liveEdge = seekable.end(seekable.length - 1);
        if (Number.isFinite(liveEdge) && liveEdge > 8 && liveEdge - player.currentTime() > 10) {
          player.currentTime(Math.max(0, liveEdge - 4));
        }
      }
    } catch {}
  }

  function refreshLiveSource(reason = "stalled") {
    const now = Date.now();
    if (now - liveRefreshRef.current < 8000) return;
    liveRefreshRef.current = now;
    console.warn(`[KoraLive] refreshing live stream after ${reason}`);
    refreshStream();
  }

  function cleanupAdScripts() {
    adScriptsRef.current.forEach((script) => script.remove());
    adScriptsRef.current = [];
    if (adCleanupTimerRef.current) {
      window.clearTimeout(adCleanupTimerRef.current);
      adCleanupTimerRef.current = null;
    }
  }

  function runAdSlot() {
    let loaded = 0;
    cleanupAdScripts();
    const scripts = configuredAdScripts().map((item) => {
      const script = document.createElement("script");
      script.src = item.src;
      script.async = true;
      script.dataset.koraliveAdSlot = "true";
      if (item.zone) script.dataset.zone = item.zone;
      if (item.cfasync) script.dataset.cfasync = item.cfasync;
      script.onload = () => { loaded += 1; };
      script.onerror = () => {
        setAdNotice("قد تمنع بعض الإضافات ظهور الإعلانات، لكن البث سيبقى يعمل.");
      };
      document.head.appendChild(script);
      return script;
    });
    adScriptsRef.current = scripts;
    adCleanupTimerRef.current = window.setTimeout(() => {
      if (scripts.length && loaded === 0) {
        setAdNotice("إذا لم تظهر الإعلانات لديك فربما توجد إضافة حجب، ويمكنك متابعة البث بشكل عادي.");
      }
      cleanupAdScripts();
    }, AD_SCRIPT_SLOT_MS);
  }

  function updateVideoLayoutVars() {
    const frame = frameRef.current;
    const video = videoRef.current;
    if (!frame) return;
    const frameWidth = frame.clientWidth || 0;
    const frameHeight = frame.clientHeight || 0;
    const videoWidth = video?.videoWidth || 16;
    const videoHeight = video?.videoHeight || 9;
    if (!frameWidth || !frameHeight || !videoWidth || !videoHeight) return;

    const frameRect = frame.getBoundingClientRect();
    const videoRect = video?.getBoundingClientRect?.();
    const videoBox = videoRect?.width && videoRect?.height
      ? {
          x: videoRect.left - frameRect.left,
          y: videoRect.top - frameRect.top,
          width: videoRect.width,
          height: videoRect.height
        }
      : { x: 0, y: 0, width: frameWidth, height: frameHeight };
    const fitMode = video ? window.getComputedStyle(video).objectFit || "contain" : "contain";
    const frameAspect = videoBox.width / videoBox.height;
    const videoAspect = videoWidth / videoHeight;
    let renderedWidth = videoBox.width;
    let renderedHeight = videoBox.height;
    let insetX = videoBox.x;
    let insetY = videoBox.y;

    if (fitMode !== "fill") {
      const shouldContain = fitMode !== "cover";
      const boxIsWider = frameAspect > videoAspect;
      const sizeByHeight = shouldContain ? boxIsWider : !boxIsWider;
      if (sizeByHeight) {
        renderedHeight = videoBox.height;
        renderedWidth = videoBox.height * videoAspect;
        insetX = videoBox.x + (videoBox.width - renderedWidth) / 2;
      } else {
        renderedWidth = videoBox.width;
        renderedHeight = videoBox.width / videoAspect;
        insetY = videoBox.y + (videoBox.height - renderedHeight) / 2;
      }
    }

    const visibleVideoLeft = Math.max(0, insetX);
    const visibleVideoTop = Math.max(0, insetY);
    const visibleVideoRight = Math.min(frameWidth, insetX + renderedWidth);
    const visibleVideoBottom = Math.min(frameHeight, insetY + renderedHeight);
    const visibleVideoWidth = Math.max(0, visibleVideoRight - visibleVideoLeft);
    const visibleVideoHeight = Math.max(0, visibleVideoBottom - visibleVideoTop);

    frame.style.setProperty("--video-x", `${visibleVideoLeft}px`);
    frame.style.setProperty("--video-y", `${visibleVideoTop}px`);
    frame.style.setProperty("--video-w", `${visibleVideoWidth}px`);
    frame.style.setProperty("--video-h", `${visibleVideoHeight}px`);

    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    const isFrameFullscreen = Boolean(
      fullscreenElement &&
      (fullscreenElement === frame || frame.contains(fullscreenElement) || fullscreenElement.contains(frame))
    );
    const isPlayerFullscreen = Boolean(playerRef.current?.isFullscreen?.());
    const isLandscape = visibleVideoWidth >= visibleVideoHeight;
    const viewportWidth = window.visualViewport?.width || window.innerWidth || frameWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight || frameHeight;
    const isFullscreenLayout = Boolean(
      isFrameFullscreen ||
      isPlayerFullscreen ||
      frame.classList.contains("vjs-fullscreen") ||
      (frameWidth >= viewportWidth * 0.92 && frameHeight >= viewportHeight * 0.82 && frameRect.top <= 24)
    );
    const isPhoneLayout = Math.min(viewportWidth, viewportHeight) <= 720;
    const logoProfileName = isFullscreenLayout && isLandscape && !isPhoneLayout
      ? "desktopFullscreen"
      : isPhoneLayout
      ? (isLandscape ? "mobileLandscape" : "mobilePortrait")
      : "normal";
    const logoProfile = LOGO_LAYOUT_PROFILES[logoProfileName];
    const logoBox = logoProfile.fixedToViewport
      ? {
          left: 0,
          top: 0,
          right: viewportWidth,
          bottom: viewportHeight,
          width: viewportWidth,
          height: viewportHeight
        }
      : {
          left: visibleVideoLeft,
          top: visibleVideoTop,
          right: visibleVideoRight,
          bottom: visibleVideoBottom,
          width: visibleVideoWidth,
          height: visibleVideoHeight
        };
    const tracker = logoTrackerRef.current;
    const now = Date.now();
    if (now >= tracker.disabledUntil && now - tracker.lastScanAt >= SMART_LOGO_SCAN_INTERVAL_MS) {
      if (!logoScanCanvasRef.current) logoScanCanvasRef.current = document.createElement("canvas");
      tracker.lastScanAt = now;
      const detectedLogo = detectBroadcasterLogo(video, logoScanCanvasRef.current, broadcasterTemplatesRef.current.templates);
      if (detectedLogo?.blocked) {
        tracker.disabledUntil = now + SMART_LOGO_BLOCKED_RETRY_MS;
        tracker.lastLogo = null;
        tracker.lastLogoAt = 0;
      } else if (detectedLogo) {
        tracker.lastLogo = detectedLogo;
        tracker.lastLogoAt = now;
      }
    }

    const autoLogo = tracker.lastLogo && now - tracker.lastLogoAt <= SMART_LOGO_RESULT_TTL_MS
      ? tracker.lastLogo
      : null;
    const logoWidth = autoLogo
      ? clamp(logoBox.width * autoLogo.width, logoProfile.minWidth, logoProfile.maxWidth)
      : clamp(logoBox.width * logoProfile.width, logoProfile.minWidth, logoProfile.maxWidth);
    const logoHeight = autoLogo
      ? clamp(logoBox.height * autoLogo.height, logoProfile.minHeight, logoProfile.maxHeight)
      : clamp(logoBox.height * logoProfile.height, logoProfile.minHeight, logoProfile.maxHeight);
    const logoLeft = autoLogo
      ? logoBox.left + logoBox.width * autoLogo.left
      : logoBox.left + logoBox.width * logoProfile.left;
    const logoTop = autoLogo
      ? logoBox.top + logoBox.height * autoLogo.top
      : logoBox.top + logoBox.height * logoProfile.top;
    const boundedLogoLeft = clamp(logoLeft, logoBox.left + 6, logoBox.right - logoWidth - 6);
    const boundedLogoTop = clamp(logoTop, logoBox.top + 6, logoBox.bottom - logoHeight - 6);
    const tickerBottom = Math.min(42, Math.max(18, visibleVideoHeight * 0.055));

    frame.dataset.logoLayoutProfile = logoProfileName;
    frame.dataset.logoTracker = autoLogo ? (autoLogo.templateId ? `template:${autoLogo.templateId}` : "auto") : (now < tracker.disabledUntil ? "blocked" : "fallback");
    frame.style.setProperty("--channel-logo-position", logoProfile.fixedToViewport ? "fixed" : "absolute");
    frame.style.setProperty("--channel-logo-z", logoProfile.fixedToViewport ? "2147483000" : "35");
    frame.style.setProperty("--channel-logo-width", `${logoWidth}px`);
    frame.style.setProperty("--channel-logo-height", `${logoHeight}px`);
    frame.style.setProperty("--channel-logo-left", `${boundedLogoLeft}px`);
    frame.style.setProperty("--channel-logo-top", `${boundedLogoTop}px`);
    frame.style.setProperty("--ticker-bottom", `${frameHeight - visibleVideoBottom + tickerBottom}px`);
  }

  function scheduleVideoLayoutRefresh() {
    [0, 80, 180, 360, 700, 1200].forEach((delay) => {
      window.setTimeout(updateVideoLayoutVars, delay);
    });
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
    activeStreamTypeRef.current = streamType;
    const videoElement = playerRef.current.tech?.(true)?.el?.() || videoRef.current;
    if (streamType === "mpegts") {
      disposeMpegtsPlayer();
      playerRef.current.pause();
      const module = await import("mpegts.js");
      const mpegts = module.default || module;
      if (!videoElement || !mpegts.isSupported()) throw new Error("mpegts unsupported");
      const absoluteSrc = new URL(src, window.location.origin).toString();
      const mpegtsPlayer = mpegts.createPlayer(
        { type: "mse", isLive: true, url: absoluteSrc, cors: true, withCredentials: true },
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
      mpegtsPlayer.on(mpegts.Events.ERROR, (type, detail, info) => {
        console.warn("[KoraLive] MPEG-TS playback error", JSON.stringify({ type, detail, code: info?.code }));
        refreshLiveSource("mpegts-error");
      });
      mpegtsPlayer.attachMediaElement(videoElement);
      mpegtsPlayer.load();
      if (autoplay) mpegtsPlayer.play();
      return;
    }

    disposeMpegtsPlayer();
    progressRef.current = { time: 0, at: Date.now() };
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
    const updateFullscreen = () => {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      setIsFullscreen(Boolean(fullscreenElement));
      scheduleVideoLayoutRefresh();
    };
    document.addEventListener("fullscreenchange", updateFullscreen);
    document.addEventListener("webkitfullscreenchange", updateFullscreen);
    document.addEventListener("mozfullscreenchange", updateFullscreen);
    document.addEventListener("MSFullscreenChange", updateFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);
      document.removeEventListener("webkitfullscreenchange", updateFullscreen);
      document.removeEventListener("mozfullscreenchange", updateFullscreen);
      document.removeEventListener("MSFullscreenChange", updateFullscreen);
    };
  }, []);

  useEffect(() => {
    if (embed) return undefined;
    const intervalMs = isFullscreen ? AD_FULLSCREEN_INTERVAL_MS : AD_NORMAL_INTERVAL_MS;
    const showAdSlot = () => {
      setCanShowInterruptions(true);
      setPromoOpen(true);
      runAdSlot();
    };
    const first = window.setTimeout(showAdSlot, intervalMs);
    const every = window.setInterval(showAdSlot, intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, [embed, isFullscreen]);

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
    return () => {
      cleanupAdScripts();
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    loadBroadcasterTemplates()
      .then((templates) => {
        if (!disposed) broadcasterTemplatesRef.current = { loaded: true, templates };
      })
      .catch(() => {
        if (!disposed) broadcasterTemplatesRef.current = { loaded: true, templates: [] };
      });
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const video = videoRef.current;
    if (!frame) return undefined;
    updateVideoLayoutVars();
    const observer = new ResizeObserver(updateVideoLayoutVars);
    observer.observe(frame);
    video?.addEventListener("loadedmetadata", updateVideoLayoutVars);
    video?.addEventListener("resize", updateVideoLayoutVars);
    window.addEventListener("resize", updateVideoLayoutVars);
    window.addEventListener("orientationchange", updateVideoLayoutVars);
    const timer = window.setInterval(updateVideoLayoutVars, 1500);
    return () => {
      observer.disconnect();
      video?.removeEventListener("loadedmetadata", updateVideoLayoutVars);
      video?.removeEventListener("resize", updateVideoLayoutVars);
      window.removeEventListener("resize", updateVideoLayoutVars);
      window.removeEventListener("orientationchange", updateVideoLayoutVars);
      window.clearInterval(timer);
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
        liveTracker: {
          trackingThreshold: 0,
          liveTolerance: 15
        },
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
        if (activeStreamTypeRef.current === "mpegts") {
          refreshLiveSource("mpegts-video-error");
          return;
        }
        fallbackToNextServer();
      });
      playerRef.current.on("loadedmetadata", seekToLiveEdge);
      playerRef.current.on("timeupdate", () => {
        progressRef.current = { time: playerRef.current.currentTime(), at: Date.now() };
      });
      playerRef.current.on("ended", () => refreshLiveSource("ended-playlist"));
      playerRef.current.on("waiting", () => {
        window.setTimeout(() => {
          const player = playerRef.current;
          if (!player || player.paused()) return;
          const duration = player.duration();
          const progress = progressRef.current;
          const stalledMs = Date.now() - progress.at;
          const nearFiniteEnd = Number.isFinite(duration) && duration > 0 && duration - player.currentTime() < 3;
          if (nearFiniteEnd || stalledMs > 7000) refreshLiveSource("waiting");
        }, 3500);
      });
      playerRef.current.on("stalled", () => {
        window.setTimeout(() => {
          const player = playerRef.current;
          if (!player || player.paused()) return;
          const progress = progressRef.current;
          if (Date.now() - progress.at > 7000) refreshLiveSource("stalled");
        }, 3500);
      });

      await applyPlayerSource({
        src,
        streamType: streamTypeForServer(initialServer, data)
      });
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
          streamType: streamTypeForServer(selected, data),
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
          streamType: streamTypeForServer(selected, data),
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

      <div className="secure-video-frame" ref={frameRef}>
        <div data-vjs-player className="video-js-host">
          <video ref={videoRef} className="video-js vjs-big-play-centered" playsInline />

          <button type="button" className="player-refresh" onClick={refreshStream} aria-label="تحديث البث">↻</button>

          <div className="korlive-corner-logo" aria-hidden="true">
            Koralive.football
          </div>

          <div className="brand-watermark bottom-line">
            <span>مرحبا بك في موقع كورة لايف Koralive.football &gt;</span>
            <b aria-hidden="true">KoraLive.football</b>
          </div>

          {adNotice && canShowInterruptions ? (
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

          {promoOpen && canShowInterruptions ? (
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
