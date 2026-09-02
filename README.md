كورة لايف | koora live منصة رياضية متكاملة لمتابعة مباريات اليوم بث مباشر kora live ، مع تغطية فورية للأحداث، نتائج لحظية، وجداول مواعيد أبرز البطولات العربية والعالمية مع تفاصيل القنوات الناقلة
koralive.football

## Media Integration QA

The optional `qa-media` service is a staging-only quality gate for sources you own or are authorized to test. It does not bypass bot protection, alter security controls, or publish directly to the public site.

1. Run `npm install`.
2. Add authorized source hostnames to `qa-media/authorized-sources.json`, or configure the Supabase table `media_qa_authorized_sources` using `qa-media/supabase-schema.sql`.
3. Set `MEDIA_QA_JOBS` as dynamic `match-id|https://authorized.example/match|2026-09-02T20:00:00Z` entries separated by commas. The schedule field is optional for an immediate QA run.
4. Set server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` when using Supabase. Never expose the service-role key to the browser.
5. Keep `DRY_RUN=true` for testing. Run `npm run media:qa:dry-run`.
6. Only after the report passes the minimum threshold, set `DRY_RUN=false`; successful results are written to the Supabase staging table `media_qa_staging`, never directly to production.

The scheduler uses `MEDIA_QA_CRON` (default: every minute) and runs jobs during the configured 15-minute lead window. Every candidate must pass the source allowlist, ad blacklist, HTTP 200 check, and `#EXTM3U` check for HLS before staging. Discovered CDN hosts may be ephemeral; they are accepted only when discovered from an authorized source page and still pass all validation checks.
