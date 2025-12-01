// assets/js/chaine.js

// رابط الـ Worker الخاص بك
const GEMINI_WORKER_URL = 'https://gemini-kora.koora-live.workers.dev/';

/**
 * دالة ذكية: لا تحتوي على مباريات، بل تبحث عنها!
 * تأخذ اسم الفريقين والدوري، وتسأل Gemini عن القناة
 */
export async function getChannelFromGemini(homeTeam, awayTeam, league) {
    const matchTitle = `${homeTeam} vs ${awayTeam}`;
    
    // إذا لم تكن هناك أسماء فرق، نتوقف
    if (!homeTeam || !awayTeam) return "غير محدد";

    try {
        console.log(`🤖 Asking Gemini for: ${matchTitle} (${league})`);
        
        // إرسال الطلب لـ Gemini
        const queryUrl = `${GEMINI_WORKER_URL}?match=${encodeURIComponent(matchTitle)}&league=${encodeURIComponent(league || '')}`;
        
        const response = await fetch(queryUrl);
        if (!response.ok) return "غير محدد";

        const data = await response.json();

        // إذا وجد Gemini القناة، نعيدها
        if (data.channel && data.channel !== "Unknown Channel") {
            return data.channel;
        }
    } catch (error) {
        console.warn(`Gemini failed for ${matchTitle}`, error);
    }

    // إذا فشل Gemini، نرجع القناة الافتراضية
    return "beIN Sports 1"; 
}
