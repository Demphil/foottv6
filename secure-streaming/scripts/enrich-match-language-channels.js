import {
  resolveBroadcastChannelsBatchWithGemini,
  resolveBroadcastChannelsWithGemini
} from "../src/lib/geminiChannelResolver.js";
import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const tableArg = process.argv.find((arg) => arg.startsWith("--table="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 25;
const fallbackMatchTables = ["matches", "metascrape_matches", "media_qa_matches", "articles"];
const configuredMatchTables = (tableArg?.split("=")[1] || process.env.SUPABASE_MATCHES_TABLE || "")
  .split(",")
  .map((table) => table.trim())
  .filter(Boolean);
const matchesTables = [...new Set([...configuredMatchTables, ...fallbackMatchTables])];
const alternativesTable = process.env.SUPABASE_CHANNEL_ALTERNATIVES_TABLE || "channel_language_alternatives";
const geminiDelayMs = Number(process.env.GEMINI_REQUEST_DELAY_MS || 7000);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function expandChannelCandidates(candidates) {
  const expanded = [];
  for (const candidate of candidates.filter(Boolean)) {
    expanded.push(candidate);
    const value = String(candidate);
    const number = value.match(/(?:بي\s*إن|bein|beIN|سبورت|sports?)\D*([0-9]+)/i)?.[1];
    if (number) {
      expanded.push(`beIN SPORTS HD ${number}`);
      expanded.push(`beIN Sports ${number} HD`);
      expanded.push(`beIN SPORTS ${number} HD`);
    }
    const onNumber = value.match(/(?:أون|اون|on|time|sport)\D*([0-9]+)/i)?.[1];
    if (/أون|اون|on\s*(time)?\s*sport/i.test(value)) {
      expanded.push(`ON TIME SPORTS ${onNumber || "1"}`);
      expanded.push(`ON SPORT ${onNumber || "1"}`);
    }
    if (/شاهد|shahid/i.test(value)) {
      expanded.push("Shahid VIP");
      expanded.push("MBC Action");
      expanded.push("MBC Shahid");
    }
  }
  return [...new Set(expanded)];
}

function matchPayload(row) {
  const text = [
    row.title,
    row.name,
    row.description,
    row.summary,
    row.content,
    row.body
  ].filter(Boolean).join(" ");
  const parsedTeams = parseTeamsFromText(text);

  return {
    id: row.id || row.match_id || row.slug,
    homeTeam: row.home_team || row.homeTeam || row.team_home || row.home || row.home_name || parsedTeams.homeTeam,
    awayTeam: row.away_team || row.awayTeam || row.team_away || row.away || row.away_name || parsedTeams.awayTeam,
    league: row.league || row.competition || row.tournament || row.category || row.section,
    kickoff: row.kickoff_time || row.match_time || row.time || row.date || row.published_at || row.created_at,
    existingChannel: row.channel || row.channel_name || row.broadcast_channel || row.tv_channel || row.broadcaster,
    source: row.source || row.source_name || row.provider || "metascrape",
    rawText: text.slice(0, 2000)
  };
}

function parseTeamsFromText(text) {
  const value = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) return {};

  const separators = [
    /\s+vs\.?\s+/i,
    /\s+v\s+/i,
    /\s+ضد\s+/i,
    /\s+مقابل\s+/i,
    /\s+[x×]\s+/i,
    /\s+-\s+/
  ];

  for (const separator of separators) {
    const parts = value.split(separator).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        homeTeam: cleanTeamName(parts[0]),
        awayTeam: cleanTeamName(parts[1])
      };
    }
  }

  return {};
}

function cleanTeamName(value) {
  return String(value || "")
    .replace(/^(مباراة|مشاهدة|بث مباشر|live|watch)\s+/i, "")
    .replace(/\s+(اليوم|مباشر|live|online).*$/i, "")
    .trim();
}

function isMissingTable(error) {
  return error?.code === "PGRST205" || /could not find the table/i.test(error?.message || "");
}

async function loadMatches(supabase) {
  const errors = [];

  for (const table of matchesTables) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .limit(limit);

    if (error) {
      if (isMissingTable(error)) {
        errors.push(`${table}: missing`);
        continue;
      }
      errors.push(`${table}: ${error.message}`);
      continue;
    }

    return { table, rows: data || [] };
  }

  throw new Error(`No readable match table found. Checked: ${errors.join("; ")}`);
}

