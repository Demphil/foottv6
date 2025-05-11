const fetchHighlights = async () => {
    try {
        // 1. إنشاء URL صحيح بدون معلمات غير مدعومة
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        
        // 2. إضافة المعلمات الأساسية فقط (التاريخ والحد الزمني)
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        url.searchParams.append('date', formattedDate);
        url.searchParams.append('limit', '10');
        
        console.log('Request URL:', url.toString()); // تسجيل URL للتحقق

        // 3. إرسال الطلب مع الرؤوس المطلوبة فقط
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
                'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
            }
        });

        // 4. التحقق من حالة الاستجابة
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Response:', errorData);
            throw new Error(`خطأ في API: ${response.status} - ${errorData.message || 'لا توجد تفاصيل'}`);
        }

        // 5. معالجة البيانات
        const data = await response.json();
        console.log('API Success Response:', data);
        
        // 6. التحقق من وجود البيانات
        if (!data || (!data.matches && !Array.isArray(data))) {
            console.warn('البيانات المستلمة غير متوقعة:', data);
            return [];
        }

        // 7. استخراج المباريات (تختلف حسب هيكل الAPI)
        const matches = data.matches || data;
        
        // 8. معالجة كل مباراة
        return matches.map(match => {
            // البحث عن رابط الفيديو في الهياكل المختلفة
            const videoUrl = match.embed || 
                           match.video_url || 
                           match.video || 
                           match.media?.video_url || 
                           '';
            
            return {
                homeTeam: match.home_team || match.homeTeam || 'فريق 1',
                awayTeam: match.away_team || match.awayTeam || 'فريق 2',
                embed: videoUrl,
                competition: match.competition || match.league || ''
            };
        });

    } catch (error) {
        console.error('حدث خطأ جسيم:', {
            error: error.message,
            stack: error.stack,
            time: new Date().toISOString()
        });
        return [];
    }
};

export default fetchHighlights;
