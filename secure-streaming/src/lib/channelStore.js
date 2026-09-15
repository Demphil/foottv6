import { getSupabaseAdmin } from "./supabaseAdmin";
import fs from "node:fs";
import path from "node:path";

function getLocalChannel(name) {
  const localFile = process.env.LOCAL_CHANNELS_JSON;
  if (!localFile) return null;
  const filePath = path.join(process.cwd(), "runtime", path.basename(localFile));
  const items = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return items.find((item) => item.active && item.name === name) || null;
}

function getLocalAlternatives(name) {
  const localFile = process.env.LOCAL_CHANNEL_ALTERNATIVES_JSON;
  if (!localFile) return [];
  try {
    const filePath = path.join(process.cwd(), "runtime", path.basename(localFile));
    const items = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return items.filter((item) => item.active !== false && item.base_channel_name === name);
  } catch {
    return [];
  }
}

function normalizeChannelName(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[|/\\_\-:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ar");
}

function firstNumber(value) {
  const normalizedDigits = String(value || "").replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const match = normalizedDigits.match(/\d+/);
  return match ? match[0] : "";
}

function canonicalChannelName(value) {
  const text = normalizeChannelName(value);
  const compact = text.replace(/\s+/g, "");
  const number = firstNumber(text);

  if (/bein|be in|بي ?ان|بى ?ان|بين/.test(text) || compact.includes("بيان") || compact.includes("بين")) {
    if (/max|ماكس/i.test(text)) return `bein sports max ${number || "1"}`;
    return `bein sports hd ${number || "1"}`;
  }

  if (/ssc|اس ?اس ?سي/i.test(text)) return `ssc ${number || "1"} hd`;
  if (/on ?time|on ?sport|اون ?تايم|اون ?سبورت|أون ?سبورت/i.test(text) || compact.includes("اونسبورت")) {
    if (/plus|بلس/i.test(text)) return "on sport plus";
    if (/max|ماكس/i.test(text)) return "on sport max";
    return `on time sports ${number || "1"}`;
  }
  if (/arryadia|رياضيه|الرياضيه|المغربيه الرياضيه/i.test(text)) return "arryadia tnt";
  if (/shahid|شاهد/i.test(text)) return "shahid vip";
  if (/mbc/i.test(text)) return "mbc action";
  if (/ad sports|abu dhabi|ابو ظبي|ابوظبي/i.test(text)) return `ad sports premium ${number || "1"}`;

  return text;
}

function channelKeyVariants(value) {
  const text = normalizeChannelName(value);
  const canonical = canonicalChannelName(value);
  const variants = new Set([text, canonical].filter(Boolean));
  if (/on ?sport|اون ?سبورت|أون ?سبورت/i.test(text) && /max|ماكس/i.test(text)) {
    variants.add("on time sports 1");
  }
  return variants;
}

function channelMatches(candidate, requestedName) {
  const candidateKeys = channelKeyVariants(candidate);
  for (const key of channelKeyVariants(requestedName)) {
    if (candidateKeys.has(key)) return true;
  }
  return false;
}

export async function getActiveChannelByName(name) {
  const requestedName = decodeURIComponent(name);
  const local = getLocalChannel(requestedName);
  if (local) return local;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("channels")
    .select("id,name,original_url,active")
    .eq("name", requestedName)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: channels, error: listError } = await supabase
    .from("channels")
    .select("id,name,original_url,active")
    .eq("active", true)
    .limit(2000);

  if (listError) throw listError;
  return (channels || []).find((channel) => channelMatches(channel.name, requestedName)) || null;
}

export async function getChannelLanguageAlternatives(name, matchId = "") {
  const decodedName = decodeURIComponent(name);
  const localAlternatives = getLocalAlternatives(decodedName);
  if (localAlternatives.length) return localAlternatives;

  try {
    const supabase = getSupabaseAdmin();
    if (matchId) {
      const { data, error } = await supabase
        .from("channel_language_alternatives")
        .select("language,channel_name,active")
        .eq("match_id", matchId)
        .eq("active", true);

      if (error) throw error;
      if (data?.length) return data;
    }

    const { data, error } = await supabase
      .from("channel_language_alternatives")
      .select("language,channel_name,active")
      .eq("base_channel_name", decodedName)
      .eq("active", true);

    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export async function auditStreamAccess({ channel, ipHash, userAgent, event }) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("stream_access_audit").insert({
      channel_id: channel?.id || null,
      channel_name: channel?.name || "unknown",
      ip_hash: ipHash || null,
      user_agent: userAgent || null,
      event
    });
  } catch {
    // Audit logging must never break playback.
  }
}
