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
    console.error(err);  // Use 'err' instead of 'error'
    document.getElementById("match-title").textContent = "فشل تحميل بيانات المباراة.";
  });
This should resolve the ReferenceError. Now, the error will be correctly logged as err inside the catch block.







You said:
watch.js:46 TypeError: Cannot read properties of null (reading '1')
    at watch.js:23:62
(anonymous)	@	watch.js:46
Promise.catch		
(anonymous)	@	watch.js:45


ChatGPT said:
The error you're encountering suggests that the text.match() method is not finding a match for the regular expression, which is causing it to return null. As a result, when you try to access the [1] element of null, it throws a TypeError.

To fix this, you can add a check to ensure that the match() method actually returns a valid result before trying to access it.

Here's an updated version of the code with a safety check:

javascript
Copy
Edit
fetch("assets/js/matches.js")
  .then((res) => res.text())
  .then((text) => {
    // استخدام match() مع التحقق من وجود نتيجة
    const matchResult = text.match(/const matches = (.+);/s);
    if (matchResult) {
      // استخراج مصفوفة المباريات من الملف النصي
      const matches = eval(matchResult[1]);
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
    } else {
      console.error("لم يتم العثور على بيانات المباريات في الملف.");
      document.getElementById("match-title").textContent = "فشل تحميل بيانات المباريات.";
    }
  })
  .catch((err) => {
    console.error(err);  // Use 'err' instead of 'error'
    document.getElementById("match-title").textContent = "فشل تحميل بيانات المباراة.";
  });
}
