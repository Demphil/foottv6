# Workflow audit

Removed deploy.yml, sync-iptv.yml and sync-matches.yml. They targeted the old Njalla gateway deployment or duplicated writers to the shared Supabase backend.

Retained publish-site.yml and indexnow.yml. Static publishing runs every four hours, reads the current shared match snapshot and does not restart streaming services.

Kooora ingestion and provider catalog updates remain owned by Oracle's running central schedulers. The current match console serializes manual supplier mutations; no backend migration or DNS change is part of this cleanup.

Both remaining definitions were parsed and job dependencies validated. Production run outcomes must be checked separately from syntax validation.
