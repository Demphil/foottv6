import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const processes = new Map();
let cleanupTimer = null;
const VARIANTS = {
  "1080p": {
    copy: true
  },
  "720p": {
    width: 1280,
    height: 720,
    bitrate: process.env.ABR_720_BITRATE || "1500k",
    maxrate: process.env.ABR_720_MAXRATE || "1900k",
    bufsize: process.env.ABR_720_BUFSIZE || "2800k",
    audio: "96k"
  },
  "360p": {
    width: 640,
    height: 360,
    bitrate: process.env.ABR_360_BITRATE || "450k",
    maxrate: process.env.ABR_360_MAXRATE || "650k",
    bufsize: process.env.ABR_360_BUFSIZE || "950k",
    audio: "64k"
  }
};

export function hlsOutputDir(channelName) {
  const safeName = channelName.replace(/[^\p{L}\p{N}_-]+/gu, "_");
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.HLS_OUTPUT_DIR || "./runtime/hls", safeName);
}

export function masterPlaylistPath(channelName) {
  return path.join(hlsOutputDir(channelName), "master.m3u8");
}

export function hlsVariantId(value = "") {
  const text = String(value || "");
  const match = text.match(/\b(1080p|720p|360p)\b/i);
  return match ? match[1].toLowerCase() : "720p";
}

function variantPlaylistPath(channelName, variantId) {
  return path.join(hlsOutputDir(channelName), `${variantId}.m3u8`);
}

