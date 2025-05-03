// روابط القنوات حسب الاسم
const channels = {
  "beIN Sports HD 1": "https://z.alkoora.live/albaplayer/on-time-sport-1/",
  "beIN Sports HD 2": "https://z.alkoora.live/albaplayer/on-time-sport-2/",
  "SSC Sports HD 1": "https://z.alkoora.live/albaplayer/ssc1/",
  "Al Kass One HD": "https://z.alkoora.live/albaplayer/alkass1/",
  // أضف المزيد هنا إذا لزم
};

// استخراج ID المباراة واسم القناة من رابط الصفحة
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get("match");
const channelParam = urlParams.get("channel");

// إذا لم يكن هناك match ID في الرابط
if (!matchId) {
  document.getElementById("match-title").textContent = "لا توجد مباراة محددة.";
} else {
  fetch("assets/js/matches.js")
    .then((res) => res.text())
    .then((text) => {
      // استخراج مصفوفة المباريات من الملف النصي
      const matches = eval(text.match(/const matches = (.+);/s)[1]);
      const match = matches.find((m) => m.id == matchId);

      if (match) {
        // عرض اسم المباراة
        document.getElementById("match-title").textContent = `${match.homeTeam} vs ${match.awayTeam}`;

        // استخدام القناة من الرابط أو من كائن المباراة
        const selectedChannel = channelParam || match.channel;
        const channelLink = channels[selectedChannel];

        if (channelLink) {
          // عرض البث
          document.getElementById("stream-frame").src = channelLink;
        } else {
          // في حال لم يوجد رابط للقناة
          document.getElementById("stream-frame").outerHTML = "<p>رابط البث غير متوفر لهذه القناة.</p>";
        }
      } else {
        document.getElementById("match-title").textContent = "لم يتم العثور على المباراة.";
      }
    })
    .catch((err) => {
      console.error(err);
      document.getElementById("match-title").textContent = "فشل تحميل بيانات المباراة.";
    });
}