async function findChannelByCandidate(supabase, candidates) {
  const expandedCandidates = expandChannelCandidates(candidates);
  if (!expandedCandidates.length) return null;

  const { data, error } = await supabase
    .from("channels")
    .select("id,name,active")
    .eq("active", true);

  if (error) throw error;
  const channels = data || [];
  const normalizedChannels = channels.map((channel) => ({ ...channel, normalized: normalize(channel.name) }));

  for (const candidate of expandedCandidates) {
    const normalizedCandidate = normalize(candidate);
    const exact = normalizedChannels.find((channel) => channel.normalized === normalizedCandidate);
    if (exact) return exact;
    const partial = normalizedChannels.find((channel) =>
      channel.normalized.includes(normalizedCandidate) || normalizedCandidate.includes(channel.normalized)
    );
    if (partial) return partial;
  }

  return null;
}

async function upsertAlternative(supabase, { baseChannelName, language, channelName, matchId, confidence, notes }) {
  const payload = {
    base_channel_name: baseChannelName,
    language,
    channel_name: channelName,
    source: "gemini",
    match_id: matchId || null,
    confidence,
    notes,
    active: true,
    updated_at: new Date().toISOString()
  };

  if (dryRun) {
    console.log("[dry-run]", payload);
    return;
  }

  const { error } = await supabase
    .from(alternativesTable)
    .upsert(payload, { onConflict: matchId ? "match_id,language" : "base_channel_name,language" });

  if (error) throw error;
}

async function resolveWithRetry(match, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await resolveBroadcastChannelsWithGemini(match);
    } catch (error) {
      lastError = error;
      if (!String(error.message || "").includes("429") || attempt === attempts) break;
      const backoff = geminiDelayMs * attempt;
      console.log(`Gemini rate limit for ${match.id || "match"}; retrying in ${Math.round(backoff / 1000)}s.`);
      await wait(backoff);
    }
  }
  throw lastError;
}

async function main() {
  const supabase = getSupabaseAdmin();
  const { table, rows: matches } = await loadMatches(supabase);
  console.log(`Loaded ${matches.length} matches from ${table}.`);
  const preparedMatches = [];

  for (const row of matches) {
    const match = matchPayload(row);
    const baseChannel = await findChannelByCandidate(supabase, [match.existingChannel]);
    const baseChannelName = baseChannel?.name || match.existingChannel;
    if (!baseChannelName) {
      console.log(`Skipped match ${match.id || "unknown"}: no base channel.`);
      continue;
    }
    preparedMatches.push({ row, match, baseChannelName });
  }

  let batchResults = new Map();
  try {
    batchResults = await resolveBroadcastChannelsBatchWithGemini(preparedMatches.map((item) => item.match));
  } catch (error) {
    console.error(`Gemini batch failed: ${error.message}. Falling back to per-match requests.`);
  }

  for (const { match, baseChannelName } of preparedMatches) {
    try {
      const resolved = batchResults.get(String(match.id || "")) || await resolveWithRetry(match);
      const frChannel = await findChannelByCandidate(supabase, resolved.fr);
      const enChannel = await findChannelByCandidate(supabase, resolved.en);

      if (frChannel) {
        await upsertAlternative(supabase, {
          baseChannelName,
          language: "fr",
          channelName: frChannel.name,
          matchId: match.id,
          confidence: resolved.confidence,
          notes: resolved.notes
        });
      }

      if (enChannel) {
        await upsertAlternative(supabase, {
          baseChannelName,
          language: "en",
          channelName: enChannel.name,
          matchId: match.id,
          confidence: resolved.confidence,
          notes: resolved.notes
        });
      }

      console.log(`Processed ${match.homeTeam || "home"} vs ${match.awayTeam || "away"}: FR=${frChannel?.name || "-"} EN=${enChannel?.name || "-"}`);
      if (!batchResults.size && geminiDelayMs > 0) await wait(geminiDelayMs);
    } catch (error) {
      console.error(`Failed match ${match.id || "unknown"}: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
