import { teamIdentity } from './match-broadcasts.mjs';

const MAX_KICKOFF_DIFFERENCE_MS = 15 * 60 * 1000;

function teamPair(row) {
  const teams = [row?.home_team, row?.away_team]
    .map((name) => String(name || '').trim() ? teamIdentity(name) : '');
  if (teams.some((name) => !name)) return '';
  return teams.sort().join('|');
}

function channelNames(row) {
  const names = Array.isArray(row?.payload?.channels) ? row.payload.channels : [];
  return [...new Set(names.filter((name) => typeof name === 'string').map((name) => name.trim()).filter(Boolean))];
}

export function mergeKoooraBroadcastChannels(apiRows, koooraRows, maxDifferenceMs = MAX_KICKOFF_DIFFERENCE_MS) {
  let linked = 0;
  let ambiguous = 0;

  const rows = apiRows.map((apiRow) => {
    const apiTeams = teamPair(apiRow);
    const apiKickoff = Date.parse(apiRow?.kickoff_time);
    if (!apiTeams || !Number.isFinite(apiKickoff)) return apiRow;

    const candidates = koooraRows.filter((koooraRow) => {
      if (!channelNames(koooraRow).length || teamPair(koooraRow) !== apiTeams) return false;
      const koooraKickoff = Date.parse(koooraRow?.kickoff_time);
      return Number.isFinite(koooraKickoff) && Math.abs(koooraKickoff - apiKickoff) <= maxDifferenceMs;
    });

    if (candidates.length !== 1) {
      if (candidates.length > 1) ambiguous += 1;
      return apiRow;
    }

    const koooraRow = candidates[0];
    const channels = channelNames(koooraRow);
    const channel = String(koooraRow.channel || koooraRow.payload?.channel || channels[0] || '').trim();
    if (!channel) return apiRow;

    linked += 1;
    return {
      ...apiRow,
      channel,
      payload: {
        ...(apiRow.payload || {}),
        channels,
        channel,
        channelSource: 'kooora-live-scores',
        channelResolvedBy: 'kooora-fixture-match',
        channelMatchConfidence: 'exact-teams-and-kickoff',
        koooraSourceMatchId: koooraRow.payload?.sourceMatchId || koooraRow.match_id || '',
        koooraMatchLink: koooraRow.payload?.matchLink || ''
      }
    };
  });

  return { rows, linked, ambiguous };
}
