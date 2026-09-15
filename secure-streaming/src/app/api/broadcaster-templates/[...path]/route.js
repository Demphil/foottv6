import path from "node:path";
import { readFile } from "node:fs/promises";
import { securityHeaders } from "../../../../lib/security";

const CONTENT_TYPES = {
  ".json": "application/json; charset=utf-8",
  ".png": "image/png"
};

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const parts = Array.isArray(resolvedParams.path) ? resolvedParams.path : [];
  const fileName = parts.join("/");
  const ext = path.extname(fileName).toLowerCase();

  if (!fileName || fileName.includes("..") || !CONTENT_TYPES[ext]) {
    return new Response("Not found.", { status: 404, headers: securityHeaders(request) });
  }

  try {
    const baseDir = path.join(process.cwd(), "public", "assets", "broadcaster-templates");
    const filePath = path.join(baseDir, fileName);
    const relative = path.relative(baseDir, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return new Response("Not found.", { status: 404, headers: securityHeaders(request) });
    }

    const body = await readFile(filePath);
    const headers = new Headers(securityHeaders(request));
    headers.set("Content-Type", CONTENT_TYPES[ext]);
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    return new Response(body, { headers });
  } catch {
    return new Response("Not found.", { status: 404, headers: securityHeaders(request) });
  }
}
