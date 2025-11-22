// chaine.js
import { streamLinks } from './streams.js'; // ⚠️ تأكد أن ملف streams.js موجود بجانب هذا الملف

// 🟢 قائمة المباريات
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
الاتفاق × الفيحاء (16:25): SSC Sport 2HD

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

export function getChannelInfo(homeTeam, awayTeam) {
  // تنظيف الأسماء القادمة من الموقع (إزالة المسافات الزائدة)
  const h = homeTeam ? homeTeam.trim() : '';
  const a = awayTeam ? awayTeam.trim() : '';
  
  console.log(`🔍 Searching for match: [${h}] vs [${a}]`); // طباعة للتشخيص

  if (!matchesData) return { name: '', link: '' };

  const lines = matchesData.trim().split('\n');
  
  for (let line of lines) {
    if (!line.trim()) continue;

    // البحث: هل اسم الفريق موجود داخل السطر؟
    const hasHome = h && line.includes(h);
    const hasAway = a && line.includes(a);

    if (hasHome || hasAway) {
      console.log(`✅ Match found in line: "${line}"`);

      // 1. فحص الخطة البديلة (مباراة خاصة)
      const matchKey = `${h}-${a}`;
      if (streamLinks[matchKey]) {
          console.log(`🔗 Special link found for match: ${matchKey}`);
          return { name: "Live", link: streamLinks[matchKey] };
      }

      if (line.includes(':')) {
        const parts = line.split(':');
        const channelRaw = parts[parts.length - 1].trim();
        
        // تنظيف اسم القناة للمطابقة (حذف المسافات وتحويل لحروف صغيرة)
        // مثال: "beIN SPORTS HD 1" -> "beinsportshd1"
        const targetClean = channelRaw.toLowerCase().replace(/[^a-z0-9]/g, '');

        // البحث في ملف الروابط
        const streamKeys = Object.keys(streamLinks);
        const foundKey = streamKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === targetClean);
        
        if (foundKey) {
            console.log(`📺 Channel matched: "${foundKey}" -> Link: ${streamLinks[foundKey]}`);
            return { name: channelRaw, link: streamLinks[foundKey] };
        } else {
             // محاولة بحث جزئي
             const partialKey = streamKeys.find(k => targetClean.includes(k.toLowerCase().replace(/[^a-z0-9]/g, '')));
             if (partialKey) {
                console.log(`⚠️ Partial match: "${partialKey}"`);
                return { name: channelRaw, link: streamLinks[partialKey] };
             }
        }

        console.log(`❌ Channel found "${channelRaw}" but NO LINK in streams.js`);
        return { name: channelRaw, link: '#' };
      }
    }
  }
  
  console.log(`🚫 No match found in list for: ${h} vs ${a}`);
  return { name: "غير محدد", link: "" };
}
