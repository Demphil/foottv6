
export const fetchMatches = async () => {
    const response = await fetch('https://api.football-data.org/v2/matches', {
        headers: {
            'X-Auth-Token': '3677c62bbcmshe54df743c38f9f5p13b6b9jsn4e20f3d12556' // ضع مفتاح API الخاص بك هنا
        }
    });
    
    if (!response.ok) {
        throw new Error('فشل في تحميل البيانات');
    }
    
    const data = await response.json();
    return data.matches;
};

