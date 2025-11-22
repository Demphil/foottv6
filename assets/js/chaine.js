// chaine.js
import { streamLinks } from './streams.js';

// 🟢 قائمة المباريات اليومية
export const matchesData = `
بيرنلي × تشيلسي (14:30): beIN SPORTS HD 1
ليفربول × نوتنجهام فورست (17:00): beIN SPORTS HD 1
نيوكاسل يونايتد × مانشستر سيتي (19:30): beIN SPORTS HD 1
وولفرهامبتون × كريستال بالاس (17:00): beIN SPORTS HD 2
بورنموث × وست هام يونايتد (17:00): beIN Sports Xtra 1
برايتون × برينتفورد (17:00): beIN SPORTS HD 2
فولهام × سندرلاند (17:00): beIN SPORTS HD 3

برشلونة × أتلتيك بلباو (17:15): beIN SPORTS HD 3
أوساسونا × ريال سوسيداد (19:30): beIN SPORTS HD 3
فياريال × ريال مايوركا (22:00): beIN SPORTS HD 1
ألافيس × سيلتا فيجو (15:00): beIN SPORTS HD 3

فيورنتينا × يوفنتوس (19:00): AD Sports Premium 1
نابولي × أتالانتا (21:45): AD Sports Premium 1
أودينيزي × بولونيا (16:00): AD Sports Premium 1
كالياري × جنوى (16:00): AD Sports Premium 2

بايرن ميونخ × فرايبورج (16:30): beIN SPORTS HD 5
بوروسيا دورتموند × شتوتجارت (16:30): beIN SPORTS HD 6
فولفسبورج × باير ليفركوزن (16:30): beIN SPORTS HD 9

باريس سان جيرمان × لو آفر (22:05): beIN SPORTS HD 4
ستاد رين × موناكو (20:00): beIN SPORTS HD 4
لانس × ستراسبورج (18:00): beIN SPORTS HD 4

الهلال × الفتح (16:40): SSC 1 HD
الاتفاق × الفيحاء (16:25): SSC Extra 1 HD

الجيش الملكي × يانغ أفريكانز: beIN SPORTS HD 6
صن داونز × سانت إيلوي لوبوبو: beIN SPORTS HD 7
الأهلي × شبيبة القبائل: beIN SPORTS HD 6
الترجي × ستاد مالي: beIN SPORTS HD 8
نهضة بركان × باور ديناموز: beIN SPORTS HD 6
بيراميدز × ريفرز يونايتد: beIN SPORTS HD 8
شباب بلوزداد × سينجيدا: beIN SPORTS HD 9

نانسي × سانت إيلوي لوبوبو: beIN SPORTS HD 4
سانت إتيان × نانسي: beIN SPORTS HD 4
أتالانتا × نابولي: AD Sports Premium 1
فياريال × ريال مايوركا: beIN SPORTS HD 1
`;

