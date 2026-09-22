فرجة أونلاين | fraja online منصة رياضية لمتابعة مباريات اليوم بث مباشر، مع تغطية فورية للأحداث، نتائج لحظية، وجداول مواعيد أبرز البطولات العربية والعالمية مع تفاصيل القنوات الناقلة.

https://fraja.online

## Static Frontend

This repository is now a GitHub Pages static frontend only. Match data is fetched in the browser from the shared gateway at `https://stream-api.koratv.click/api/matches`, and watch links hand off to the unified player at `https://medic.cymru/`.

There is no site-specific backend, local player, Supabase scraper, or gateway code in this repository.

## SEO Maintenance

Run the SEO updater after changing public pages:

```bash
npm run seo:apply
npm run seo:check
```

The generated static pages keep canonical URLs, Arabic/x-default alternates, sitemap entries, and structured data.
