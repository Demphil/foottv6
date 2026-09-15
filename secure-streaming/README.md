# KoraLive Secure Streaming

This is a Node/Next.js streaming control plane for purchased IPTV links. The original URLs stay server-side in Supabase and are never returned to browser APIs.

## Folder Structure

- `scripts/import-m3u.js` parses the private M3U file and matches entries with `../assets/js/streams.js`.
- `supabase/migrations/001_channels.sql` creates the private `channels` table and audit table.
- `src/app/api/stream-token/route.js` issues short-lived stream tokens.
- `src/app/api/stream/[channelName]/route.js` proxies HLS playlists and media segments with encrypted opaque segment tickets.
- `src/server/transcoder.js` starts FFmpeg ABR transcoding when enabled.
- `src/app/api/abr/[channelName]/[[...path]]/route.js` serves FFmpeg-generated 1080p/720p/360p HLS output.
- `src/app/watch/[channelName]/page.jsx` is the first-party watch page.
- `src/app/embed/[channelName]/page.jsx` is the iframe-friendly embed page with ad/integrity checks.

## Setup

1. Create the Supabase tables with `supabase/migrations/001_channels.sql`.
2. Copy `.env.example` to `.env.local`.
3. Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

4. Import channels:

```bash
npm install
npm run import:m3u:dry
npm run import:m3u
```

5. Run locally:

```bash
npm run dev
```

## Important Deployment Note

Real FFmpeg transcoding cannot run on Cloudflare Pages. Deploy this `secure-streaming` app to a Node server/VPS/container with FFmpeg installed, or keep `TRANSCODE_ENABLED=false` and use the secure HLS proxy only.
