import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const processes = new Map();
const VARIANTS = {
  "1080p": {
    width: 1920,
    height: 1080,
    bitrate: process.env.ABR_1080_BITRATE || "3000k",
    maxrate: process.env.ABR_1080_MAXRATE || "3400k",
    bufsize: process.env.ABR_1080_BUFSIZE || "5000k",
    audio: "128k"
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

export function ensureTranscoder({ channelName, sourceUrl, variant = "720p" }) {
  if (process.env.TRANSCODE_ENABLED !== "true") {
    throw new Error("Transcoding is disabled. Set TRANSCODE_ENABLED=true on a Node server with FFmpeg installed.");
  }
  const variantId = VARIANTS[variant] ? variant : "720p";
  const profile = VARIANTS[variantId];
  const processKey = `${channelName}:${variantId}`;
  if (processes.has(processKey)) return processes.get(processKey);

  const outputDir = hlsOutputDir(channelName);
  fs.mkdirSync(outputDir, { recursive: true });

  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  const args = [
    "-hide_banner",
    "-loglevel", "warning",
    "-reconnect", "1",
    "-reconnect_streamed", "1",
    "-reconnect_delay_max", "5",
    "-i", sourceUrl,
    "-map", "0:v:0",
    "-map", "0:a:0?",
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
    "-f", "hls",
    "-hls_time", process.env.HLS_SEGMENT_TIME || "6",
    "-hls_list_size", process.env.HLS_LIST_SIZE || "10",
    "-hls_flags", "delete_segments+independent_segments",
    "-hls_segment_filename", path.join(outputDir, `${variantId}_%03d.ts`),
    path.join(outputDir, `${variantId}.m3u8`)
  ];

  const child = spawn(/* turbopackIgnore: true */ ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => console.error(`[ffmpeg:${channelName}:${variantId}] ${chunk}`));
  child.on("exit", () => processes.delete(processKey));
  processes.set(processKey, child);
  return child;
}
