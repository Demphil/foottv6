import fs from "node:fs";
import path from "node:path";
import { getActiveChannelByName } from "../../../../../lib/channelStore";
import { getClientIp, getSessionId, securityHeaders, verifyStreamToken } from "../../../../../lib/security";
import { ensureTranscoder, hlsOutputDir, hlsPlaylistStatus, hlsVariantId, resetTranscoderVariant } from "../../../../../server/transcoder";

const TYPES = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t"
};

function withToken(uri, token) {
  if (!uri || uri.startsWith("#")) return uri;
  const separator = uri.includes("?") ? "&" : "?";
  return uri + separator + "token=" + encodeURIComponent(token);
}

function rewritePlaylist(content, token) {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      return withToken(trimmed, token);
    })
    .join("\n");
}

function outputReady(filePath) {
  if (!fs.existsSync(filePath)) return false;
  if (path.extname(filePath) !== ".m3u8") return true;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return /\.ts(?:\?|$)/m.test(content) || content.includes("#EXT-X-STREAM-INF");
  } catch {
    return false;
  }
}

function liveHeaders(request, extra = {}) {
  return {
    ...securityHeaders(request),
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Pragma": "no-cache",
    "Expires": "0",
    ...extra
  };
}

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const channelName = decodeURIComponent(resolvedParams.channelName);
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";

  try {
    verifyStreamToken({ token, channelName, ip: getClientIp(request), sessionId: getSessionId(request) });
    const channel = await getActiveChannelByName(channelName);
    if (!channel) return new Response("Channel unavailable.", { status: 404, headers: securityHeaders(request) });

    const requested = resolvedParams.path?.length ? resolvedParams.path.join("/") : "master.m3u8";
    const variant = hlsVariantId(requested);
    if (variant === "1080p") {
      const directUrl = new URL(`/api/stream/${encodeURIComponent(channelName)}`, request.url);
      directUrl.searchParams.set("token", token);
      return Response.redirect(directUrl, 307);
    }
    let transcoder = ensureTranscoder({ channelName, sourceUrl: channel.original_url, variant });

    const outputDir = hlsOutputDir(channelName);
    const safeRequested = requested === "master.m3u8" ? `${variant}.m3u8` : requested;
    const filePath = path.resolve(outputDir, safeRequested);
    const ext = path.extname(filePath);
    if (!filePath.startsWith(outputDir)) {
      return new Response("Invalid path.", { status: 400, headers: securityHeaders(request) });
    }

    if (ext === ".m3u8") {
      const status = hlsPlaylistStatus(channelName, variant);
      if (status.exists && status.stale) {
        resetTranscoderVariant(channelName, variant);
        transcoder = ensureTranscoder({ channelName, sourceUrl: channel.original_url, variant });
      }
    }

    const start = Date.now();
    const waitMs = Number(process.env.HLS_READY_WAIT_MS || 30000);
    while (!outputReady(filePath) && Date.now() - start < waitMs) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!outputReady(filePath)) return new Response("Transcode output not ready.", { status: 503, headers: liveHeaders(request) });

    if (ext === ".m3u8") {
      const status = hlsPlaylistStatus(channelName, variant);
      if (!transcoder && !status.fresh) {
        return new Response("Live stream is warming up.", { status: 503, headers: liveHeaders(request, { "Retry-After": "2" }) });
      }
      if (!status.fresh) {
        resetTranscoderVariant(channelName, variant);
        return new Response("Live stream is refreshing.", { status: 503, headers: liveHeaders(request, { "Retry-After": "2" }) });
      }
    }

    const body = ext === ".m3u8"
      ? rewritePlaylist(fs.readFileSync(filePath, "utf8"), token)
      : fs.readFileSync(filePath);

    return new Response(body, {
      headers: {
        ...liveHeaders(request),
        "Content-Type": TYPES[ext] || "application/octet-stream",
        "X-KoraLive-Live": "1"
      }
    });
  } catch {
    return new Response("Unauthorized ABR request.", { status: 401, headers: liveHeaders(request) });
  }
}
