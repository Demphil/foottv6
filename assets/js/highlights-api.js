const fetchHighlights = async (league = '') => {
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-host': 'football-highlights-api.p.rapidapi.com',
            'x-rapidapi-key': '795f377634msh4be097ebbb6dce3p1bf238jsn583f1b9cf438',
            'Content-Type': 'application/json'
        }
    };

    try {
        // استخدام URL صحيح مع مسار API الدقيق
        const url = new URL('https://football-highlights-api.p.rapidapi.com/api/v3/highlights');
        url.searchParams.append('limit', '50');
        url.searchParams.append('timezone', 'Europe/London'); // تغيير المنطقة الزمنية
        
        if (league) {
            url.searchParams.append('competitionName', league); // تغيير المعلمة إلى ما يتوقعه API
        }

        // إضافة console.log لتصحيح الأخطاء
        console.log('Request URL:', url.toString());

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data); // تسجيل الاستجابة للتصحيح
        
        if (!data || !data.response || !Array.isArray(data.response)) {
            throw new Error('Invalid data structure from API');
        }

        return data.response; // تعديل حسب هيكل الاستجابة الفعلي
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export { fetchHighlights };