function readPlaylistStatus(channelName, variantId) {
  const playlistPath = variantPlaylistPath(channelName, variantId);
  try {
    const stat = fs.statSync(playlistPath);
    const content = fs.readFileSync(playlistPath, "utf8");
    const targetMatch = content.match(/#EXT-X-TARGETDURATION:(\d+)/);
    const targetDuration = Math.max(2, Number(targetMatch?.[1] || process.env.HLS_SEGMENT_TIME || 4));
    const maxAgeMs = Number(process.env.HLS_MAX_PLAYLIST_AGE_MS || targetDuration * 4500);
    const mediaSequence = content.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)?.[1] || "";
    const segments = (content.match(/^[^#\s].+\.ts(?:\?.*)?$/gm) || []).length;
    const ageMs = Date.now() - stat.mtimeMs;

    return {
      exists: true,
      fresh: ageMs <= maxAgeMs && segments > 0 && !content.includes("#EXT-X-ENDLIST"),
      stale: ageMs > maxAgeMs || content.includes("#EXT-X-ENDLIST"),
      ageMs,
      maxAgeMs,
      mediaSequence,
      segments,
      hasEndlist: content.includes("#EXT-X-ENDLIST")
    };
  } catch {
    return { exists: false, fresh: false, stale: true, ageMs: Infinity, maxAgeMs: 0, mediaSequence: "", segments: 0, hasEndlist: false };
  }
}

export function hlsPlaylistStatus(channelName, variant = "720p") {
  const variantId = VARIANTS[variant] ? variant : "720p";
  return readPlaylistStatus(channelName, variantId);
}

function stopProcess(key) {
  const entry = processes.get(key);
  if (!entry) return;
  try {
    entry.child.kill("SIGTERM");
  } catch {}
  processes.delete(key);
}

function stopIdleTranscoders() {
  const timeoutMs = Math.max(30000, Number(process.env.TRANSCODER_IDLE_TIMEOUT_MS || 120000));
  const now = Date.now();
  for (const [key, entry] of processes.entries()) {
    if (now - (entry.lastAccessed || entry.startedAt) > timeoutMs) {
      stopProcess(key);
    }
  }
}

function startCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(stopIdleTranscoders, 30000);
  cleanupTimer.unref?.();
}

function staleLock(lockPath) {
  try {
    const stat = fs.statSync(lockPath);
    return Date.now() - stat.mtimeMs > 120000;
  } catch {
    return false;
  }
}

function acquireLock(lockPath) {
  try {
    const fd = fs.openSync(lockPath, "wx");
    fs.closeSync(fd);
    return true;
  } catch {
    if (staleLock(lockPath)) {
      try {
        fs.unlinkSync(lockPath);
      } catch {}
      return acquireLock(lockPath);
    }
    return false;
  }
}

function releaseLock(lockPath) {
  try {
    fs.unlinkSync(lockPath);
  } catch {}
}

function stopCompetingVariants(channelName, variantId) {
  if (process.env.TRANSCODER_SINGLE_VARIANT_PER_CHANNEL !== "1") return;
  for (const [key, entry] of processes.entries()) {
    if (entry.channelName === channelName && entry.variantId !== variantId) {
      stopProcess(key);
    }
  }
}

function hasTranscoderCapacity() {
  const maxProcesses = Math.max(1, Number(process.env.MAX_ACTIVE_TRANSCODERS || 1));
  return processes.size < maxProcesses;
}

function cleanupVariantFiles(outputDir, variantId) {
  try {
    for (const item of fs.readdirSync(outputDir)) {
      if (item === `${variantId}.m3u8` || item.startsWith(`${variantId}_`)) {
        fs.rmSync(path.join(outputDir, item), { force: true });
      }
    }
  } catch {}
}

export function resetTranscoderVariant(channelName, variant = "720p") {
  const variantId = VARIANTS[variant] ? variant : "720p";
  stopProcess(`${channelName}:${variantId}`);
  cleanupVariantFiles(hlsOutputDir(channelName), variantId);
}

export function ensureTranscoder({ channelName, sourceUrl, variant = "720p" }) {
  if (process.env.TRANSCODE_ENABLED !== "true") {
    throw new Error("Transcoding is disabled. Set TRANSCODE_ENABLED=true on a Node server with FFmpeg installed.");
  }
  const variantId = VARIANTS[variant] ? variant : "720p";
  const profile = VARIANTS[variantId];
  const processKey = `${channelName}:${variantId}`;
  startCleanupTimer();
  if (processes.has(processKey)) {
    const entry = processes.get(processKey);
    entry.lastAccessed = Date.now();
    const status = readPlaylistStatus(channelName, variantId);
    if (status.exists && status.stale) {
      console.warn(`[ffmpeg:${channelName}:${variantId}] stale live playlist detected (${Math.round(status.ageMs)}ms); restarting`);
      stopProcess(processKey);
      cleanupVariantFiles(hlsOutputDir(channelName), variantId);
    } else {
      return entry.child;
    }
  }
  stopCompetingVariants(channelName, variantId);
  if (!hasTranscoderCapacity()) {
    console.warn(`[ffmpeg:${channelName}:${variantId}] transcoder capacity reached; keeping active streams alive`);
    return null;
  }

  const outputDir = hlsOutputDir(channelName);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPlaylist = path.join(outputDir, `${variantId}.m3u8`);
  const lockPath = path.join(outputDir, `${variantId}.lock`);
  if (!acquireLock(lockPath)) return null;
  cleanupVariantFiles(outputDir, variantId);

  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  const inputArgs = [
    "-hide_banner",
    "-loglevel", "warning",
    "-fflags", "+genpts+discardcorrupt",
    "-err_detect", "ignore_err",
    "-analyzeduration", process.env.FFMPEG_ANALYZE_DURATION || "3000000",
    "-probesize", process.env.FFMPEG_PROBE_SIZE || "3000000",
    "-reconnect", "1",
    "-reconnect_streamed", "1",
    "-reconnect_at_eof", "1",
    "-reconnect_on_network_error", "1",
    "-reconnect_on_http_error", "4xx,5xx",
    "-reconnect_delay_max", process.env.FFMPEG_RECONNECT_DELAY_MAX || "2",
    "-rw_timeout", process.env.FFMPEG_RW_TIMEOUT || "15000000",
    "-i", sourceUrl,
    "-map", "0:v:0",
    "-map", "0:a:0?"
  ];

  const codecArgs = profile.copy
    ? [
      "-c", "copy",
      "-avoid_negative_ts", "make_zero"
    ]
    : [
    "-vf", `scale=w=${profile.width}:h=${profile.height}:force_original_aspect_ratio=decrease`,
    "-c:v", "libx264",
    "-preset", process.env.FFMPEG_PRESET || "ultrafast",
    "-tune", "zerolatency",
    "-threads", process.env.FFMPEG_THREADS || "1",
    "-g", "72",
    "-keyint_min", "72",
    "-sc_threshold", "0",
    "-c:a", "aac",
    "-ar", "48000",
    "-b:v:0", profile.bitrate,
    "-maxrate:v:0", profile.maxrate,
    "-bufsize:v:0", profile.bufsize,
    "-b:a:0", profile.audio,
    "-max_muxing_queue_size", "1024"
  ];

  const hlsArgs = [
    "-f", "hls",
    "-hls_time", process.env.HLS_SEGMENT_TIME || "4",
    "-hls_list_size", process.env.HLS_LIST_SIZE || "30",
    "-hls_delete_threshold", process.env.HLS_DELETE_THRESHOLD || "30",
    "-hls_start_number_source", "epoch",
    "-hls_flags", "delete_segments+independent_segments+program_date_time+temp_file",
    "-hls_segment_filename", path.join(outputDir, `${variantId}_%03d.ts`),
    outputPlaylist
  ];

  const args = [...inputArgs, ...codecArgs, ...hlsArgs];

  const child = spawn(/* turbopackIgnore: true */ ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => console.error(`[ffmpeg:${channelName}:${variantId}] ${chunk}`));
  child.on("exit", () => {
    processes.delete(processKey);
    releaseLock(lockPath);
  });
  processes.set(processKey, {
    child,
    channelName,
    variantId,
    startedAt: Date.now(),
    lastAccessed: Date.now()
  });
  return child;
}
