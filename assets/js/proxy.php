async function fetchWithProxy(url) {
  try {
    // الخيار 1: استخدام AllOrigins
    const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(allOriginsUrl);
    const data = await response.json();
    return new Response(data.contents);
    
    // الخيار 2: استخدام CORS Anywhere (قد يحتاج تفعيل)
    // const corsUrl = `https://cors-anywhere.herokuapp.com/${url}`;
    // return await fetch(corsUrl);
    
  } catch (error) {
    console.error('فشل في جلب البيانات:', error);
    throw error;
  }
}
