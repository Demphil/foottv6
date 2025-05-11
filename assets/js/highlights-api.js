// في ملف highlights-api.js
const fetchHighlights = async () => {
    try {
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        url.searchParams.append('date', new Date().toISOString().split('T')[0]);
        
        // إضافة معلمات إضافية قد تحتوي على الفيديو
        url.searchParams.append('include', 'videos,highlights');
        url.searchParams.append('media', 'true');

        const response = await fetch(url, {
            headers: {
                'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
                'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
            }
        });

        const data = await response.json();
        console.log('Raw API Response:', data); // هذا السطر مهم للتحقق
        
        // معالجة متقدمة للبيانات
        return (data.matches || []).map(match => {
            // البحث عن رابط الفيديو في الهيكل المختلف
            const videoUrl = 
                match.videos?.[0]?.embed || 
                match.highlights?.[0]?.url ||
                match.media?.videos?.[0]?.embed ||
                '';
                
            return {
                homeTeam: match.home_team?.name || 'فريق غير معروف',
                awayTeam: match.away_team?.name || 'فريق غير معروف',
                embed: videoUrl,
                competition: match.competition?.name || ''
            };
        });
    } catch (error) {
        console.error('API Error Details:', error);
        return [];
    }
};

export default fetchHighlights;
