const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_MODEL_NAME = GEMINI_MODEL.replace(/^models\//, "");
const TRUSTED_BROADCAST_SOURCES = [
  "https://www.beinsports.com/ar-mena/%D8%AC%D8%AF%D9%88%D9%84-%D8%A7%D9%84%D8%A8%D8%AB",
  "https://www.beinsports.com/en-mena/tv-guide",
  "https://www.kooora.com/%D9%83%D8%B1%D8%A9-%D8%A7%D9%84%D9%82%D8%AF%D9%85/%D9%85%D8%A8%D8%A7%D8%B1%D9%8A%D8%A7%D8%AA-%D8%A7%D9%84%D9%8A%D9%88%D9%85"
];

function cleanJson(text) {
  return String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function resolverRules() {
  const today = new Date().toISOString().slice(0, 10);
  return `
Current UTC date: ${today}
Trusted source priority:
${TRUSTED_BROADCAST_SOURCES.map((url) => `- ${url}`).join("\n")}
- Official broadcaster TV guides.
- Official competition, league, club, or rights-holder broadcast pages.
- Reputable live schedule pages only when they show the same fixture date.

Hard verification rules:
- Use homeTeam, awayTeam, league, kickoff date, and kickoff time together. A team-name match alone is not enough.
- The evidence must refer to this exact fixture date or the same calendar day as kickoff. Do not use previous seasons, old articles, old search snippets, or general rights assumptions.
- If a source date/year is absent or conflicts with kickoff, return empty arrays and confidence below 0.55.
- Do not guess numbered channels. "La Liga is usually on beIN" is not evidence for "beIN SPORTS HD 2".
- In notes, include "source:" and a short evidence phrase with the source name and the fixture date/time you matched.
- If the official beIN TV guide or Kooora disagrees with a general source, prefer the official beIN/Kooora entry or return uncertainty.`;
}

export async function resolveBroadcastChannelsWithGemini(match) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const prompt = `
You are helping a private sports media QA system map football matches to verified broadcast channel names.
Return strict JSON only, with this shape:
{"ar":["channel name"],"fr":["channel name"],"en":["channel name"],"confidence":0.0,"notes":"short reason with source name"}

Rules:
${resolverRules()}
- Return actual official or widely trusted broadcasters for this exact match.
- Prioritize trusted broadcaster families such as beIN SPORTS, SSC, Alkass, Abu Dhabi Sports, Dubai Sports, ON Time Sports, Arryadia, Shahid, ESPN, TNT Sports, Canal+, DAZN, Sky Sports, SuperSport, and league/cup official broadcasters.
- Return Arabic-language broadcasters in "ar", French-language broadcasters in "fr", and English-language broadcasters in "en".
- The provided existingChannel/source channel may be missing or unreliable. Do not copy it blindly.
- Use homeTeam, awayTeam, league, kickoff, and country/competition context to identify the real broadcaster.
- Do not infer an exact numbered channel only because the league is usually carried by a broadcaster.
- If you cannot name the trusted schedule/source used for the exact fixture, return empty arrays and confidence below 0.55.
- In notes, name the source used, for example "source: beIN official TV guide" or "source: competition broadcaster schedule".
- If uncertain, return an empty array for that language.
- Do not invent stream URLs. Channel names only.
- Prefer exact channel names with numbers when known, for example "beIN SPORTS HD 1" instead of just "beIN SPORTS".
- Keep confidence below 0.55 if you are not sure from trusted broadcaster information.

Match data:
${JSON.stringify(match, null, 2)}
`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsed = JSON.parse(cleanJson(text));

  return {
    ar: Array.isArray(parsed.ar) ? parsed.ar.filter(Boolean) : [],
    fr: Array.isArray(parsed.fr) ? parsed.fr.filter(Boolean) : [],
    en: Array.isArray(parsed.en) ? parsed.en.filter(Boolean) : [],
    confidence: Number(parsed.confidence || 0),
    notes: String(parsed.notes || "")
  };
}

export async function resolveBroadcastChannelsBatchWithGemini(matches) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  if (!matches.length) return new Map();

  const prompt = `
You are helping a private sports media QA system map football matches to verified broadcast channel names.
Return strict JSON only, with this shape:
{"items":[{"id":"match id","ar":["channel name"],"fr":["channel name"],"en":["channel name"],"confidence":0.0,"notes":"short reason with source name"}]}

Rules:
${resolverRules()}
- Return actual official or widely trusted broadcasters for each exact match.
- Prioritize trusted broadcaster families such as beIN SPORTS, SSC, Alkass, Abu Dhabi Sports, Dubai Sports, ON Time Sports, Arryadia, Shahid, ESPN, TNT Sports, Canal+, DAZN, Sky Sports, SuperSport, and league/cup official broadcasters.
- Return Arabic-language broadcasters in "ar", French-language broadcasters in "fr", and English-language broadcasters in "en".
- The provided existingChannel/source channel may be missing or unreliable. Do not copy it blindly.
- Use homeTeam, awayTeam, league, kickoff, and country/competition context to identify the real broadcaster.
- Do not infer an exact numbered channel only because the league is usually carried by a broadcaster.
- If you cannot name the trusted schedule/source used for the exact fixture, return empty arrays and confidence below 0.55.
- In notes, name the source used, for example "source: beIN official TV guide" or "source: competition broadcaster schedule".
- If uncertain, return an empty array for that language.
- Do not invent stream URLs. Channel names only.
- Prefer exact channel names with numbers when known, for example "beIN SPORTS HD 1" instead of just "beIN SPORTS".
- Keep confidence below 0.55 if you are not sure from trusted broadcaster information.
- Preserve every input id exactly.

Match data:
${JSON.stringify(matches, null, 2)}
`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "{\"items\":[]}";
  const parsed = JSON.parse(cleanJson(text));
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  return new Map(items.map((item) => [
    String(item.id || ""),
    {
      ar: Array.isArray(item.ar) ? item.ar.filter(Boolean) : [],
      fr: Array.isArray(item.fr) ? item.fr.filter(Boolean) : [],
      en: Array.isArray(item.en) ? item.en.filter(Boolean) : [],
      confidence: Number(item.confidence || 0),
      notes: String(item.notes || "")
    }
  ]));
}
