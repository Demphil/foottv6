import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeKoooraBroadcastChannels } from '../../shared/match-channel-link.mjs';
import { onRequestGet } from '../../functions/api/matches.js';

const apiFixture = (overrides = {}) => ({
  match_id: 'api-football_2026-09-30_st_vincent_vs_belize',
  home_team: 'St. Vincent / Grenadines',
  away_team: 'Belize',
  league: 'CONCACAF Nations League',
  kickoff_time: '2026-09-30T20:00:00Z',
  channel: null,
  source: 'api-football',
  payload: { score: '1 - 0', goals: [{ player: 'Player A' }], dataSource: 'api-football' },
  ...overrides
});

const koooraFixture = (overrides = {}) => ({
  match_id: 'kooora_2026-09-30_st_vincent_vs_belize',
  home_team: 'St Vincent Grenadines',
  away_team: 'Belize',
  league: 'CONCACAF Nations League',
  kickoff_time: '2026-09-30T20:08:00Z',
  channel: 'beIN SPORTS HD 2',
  source: 'kooora',
  payload: {
    channels: ['beIN Sports Mena 2', 'beIN SPORTS HD 2'],
    channel: 'beIN SPORTS HD 2',
    sourceMatchId: 'kooora-source-123',
    matchLink: 'https://www.kooora.com/match/123'
  },
  ...overrides
});

test('links verified Kooora channels to the API-Football fixture without changing its details', () => {
  const arabicKoooraFixture = koooraFixture({
    home_team: 'سانت فنسنت وجزر غرينادين',
    away_team: 'بليز'
  });
  const result = mergeKoooraBroadcastChannels([apiFixture()], [arabicKoooraFixture]);
  assert.equal(result.linked, 1);
  assert.equal(result.ambiguous, 0);
  assert.equal(result.rows[0].channel, 'beIN SPORTS HD 2');
  assert.deepEqual(result.rows[0].payload.channels, ['beIN Sports Mena 2', 'beIN SPORTS HD 2']);
  assert.equal(result.rows[0].payload.score, '1 - 0');
  assert.deepEqual(result.rows[0].payload.goals, [{ player: 'Player A' }]);
  assert.equal(result.rows[0].payload.channelResolvedBy, 'kooora-fixture-match');
});

test('does not guess when teams, kickoff, channel data, or uniqueness do not match', () => {
  const api = apiFixture();
  const wrongTeam = koooraFixture({ away_team: 'Honduras' });
  const lateKickoff = koooraFixture({ kickoff_time: '2026-09-30T20:30:00Z' });
  const withoutChannels = koooraFixture({ payload: { channels: [] }, channel: null });
  assert.equal(mergeKoooraBroadcastChannels([api], [wrongTeam]).linked, 0);
  assert.equal(mergeKoooraBroadcastChannels([api], [lateKickoff]).linked, 0);
  assert.equal(mergeKoooraBroadcastChannels([api], [withoutChannels]).linked, 0);

  const ambiguous = mergeKoooraBroadcastChannels([api], [koooraFixture(), koooraFixture({ match_id: 'duplicate' })]);
  assert.equal(ambiguous.linked, 0);
  assert.equal(ambiguous.ambiguous, 1);
  assert.equal(ambiguous.rows[0].channel, null);
});

test('public match API prefers the API-Football row carrying the verified Kooora channel', async () => {
  const rows = [
    {
      home_team: 'Peru', away_team: 'Mexico', league: 'Copa America',
      kickoff_time: '2026-09-30T20:00:00Z', channel: 'beIN SPORTS HD 1', source: 'kooora',
      payload: { score: 'VS', channelSource: 'kooora-live-scores', channels: ['beIN SPORTS HD 1'] }
    },
    {
      home_team: 'Peru', away_team: 'Mexico', league: 'Copa America',
      kickoff_time: '2026-09-30T20:00:00Z', channel: null, source: 'api-football',
      payload: { score: '0 - 1', goals: [{ player: 'Player B' }] }
    },
    {
      home_team: 'Chelsea Women', away_team: 'Arsenal Women', league: "UEFA Women's Champions League",
      kickoff_time: '2026-09-30T20:00:00Z', channel: 'beIN SPORTS HD 2', source: 'api-football', payload: {}
    }
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    const response = await onRequestGet({
      request: new Request('https://frajatv.fun/api/matches'),
      env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-key' }
    });
    const body = await response.json();
    assert.equal(body.matches.length, 1);
    assert.equal(body.matches[0].source, 'api-football');
    assert.equal(body.matches[0].channel, 'beIN SPORTS HD 1');
    assert.deepEqual(body.matches[0].channels, ['beIN SPORTS HD 1']);
    assert.equal(body.matches[0].score, '0 - 1');
    assert.deepEqual(body.matches[0].goals, [{ player: 'Player B' }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
