const fetchHighlights = async (league = '') => {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
            'X-RapidAPI-Host': 'football-highlights-api.p.rapidapi.com'
        }
    };

    try {
        // بناء URL مع المعلمات الأساسية فقط
        const url = new URL('https://football-highlights-api.p.rapidapi.com/matches');
        
        // المعلمات الأساسية المطلوبة
        const basicParams = {
            timezone: 'Europe/London',
            limit: '10' // تقليل العدد للاختبار
        };

        // إضافة المعلمات الأساسية
        Object.keys(basicParams).forEach(key => {
            url.searchParams.append(key, basicParams[key]);
        });

        // إضافة فلتر الدوري إذا كان موجوداً
        if (league && league.trim() !== '') {
            url.searchParams.append('competition_name', league.trim());
        }

        console.log('Final Request URL:', url.toString());

        const response = await fetch(url, options);
        
        if (!response.ok) {
            // محاولة قراءة رسالة الخطأ من الاستجابة
            let errorMsg = `HTTP Error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg += ` - ${errorData.message || JSON.stringify(errorData)}`;
            } catch (e) {
                console.warn('Could not parse error response:', e);
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        
        // التحقق من هيكل البيانات
        if (!data || !Array.isArray(data.matches)) {
            console.warn('Unexpected API response structure:', data);
            return [];
        }

        return data.matches.map(match => ({
            id: match.id,
            title: match.title,
            embed: match.embed_url,
            date: match.date,
            competition: match.competition_name,
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            thumbnail: match.thumbnail_url
        }));

    } catch (error) {
        console.error('API Request Failed:', {
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Could not retrieve highlights: ${error.message}`);
    }
};

export { fetchHighlights };
