const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_MODEL_NAME = GEMINI_MODEL.replace(/^models\//, "");

function cleanJson(text) {
  return String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

export async function resolveBroadcastChannelsWithGemini(match) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const prompt = `
You are helping a private sports media QA system map football matches to likely broadcast channel names.
Return strict JSON only, with this shape:
{"fr":["channel name"],"en":["channel name"],"confidence":0.0,"notes":"short reason"}

Rules:
- Use only public, well-known broadcaster/channel names.
- The provided existingChannel/source channel is usually Arabic and is only context, not the answer.
- Search by homeTeam, awayTeam, league, and kickoff to identify broadcasters for this exact match.
- Return French-language broadcasters in "fr" and English-language broadcasters in "en".
- Do not return the Arabic source channel unless it genuinely carries a French or English feed for that match.
- If uncertain, return an empty array for that language.
- Do not invent stream URLs. Channel names only.

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
You are helping a private sports media QA system map football matches to likely broadcast channel names.
Return strict JSON only, with this shape:
{"items":[{"id":"match id","fr":["channel name"],"en":["channel name"],"confidence":0.0,"notes":"short reason"}]}

Rules:
- Use only public, well-known broadcaster/channel names.
- The provided existingChannel/source channel is usually Arabic and is only context, not the answer.
- Search by homeTeam, awayTeam, league, and kickoff to identify broadcasters for each exact match.
- Return French-language broadcasters in "fr" and English-language broadcasters in "en".
- Do not return the Arabic source channel unless it genuinely carries a French or English feed for that match.
- If uncertain, return an empty array for that language.
- Do not invent stream URLs. Channel names only.
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
      fr: Array.isArray(item.fr) ? item.fr.filter(Boolean) : [],
      en: Array.isArray(item.en) ? item.en.filter(Boolean) : [],
      confidence: Number(item.confidence || 0),
      notes: String(item.notes || "")
    }
  ]));
}
