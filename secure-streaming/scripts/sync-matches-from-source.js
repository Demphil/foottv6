import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";

const BASE_SITE_URL = process.env.MATCH_SOURCE_URL || "https://jsportlive.com";
const matchesTable = process.env.SUPABASE_MATCHES_TABLE || "matches";
const dryRun = process.argv.includes("--dry-run");

function moroccoDateParts(offsetDays = 0) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function convertSourceToMoroccoTime(timeString) {
  if (!timeString || !timeString.includes(":")) {
    return { formatted: timeString || "", rawMinutes: null };
  }

  const cleanedString = timeString.replace(/\s+/g, " ").trim();
  const [timePart, ampm] = cleanedString.split(" ");
  let [hours, minutes] = timePart.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return { formatted: timeString, rawMinutes: null };
  }

  if (ampm) {
    if (ampm.toUpperCase().includes("PM") && hours !== 12) hours += 12;
    if (ampm.toUpperCase().includes("AM") && hours === 12) hours = 0;
  }

  hours -= Number(process.env.MATCH_SOURCE_UTC_OFFSET_DELTA || 2);
  if (hours < 0) hours += 24;

  return {
    formatted: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    rawMinutes: hours * 60 + minutes
  };
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function loadManualChannelMap() {
  const filePath = path.resolve(process.cwd(), "../assets/js/chaine.js");
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8");
  const block = text.match(/matchesData\s*=\s*`([\s\S]*?)`/)?.[1] || "";
  return block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line.includes(":"))
    .map((line) => {
      const [teams, ...channelParts] = line.split(":");
      const [home, away] = teams.split(/[×xX]| ضد | vs /i).map((item) => item.trim());
      return { home, away, channel: channelParts.join(":").trim() };
    })
    .filter((item) => item.home && item.channel);
}

const manualChannelMap = loadManualChannelMap();

function fallbackChannel(homeTeam, awayTeam) {
  const home = String(homeTeam || "").trim();
  const away = String(awayTeam || "").trim();
  const found = manualChannelMap.find((item) =>
    [item.home, item.away].some((team) => team && (home.includes(team) || away.includes(team) || team.includes(home) || team.includes(away)))
  );
  return found?.channel || "";
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 KoraLive metascrape/1.0",
      "accept": "text/html,application/xhtml+xml"
    }
  });
  if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${url}`);
  return response.text();
}

function parseMatches(html, dayOffset) {
  const $ = cheerio.load(html);
  const rows = [];
  const date = moroccoDateParts(dayOffset);

  $(".AY_Match").each((_, element) => {
    const matchEl = $(element);
    const homeTeam = matchEl.find(".MT_Team.TM1 .TM_Name").first().text().trim();
    const awayTeam = matchEl.find(".MT_Team.TM2 .TM_Name").first().text().trim();
    if (!homeTeam || !awayTeam) return;

    const scoreValues = matchEl.find(".MT_Result .RS-goals").map((__, item) => $(item).text().trim()).get();
    const score = scoreValues.length === 2 && scoreValues.every((value) => /^\d+$/.test(value))
      ? `${scoreValues[0]} - ${scoreValues[1]}`
      : "VS";
    const time = convertSourceToMoroccoTime(matchEl.find(".MT_Time").first().text().trim());
    const infoItems = matchEl.find(".MT_Info ul li").map((__, item) => $(item).text().trim()).get();
    const sourceChannel = infoItems[0] || "";
    const channel = sourceChannel && !/غير معروف|unknown|غير محدد/i.test(sourceChannel)
      ? sourceChannel
      : fallbackChannel(homeTeam, awayTeam);
    const league = infoItems[infoItems.length - 1] || "League";
    const commentator = infoItems[1] || "";
    const matchId = `${slugify(homeTeam)}_vs_${slugify(awayTeam)}`;

    rows.push({
      id: `${date}_${matchId}`,
      match_id: matchId,
      home_team: homeTeam,
      away_team: awayTeam,
      league,
      kickoff_time: time.formatted && time.formatted.includes(":") ? `${date}T${time.formatted}:00+01:00` : null,
      channel: channel || null,
      source: "metascrape",
      active: true,
      payload: {
        score,
        time: time.formatted,
        commentator: /غير معروف|unknown/i.test(commentator) ? "" : commentator,
        matchLink: matchEl.find("a").first().attr("href") || "",
        sourceChannel
      },
      updated_at: new Date().toISOString()
    });
  });

  return rows;
}

async function main() {
  const pages = [
    { url: `${BASE_SITE_URL}/`, dayOffset: 0 },
    { url: `${BASE_SITE_URL}/matches-tomorrow/`, dayOffset: 1 }
  ];
  const rows = [];

  for (const page of pages) {
    try {
      const html = await fetchHtml(page.url);
      rows.push(...parseMatches(html, page.dayOffset));
    } catch (error) {
      console.error(`Failed source ${page.url}: ${error.message}`);
    }
  }

  const uniqueRows = [...new Map(rows.map((row) => [row.id, row])).values()];
  console.log(`Parsed ${uniqueRows.length} matches from ${BASE_SITE_URL}.`);

  if (dryRun || !uniqueRows.length) {
    for (const row of uniqueRows.slice(0, 10)) {
      console.log(`[dry-run] ${row.home_team} vs ${row.away_team} channel=${row.channel || "-"}`);
    }
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from(matchesTable)
    .upsert(uniqueRows, { onConflict: "id" });

  if (error) throw error;
  console.log(`Upserted ${uniqueRows.length} matches into ${matchesTable}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
