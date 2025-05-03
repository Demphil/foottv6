// روابط القنوات حسب الاسم
const channels = {
  "beIN Sports HD 1": "https://demphil.github.io/live-stream/",
  "beIN Sports HD 2": "https://example.com/bein2",
  "SSC Sports HD 1": "https://example.com/ssc1",
  "Al Kass One HD": "https://example.com/alkass1",
  // أضف باقي القنوات هنا...
};

// استخراج اسم القناة من الرابط
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get("id");

if (!matchId) {
  document.getElementById("match-title").textContent = "لا توجد مباراة محددة.";
} else {
  fetch("matches.js")
    .then((res) => res.text())
    .then((text) => {
      // نحول محتوى matches.js إلى كود قابل للتنفيذ
      const matches = eval(text.match(/const matches = (.+);/s)[1]);
      const match = matches.find((m) => m.id == matchId);
      if (match) {
        document.getElementById("match-title").textContent = `${match.homeTeam} vs ${match.awayTeam}`;
        const channelLink = channels[match.channel];
        if (channelLink) {
          document.getElementById("stream-frame").src = channelLink;
        } else {
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
