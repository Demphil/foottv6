كورة لايف | koora live منصة رياضية متكاملة لمتابعة مباريات اليوم بث مباشر kora live ، مع تغطية فورية للأحداث، نتائج لحظية، وجداول مواعيد أبرز البطولات العربية والعالمية مع تفاصيل القنوات الناقلة
koralive.football

## Media Integration QA

The optional `qa-media` service is a staging-only quality gate for sources you own or are authorized to test. It does not bypass bot protection, alter security controls, or publish directly to the public site.

1. Run `npm install`.
2. Set `ALLOWED_SOURCE_HOSTS` and `ALLOWED_MEDIA_HOSTS` to comma-separated authorized hostnames.
3. Set `MEDIA_QA_JOBS` as `match-id|https://authorized.example/match` entries separated by commas.
4. Configure Firebase Admin Application Default Credentials and set `GOOGLE_CLOUD_PROJECT`.
5. Keep `DRY_RUN=true` for testing. Run `npm run media:qa:dry-run`.
6. Only after the report passes the minimum threshold, set `DRY_RUN=false`; successful results are still written to the Firestore staging collection `media_qa_staging`, never directly to production.

The scheduler uses `MEDIA_QA_CRON` (default: every 15 minutes). Every candidate must pass the allowlist, ad blacklist, HTTP 200 check, and `#EXTM3U` check for HLS before staging.
