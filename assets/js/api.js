// في ملف api.js

function parseMatches(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const matches = [];

  // المحدد الرئيسي لكل مباراة
  const matchElements = doc.querySelectorAll('.AY_Match');
  
  if (matchElements.length === 0) {
    console.error("CRITICAL: لم يتم العثور على أي مباريات باستخدام المحدد '.AY_Match'.");
    return [];
  }

  console.log(`Found ${matchElements.length} match elements to parse.`);

  matchElements.forEach(matchEl => {
      try {
          // --- استخدام المحددات الجديدة من تحليل HTML ---
          const homeTeamName = matchEl.querySelector('.MT_Team.TM1 .TM_Name')?.textContent?.trim();
          const awayTeamName = matchEl.querySelector('.MT_Team.TM2 .TM_Name')?.textContent?.trim();

          // تجاهل العناصر إذا لم تكن مباراة حقيقية (قد تكون إعلانات بنفس الهيكل)
          if (!homeTeamName || !awayTeamName) {
              return; // استخدمنا return بدلاً من throw للمرونة
          }

          const homeTeamLogo = extractImageUrl(matchEl.querySelector('.MT_Team.TM1 .TM_Logo img'));
          const awayTeamLogo = extractImageUrl(matchEl.querySelector('.MT_Team.TM2 .TM_Logo img'));
          
          const time = matchEl.querySelector('.MT_Time')?.textContent?.trim() || '--:--';
          
          // دمج أرقام النتيجة معًا
          const scoreSpans = matchEl.querySelectorAll('.MT_Result .RS-goals');
          const score = scoreSpans.length === 2 
              ? `${scoreSpans[0].textContent.trim()} - ${scoreSpans[1].textContent.trim()}`
              : 'VS'; // قيمة افتراضية إذا لم تكن النتيجة موجودة

          // استخراج اسم الدوري من آخر عنصر في القائمة
          const league = matchEl.querySelector('.MT_Info ul li:last-child')?.textContent?.trim() || 'بطولة غير محددة';

           matches.push({
              homeTeam: { name: homeTeamName, logo: homeTeamLogo },
              awayTeam: { name: awayTeamName, logo: awayTeamLogo },
              time: time,
              score: score,
              league: league
          });

      } catch (e) {
          console.error('فشل في تحليل عنصر مباراة واحد:', e, matchEl);
      }
  });

  return matches;
}

// دالة extractImageUrl تبقى كما هي
function extractImageUrl(imgElement) {
  if (!imgElement) return '';
  // الأولوية لـ data-src لأنه يحتوي على الرابط الحقيقي للصور المحملة بـ lazy-loading
  const src = imgElement.dataset.src || imgElement.getAttribute('src') || '';
  if (src.startsWith('http')) {
    return src;
  }
  if (src.startsWith('//')) {
    return `https:${src}`;
  }
  // قد لا نحتاج هذا الجزء إذا كانت كل الروابط كاملة
  return `https://kooora.live-kooora.com${src.startsWith('/') ? '' : '/'}${src}`;
}


// --- باقي دوال الملف (fetchMatches, getTodayMatches, etc.) تبقى كما هي ---
// --- لا حاجة لتغييرها ---
