// assets/js/chaine.js

const GEMINI_WORKER_URL = 'https://gemini-kora.koora-live.workers.dev/';

/**
 * دالة البحث عن القناة عبر Gemini
 * تأخذ اسم الفريقين والدوري، وتعيد القناة المناسبة
 */
export async function getChannelFromGemini(homeTeam, awayTeam, league) {
    const matchTitle = `${homeTeam} vs ${awayTeam}`;
    
    // إذا لم تكن هناك أسماء فرق، لا فائدة من البحث
    if (!homeTeam || !awayTeam) return "غير محدد";

    try {
        // نرسل اسم المباراة والدوري للعامل
        // الدوري يساعد Gemini جداً في معرفة القناة (مثلاً: دوري اسباني = بي ان سبورت)
        const queryUrl = `${GEMINI_WORKER_URL}?match=${encodeURIComponent(matchTitle)}&league=${encodeURIComponent(league || '')}`;
        
        const response = await fetch(queryUrl);
        if (!response.ok) return "غير محدد";

        const data = await response.json();

        if (data.channel && data.channel !== "Unknown Channel") {
            return data.channel;
        }
    } catch (error) {
        console.warn(`Gemini failed for ${matchTitle}`, error);
    }

    // إذا فشل كل شيء، نرجع قيمة فارغة أو افتراضية
    return "beIN Sports 1"; 
}
