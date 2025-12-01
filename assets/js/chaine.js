// assets/js/chaine.js

// 🔴 قاموس التصحيح (Aliases)
// هذا أهم جزء الآن! وظيفته تصحيح ما يرسله Gemini ليطابق ملف streams.js
const channelAliases = {
    // --- قنوات بي إن سبورت ---
    "beIN Sports 1": "beIN SPORTS HD 1",
    "beIN SPORTS 1": "beIN SPORTS HD 1",
    "bein 1": "beIN SPORTS HD 1",
    "بي ان سبورت 1": "beIN SPORTS HD 1",

    "beIN Sports 2": "beIN SPORTS HD 2",
    "bein 2": "beIN SPORTS HD 2",
    "بي ان سبورت 2": "beIN SPORTS HD 2",

    "beIN Sports 3": "beIN SPORTS HD 3",
    "bein 3": "beIN SPORTS HD 3",

    "beIN Sports 4": "beIN SPORTS HD 4",
    "bein 4": "beIN SPORTS HD 4",
    
    "beIN Sports Premium 1": "beIN Sports Premium 1",
    "beIN Premium 1": "beIN Sports Premium 1",

    // --- قنوات SSC السعودية ---
    "SSC 1": "SSC 1 HD",
    "SSC 1 HD": "SSC 1 HD",
    "SSC Sport 1": "SSC 1 HD",

    "SSC 5": "SSC 5 HD",
    "SSC 5 HD": "SSC 5 HD",

    "SSC Extra 1": "SSC Sport 2HD", // تحويل القنوات غير المتوفرة للمتوفرة
    "SSC Extra 2": "SSC Sport 2HD",

    // --- قنوات أبو ظبي ---
    "Abu Dhabi Sports 1": "AD Sports 1",
    "AD Sports 1": "AD Sports 1",
    
    // --- قنوات الكأس ---
    "Alkass One": "Alkass One HD",
    "Alkass 1": "Alkass One HD",

    // --- قنوات أون تايم ---
    "On Time Sports": "ON TIME SPORTS 1",
    "On Time Sports 1": "ON TIME SPORTS 1",
};

/**
 * دالة جديدة ومهمة جداً
 * وظيفتها: أخذ اسم القناة من Gemini وتنظيفه ليعمل الرابط
 */
export function normalizeChannelName(rawName) {
    if (!rawName) return null;

    // 1. البحث المباشر في القاموس
    if (channelAliases[rawName]) {
        return channelAliases[rawName];
    }

    // 2. تنظيف النص (إزالة المسافات الزائدة ومحاولة البحث مرة أخرى)
    const cleanName = rawName.trim();
    if (channelAliases[cleanName]) {
        return channelAliases[cleanName];
    }

    // 3. البحث الجزئي (مثلاً لو Gemini أرسل "Channel: beIN 1")
    for (const [key, value] of Object.entries(channelAliases)) {
        if (cleanName.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }

    // إذا لم نجد تطابق، نرجع الاسم كما هو (لعل وعسى يكون صحيحاً)
    return cleanName;
}

// -------------------------------------------------------------
// هذا الجزء يبقى كخيار احتياطي (Backup) فقط
// في حال تعطل Gemini، يمكنك وضع المباريات هنا يدوياً
// -------------------------------------------------------------
export const matchesData = `
`; // اتركها فارغة إلا للضرورة

export function getChannelByTeam(homeTeam, awayTeam) {
    if (!matchesData.trim()) return ''; 
    // ... (نفس كود البحث القديم الذي كان لديك)
    const lines = matchesData.trim().split('\n');
    const home = homeTeam ? homeTeam.trim() : '';
    const away = awayTeam ? awayTeam.trim() : '';

    for (let line of lines) {
        if (!line.trim()) continue;
        if ((home && line.includes(home)) || (away && line.includes(away))) {
            if (line.includes(':')) {
                const parts = line.split(':');
                // نمرر النتيجة أيضاً عبر دالة التنظيف
                return normalizeChannelName(parts[parts.length - 1]);
            }
        }
    }
    return '';
}
