# اختيار مباريات البث يدوياً

عدّل `manual-match-selection.json` في جذر هذا المشروع:

```json
{
  "enabled": true,
  "date": "2026-10-03",
  "matches": [
    "kooora_2026-10-03_اسبانيا_vs_تشيكيا"
  ]
}
```

ضع معرفات المباريات الكاملة بالترتيب الذي تريده، ثم ارفع الملف لفرع `main`.
الخلفية مشتركة مع `koratv-web`: الحد هو 8 مباريات للمشروعين معاً. لا يوجد
توزيع ثمانية إضافي لهذا الموقع. التكرار يُحسب مرة واحدة، وإذا كان الملفان
مفعّلين تُدمج اختيارات `koratv-web` أولاً ثم اختيارات هذا الملف.

لتطبيق الاختيار فوراً، شغّل `scripts/apply-manual-matches.ps1`، أو افتح
[Apply Manual Match Selection](https://github.com/Demphil/koratv-web/actions/workflows/manual-matches.yml)
واضغط `Run workflow`. وإلا يقرأ التحديث المشترك الملف كل 4 ساعات.

المعرفات الحالية متاحة عبر:

```powershell
(Invoke-RestMethod 'https://stream-api.koratv.click/api/matches?day=today' -Headers @{Origin='https://fraja.online'}).matches |
  Select-Object matchId, homeTeam, awayTeam, scheduledAt, channelName |
  ConvertTo-Json
```

يجب أن يطابق `date` تاريخ اليوم بتوقيت المغرب. لتعود للاختيار التلقائي، عطّل
`enabled` في الملفين ثم طبّق الاختيار. إذا اخترت أقل من 8 يستكمل النظام الباقي
تلقائياً. اختيار أكثر من 8 أو ملف غير صالح يُرفض دون تغيير الاختيار السابق.
المباراة بلا قناة صحيحة لا تحصل على قناة أخرى عشوائياً، وتفتح المتابعة الحية.

المباريات المحجوزة تظهر أولاً في كلا الموقعين، بترتيب الاختيار المشترك.
