كورة لايف | koora live منصة رياضية متكاملة لمتابعة مباريات اليوم بث مباشر kora live ، مع تغطية فورية للأحداث، نتائج لحظية، وجداول مواعيد أبرز البطولات العربية والعالمية مع تفاصيل القنوات الناقلة
koralive.football

## Media Integration QA

The optional `qa-media` service is a staging-only quality gate for sources you own or are authorized to test. It does not bypass bot protection, alter security controls, or publish directly to the public site.

1. Run `npm install`.
2. Add authorized source hostnames to `qa-media/authorized-sources.json`, or configure the Supabase table `media_qa_authorized_sources` using `qa-media/supabase-schema.sql`.
3. Add source pages to `qa-media/sources.json`. Set `MEDIA_QA_JOBS` as `match-id|source-name|home-team|away-team|channel|2026-09-02T20:00:00Z` entries separated by commas, or use the backward-compatible direct form `match-id|https://authorized.example/match|2026-09-02T20:00:00Z`.

Example `qa-media/sources.json` entry:

```json
{
  "sources": [
    {
      "name": "my-authorized-source",
      "listUrl": "https://authorized.example/matches",
      "allowedHosts": ["authorized.example", "player.authorized.example"],
      "enabled": true
    }
  ]
}
```

Use `allowedHosts` for an authorized external details/player host when clicking a match leads to another domain. The resolver first prefers a team-and-channel match, then falls back to the team names when the channel is not displayed by the source.
4. Set server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` when using Supabase. Never expose the service-role key to the browser.
5. Keep `DRY_RUN=true` for testing. Run `npm run media:qa:dry-run`.
6. Only after the report passes the minimum threshold, set `DRY_RUN=false`; successful results are written to the Supabase staging table `media_qa_staging`, never directly to production.

Cloudflare Pages must define the server-only variables `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` for the `/api/media-stream` Function. Optionally set
`SUPABASE_STAGING_TABLE` and `PUBLIC_SITE_ORIGIN`. Channel links now carry the
match identifier; `assets/js/qa-player.js` reads only `PASSED_STAGING` results
and keeps the existing player URL when no validated result is available.

The scheduler uses `MEDIA_QA_CRON` (default: every minute) and runs jobs during the configured 15-minute lead window. Every candidate must pass the source allowlist, ad blacklist, HTTP 200 check, and `#EXTM3U` check for HLS before staging. Discovered CDN hosts may be ephemeral; they are accepted only when discovered from an authorized source page and still pass all validation checks.

## Manual Channel Links

Add authorized channel or player URLs in `assets/js/manual-stream-links.js`. Use the exact channel label received from the matches source as the object key. These values override the matching aliases in `assets/js/streams.js` while preserving all existing aliases and page routing.
