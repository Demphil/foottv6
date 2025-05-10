import { fetchHighlights } from './highlights-api.js';

const idleagues = {
  "دوري أبطال أوروبا": "UEFA Champions League",
  "الدوري الإنجليزي": "Premier League",
  "الدوري الإسباني": "La Liga",
  "الدوري الإيطالي": "Serie A",
  "الدوري الفرنسي": "Ligue 1",
  "دوري المؤتمر الأوروبي": "UEFA Europa Conference League"
};

function getWeekRange() {
  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 6);

  const format = (d) => d.toISOString().split("T")[0];
  return {
    from: format(pastDate),
    to: format(today)
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("leagues");

  if (!container) {
    console.error("❌ لا يوجد عنصر بحرفية id='leagues'");
    return;
  }

  const { from, to } = getWeekRange();

  try {
    const data = await fetchHighlights(from, to);
    if (!data || !data.matches) {
      container.innerHTML = "<p>لا توجد ملخصات متاحة حالياً.</p>";
      return;
    }

    Object.entries(idleagues).forEach(([label, apiName]) => {
      const matches = data.matches.filter(match => match.competition === apiName);
      if (matches.length === 0) return;

      const section = document.createElement("section");
      section.className = "league-section";

      const title = document.createElement("h2");
      title.textContent = label;
      section.appendChild(title);

      const list = document.createElement("div");
      list.className = "highlights-list";

      matches.forEach(match => {
        const card = document.createElement("div");
        card.className = "highlight-card";
        card.innerHTML = `
          <h3>${match.homeTeam} vs ${match.awayTeam}</h3>
          <p>${match.competition}</p>
          <a href="${match.url}" target="_blank">🎥 مشاهدة الملخص</a>
        `;
        list.appendChild(card);
      });

      section.appendChild(list);
      container.appendChild(section);
    });

  } catch (error) {
    console.error("API Error:", error);
    container.innerHTML = "<p>حدث خطأ أثناء تحميل الملخصات.</p>";
  }
});
