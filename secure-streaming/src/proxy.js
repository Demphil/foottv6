import { NextResponse } from "next/server";

function originFrom(value) {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function approvedOrigins(request) {
  const requestOrigin = request.nextUrl.origin;
  return new Set([
    requestOrigin,
    process.env.PUBLIC_SITE_ORIGIN || "",
    process.env.NEXT_PUBLIC_BRAND_URL || "",
    process.env.NEXT_PUBLIC_CANONICAL_ORIGIN || "",
    ...(process.env.APPROVED_IFRAME_ORIGINS || "").split(",")
  ]
    .map((item) => String(item || "").trim().replace(/\/$/, ""))
    .filter(Boolean));
}

function canonicalOrigin() {
  return String(process.env.NEXT_PUBLIC_BRAND_URL || process.env.PUBLIC_SITE_ORIGIN || "https://koralive.football").replace(/\/$/, "");
}

function isIpHost(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function applyPublicEmbedHeaders(response) {
  response.headers.set("Content-Security-Policy", "frame-ancestors *;");
  response.headers.delete("X-Frame-Options");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

function applyPrivatePageHeaders(response) {
  response.headers.set("Content-Security-Policy", "frame-ancestors 'self';");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export function proxy(request) {
  const url = request.nextUrl;
  const userAgent = request.headers.get("user-agent") || "";
  const hostName = String(request.headers.get("host") || url.hostname).split(":")[0];
  const refererOrigin = originFrom(request.headers.get("referer"));
  const requestOrigin = originFrom(request.headers.get("origin"));
  const acceptedOrigins = approvedOrigins(request);
  const lowerAgent = userAgent.toLowerCase();
  const response = NextResponse.next();

  if (process.env.FORCE_CANONICAL_WATCH_REDIRECT === "1" && url.pathname.startsWith("/watch/") && isIpHost(hostName) && !request.headers.get("x-koralive-proxied-watch")) {
    const target = new URL(`${url.pathname}${url.search}`, canonicalOrigin());
    return NextResponse.redirect(target, 308);
  }

  const goodBots = ["googlebot", "bingbot", "yandex", "duckduckbot", "slurp"];
  const isGoodBot = goodBots.some((bot) => lowerAgent.includes(bot));

  if (!isGoodBot) {
    const badAgents = ["python", "curl", "wget", "scraper", "headless", "puppeteer", "selenium", "phantomjs", "playwright"];
    if (badAgents.some((bot) => lowerAgent.includes(bot)) || userAgent.length < 10) {
      return new NextResponse("Access Denied - Bot Detected", { status: 403 });
    }
  }

  if (url.pathname.startsWith("/api/")) {
    const suppliedOrigins = [refererOrigin, requestOrigin].filter(Boolean);
    const isAllowed = suppliedOrigins.length === 0 || suppliedOrigins.every((origin) => acceptedOrigins.has(origin.replace(/\/$/, "")));
    if (!isAllowed) {
      return new NextResponse("Forbidden: stream API is locked to approved origins", { status: 403 });
    }
  }

  if (request.nextUrl.pathname.startsWith("/embed/")) {
    return applyPublicEmbedHeaders(response);
  }
  if (request.nextUrl.pathname.startsWith("/watch/")) {
    return applyPrivatePageHeaders(response);
  }
  return response;
}

export const config = {
  matcher: ["/watch/:path*", "/embed/:path*", "/api/:path*"]
};