// ============================================================
// 🔴 قاموس الاحتمالات (The Magic Dictionary)
// المفتاح (اليسار): هو الاسم المحتمل الذي قد يظهر في القائمة
// القيمة (اليمين): هي اسم القناة الصحيح تماماً كما هو في streams.js
// ============================================================
const channelAliases = {
    // احتمالات بي إن سبورت 1
    "beIN SPORTS HD 1": "beIN SPORTS HD 1",
    "beIN Sports 1": "beIN SPORTS HD 1",
    "bein 1": "beIN SPORTS HD 1",
    "بي ان سبورت 1": "beIN SPORTS HD 1",

    // احتمالات بي إن سبورت 2
    "beIN SPORTS HD 2": "beIN SPORTS HD 2",
    "beIN Sports 2": "beIN SPORTS HD 2",
    "bein 2": "beIN SPORTS HD 2",

    // احتمالات بي إن سبورت 3
    "beIN SPORTS HD 3": "beIN SPORTS HD 3",
    "beIN Sports 3": "beIN SPORTS HD 3",

    // احتمالات بي إن سبورت 4
    "beIN SPORTS HD 4": "beIN SPORTS HD 4",
    "beIN Sports 4": "beIN SPORTS HD 4",

    // احتمالات بي إن سبورت اكسترا 1 (لاحظ حل مشكلة الشَرطة المائلة)
    "beIN Sports Xtra 1": "beIN Sports /Xtra 1",
    "beIN Sports Extra 1": "beIN Sports /Xtra 1",
    "beIN Xtra 1": "beIN Sports /Xtra 1",

    // احتمالات أبو ظبي الرياضية (حل مشكلة الحروف الكبيرة والصغيرة)
    "AD Sports Premium 1": "ad sports premium 1",
    "AD Premium 1": "ad sports premium 1",
    "أبوظبي بريميوم 1": "ad sports premium 1",

    "AD Sports Premium 2": "ad sports premium 2",
    "AD Premium 2": "ad sports premium 2",

    // احتمالات القنوات السعودية SSC
    "SSC 1 HD": "SSC 1 HD",
    "SSC 1": "SSC 1 HD",
    
    // هنا الحل السحري لقناة Extra:
    // بما أنك لا تملك رابط لـ SSC Extra، قمت بتحويلها لرابط SSC Sport 2HD المتوفر لديك
    "SSC Extra 1 HD": "SSC Sport 2HD", 
    "SSC Extra 1": "SSC Sport 2HD",
    "SSC 2": "SSC Sport 2HD",
};

/**
 * دالة البحث المطورة
 */
export function getChannelInfo(homeTeam, awayTeam) {
  if (!matchesData) return { name: '', link: '' };

  // تنظيف أسماء الفرق
  const h = homeTeam ? homeTeam.trim() : '';
  const a = awayTeam ? awayTeam.trim() : '';

  const lines = matchesData.trim().split('\n');
  
  for (let line of lines) {
    if (!line.trim()) continue;

    // 1. البحث عن الفريقين
    if ((h && line.includes(h)) || (a && line.includes(a))) {
      
      // أ) فحص الخطة البديلة (رابط خاص للمباراة)
      const matchKey = `${h}-${a}`;
      if (streamLinks[matchKey]) {
          return { name: "Live Match", link: streamLinks[matchKey] };
      }

      // ب) البحث عن القناة باستخدام القاموس
      if (line.includes(':')) {
        const parts = line.split(':');
        let channelNameRaw = parts[parts.length - 1].trim();
        
        let finalLink = '#';
        let finalName = channelNameRaw;

        // 1. هل الاسم موجود مباشرة في القاموس (channelAliases)؟
        if (channelAliases[channelNameRaw]) {
            // نأخذ الاسم الصحيح من القاموس
            const correctKey = channelAliases[channelNameRaw];
            // نجلب الرابط من ملف الروابط
            if (streamLinks[correctKey]) {
                finalLink = streamLinks[correctKey];
                finalName = correctKey;
            }
        } 
        // 2. إذا لم يكن في القاموس، نحاول البحث المباشر في streams.js
        else if (streamLinks[channelNameRaw]) {
            finalLink = streamLinks[channelNameRaw];
        }
        // 3. محاولة أخيرة: البحث الذكي (إزالة المسافات وحالة الأحرف)
        else {
             const targetClean = channelNameRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
             // البحث في القاموس
             const aliasKey = Object.keys(channelAliases).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === targetClean);
             if (aliasKey) {
                 const realKey = channelAliases[aliasKey];
                 finalLink = streamLinks[realKey] || '#';
             } 
             // البحث في الروابط مباشرة
             else {
                 const streamKey = Object.keys(streamLinks).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === targetClean);
                 if (streamKey) finalLink = streamLinks[streamKey];
             }
        }

        return { name: finalName, link: finalLink };
      }
    }
  }

  return { name: "غير محدد", link: "" };
}
