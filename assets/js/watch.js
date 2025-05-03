// استخراج المعلمات من عنوان URL
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get("match");
const channelName = urlParams.get("channel");

// التحقق من وجود البيانات
if (!matchId || !channelName) {
  document.body.innerHTML = "<h2>رابط غير صالح أو بيانات ناقصة.</h2>";
} else {
  // يمكنك هنا عرض معلومات أساسية أو تحميل البث
  const container = document.getElementById("watch-container");

  container.innerHTML = `
    <h1>مشاهدة المباراة</h1>
    <p><strong>معرّف المباراة:</strong> ${matchId}</p>
    <p><strong>القناة الناقلة:</strong> ${channelName}</p>

    <!-- مثال على عرض مشغل أو رابط m3u8 -->
    <div class="player">
      <video controls autoplay width="100%" height="auto">
        <source src="https://example.com/streams/${channelName}.m3u8" type="application/x-mpegURL">
        متصفحك لا يدعم تشغيل الفيديو.
      </video>
    </div>
  `;
}
