// chaine.js
import { streamLinks } from './streams.js';

// 🟢 قائمة المباريات اليومية (تم تعديل القنوات لتطابق ملف streams.js حرفياً)
export const matchesData = `
بيرنلي × تشيلسي (14:30): beIN SPORTS HD 1
ليفربول × نوتنجهام فورست (17:00): beIN SPORTS HD 1
نيوكاسل يونايتد × مانشستر سيتي (19:30): beIN SPORTS HD 1
وولفرهامبتون × كريستال بالاس (17:00): beIN SPORTS HD 2
بورنموث × وست هام يونايتد (17:00): beIN Sports /Xtra 1
برايتون × برينتفورد (17:00): beIN SPORTS HD 2
فولهام × سندرلاند (17:00): beIN SPORTS HD 3

برشلونة × أتلتيك بلباو (17:15): beIN SPORTS HD 3
أوساسونا × ريال سوسيداد (19:30): beIN SPORTS HD 3
فياريال × ريال مايوركا (22:00): beIN SPORTS HD 1
ألافيس × سيلتا فيجو (15:00): beIN SPORTS HD 3

فيورنتينا × يوفنتوس (19:00): ad sports premium 1
نابولي × أتالانتا (21:45): ad sports premium 1
أودينيزي × بولونيا (16:00): ad sports premium 1
كالياري × جنوى (16:00): ad sports premium 2

بايرن ميونخ × فرايبورج (16:30): beIN SPORTS HD 5
بوروسيا دورتموند × شتوتجارت (16:30): beIN SPORTS HD 6
فولفسبورج × باير ليفركوزن (16:30): beIN SPORTS HD 9

باريس سان جيرمان × لو آفر (22:05): beIN SPORTS HD 4
ستاد رين × موناكو (20:00): beIN SPORTS HD 4
لانس × ستراسبورج (18:00): beIN SPORTS HD 4

الهلال × الفتح (16:40): SSC 1 HD
الاتفاق × الفيحاء (16:25): SSC Sport 2HD

الجيش الملكي × يانغ أفريكانز: beIN SPORTS HD 6
صن داونز × سانت إيلوي لوبوبو: beIN SPORTS HD 7
الأهلي × شبيبة القبائل: beIN SPORTS HD 6
الترجي × ستاد مالي: beIN SPORTS HD 8
نهضة بركان × باور ديناموز: beIN SPORTS HD 6
بيراميدز × ريفرز يونايتد: beIN SPORTS HD 8
شباب بلوزداد × سينجيدا: beIN SPORTS HD 9
`;

/**
 * دالة ذكية لاستخراج الرابط
 * تبحث عن تطابق دقيق، ثم تطابق ذكي (بدون مسافات)، ثم بحث باسم الفريق
 */
export function getChannelInfo(homeTeam, awayTeam) {
  if (!matchesData || (!homeTeam && !awayTeam)) return { name: '', link: '' };

  const lines = matchesData.trim().split('\n');
  
  const home = homeTeam ? homeTeam.trim() : '';
  const away = awayTeam ? awayTeam.trim() : '';

  for (let line of lines) {
    if (!line.trim()) continue;

    const hasHome = home && line.includes(home);
    const hasAway = away && line.includes(away);

    if (hasHome || hasAway) {
      
      // 1. الخطة البديلة: البحث برابط "الفريق-ضد-الفريق" (مفيد للمباريات الخاصة)
      const matchKey = `${home}-${away}`;
      if (streamLinks[matchKey]) {
          return { name: "مباراة خاصة", link: streamLinks[matchKey] };
      }

      // 2. البحث عن القناة
      if (line.includes(':')) {
        const parts = line.split(':');
        // اسم القناة كما هو مكتوب في القائمة أعلاه
        const channelNameRaw = parts[parts.length - 1].trim(); 
        
        // أ) محاولة البحث المباشر (التطابق التام) - هذا سيعمل 100% الآن
        if (streamLinks[channelNameRaw]) {
            return { name: channelNameRaw, link: streamLinks[channelNameRaw] };
        }

        // ب) البحث الذكي (في حال نسيت حرفاً أو مسافة مستقبلاً)
        const targetClean = channelNameRaw.toLowerCase().replace(/\s+/g, '');
        const streamKeys = Object.keys(streamLinks);

        const foundKey = streamKeys.find(key => 
            key.toLowerCase().replace(/\s+/g, '') === targetClean
        );

        let finalLink = '#';
        if (foundKey) {
            finalLink = streamLinks[foundKey];
        } else {
             const partialKey = streamKeys.find(key => targetClean.includes(key.toLowerCase().replace(/\s+/g, '')));
             if (partialKey) finalLink = streamLinks[partialKey];
        }

        return { name: channelNameRaw, link: finalLink };
      }
    }
  }

  return { name: "غير محدد", link: "" };
}
