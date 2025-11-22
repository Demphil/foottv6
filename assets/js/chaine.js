// chaine.js
import { streamLinks } from './streams.js'; // 1. استيراد الروابط
// 🟢 ضع القائمة اليومية هنا بين علامات (``) كما هي
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
`;

/**
 * دالة ذكية لاستخراج الرابط
 * تتجاهل حالة الأحرف (Small/Capital) والمسافات
 */
export function getChannelInfo(homeTeam, awayTeam) {
  if (!matchesData || (!homeTeam && !awayTeam)) return { name: '', link: '' };

  const lines = matchesData.trim().split('\n');
  
  // تنظيف أسماء الفرق القادمة من الموقع
  const home = homeTeam ? homeTeam.trim() : '';
  const away = awayTeam ? awayTeam.trim() : '';

  for (let line of lines) {
    if (!line.trim()) continue;

    // البحث عن الفريقين داخل السطر
    const hasHome = home && line.includes(home);
    const hasAway = away && line.includes(away);

    if (hasHome || hasAway) {
      if (line.includes(':')) {
        const parts = line.split(':');
        // اسم القناة كما كتبته في القائمة أعلاه
        let channelNameRaw = parts[parts.length - 1].trim(); 
        
        // --- البحث الذكي في ملف streams.js ---
        // 1. تنظيف اسم القناة من القائمة (حذف مسافات، توحيد أحرف)
        const targetChannel = channelNameRaw.toLowerCase().replace(/\s+/g, '');

        // 2. جلب كل مفاتيح القنوات من ملف streams.js
        const streamKeys = Object.keys(streamLinks);

        // 3. البحث عن مفتاح يطابق القناة بغض النظر عن الشكل
        const foundKey = streamKeys.find(key => 
            key.toLowerCase().replace(/\s+/g, '') === targetChannel
        );

        // 4. تحديد الرابط
        let finalLink = '#';
        if (foundKey) {
            finalLink = streamLinks[foundKey];
        } else {
            // محاولة أخيرة: بحث جزئي (إذا كان الاسم يحتوي على جزء من المفتاح)
             const partialKey = streamKeys.find(key => targetChannel.includes(key.toLowerCase().replace(/\s+/g, '')));
             if (partialKey) finalLink = streamLinks[partialKey];
        }

        return { name: channelNameRaw, link: finalLink };
      }
    }
  }

  return { name: "غير محدد", link: "" };
}
