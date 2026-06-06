// --- 2. Timezone Conversion Function ---
/**
 * Converts a time string from Source (Saudi Arabia/Mecca Time - UTC+3) to Morocco Time.
 * Automatically handles Morocco's UTC+1 / UTC+0 (Ramadan) fluctuations.
 */
function convertSourceToMoroccoTime(timeString) {
  try {
    if (!timeString || !timeString.includes(':')) {
      return timeString;
    }

    // 1. تنظيف النص وتفكيك الوقت (مثال: "08:45 PM" أو "20:45")
    const cleanedString = timeString.replace(/\s+/g, ' ').trim();
    const [timePart, ampm] = cleanedString.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (ampm) {
      if (ampm.toUpperCase().includes('PM') && hours !== 12) hours += 12;
      if (ampm.toUpperCase().includes('AM') && hours === 12) hours = 0;
    }

    // 2. الحصول على تاريخ اليوم الحالي في مكة المكرمة لضبط كائن التاريخ
    const now = new Date();
    const meccaFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric', month: 'numeric', day: 'numeric'
    });
    const parts = meccaFormatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year').value, 10);
    const month = parseInt(parts.find(p => p.type === 'month').value, 10) - 1;
    const day = parseInt(parts.find(p => p.type === 'day').value, 10);

    // 3. إنشاء التاريخ وتحويله إلى التوقيت العالمي الموحد (UTC) عبر طرح 3 ساعات (توقيت مكة هو UTC+3)
    const matchDateUTC = new Date(Date.UTC(year, month, day, hours - 3, minutes));

    // 4. تحويل الوقت الناتج مباشرة إلى توقيت المغرب المحلي (Africa/Casablanca)
    // المتصفح سيحدد تلقائياً إن كان المغرب في فترة +1 أو 0 بناءً على تاريخ اليوم
    const moroccoFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Casablanca',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return moroccoFormatter.format(matchDateUTC);
  } catch (error) {
    console.error("Error converting time:", error);
    return timeString; 
  }
}
