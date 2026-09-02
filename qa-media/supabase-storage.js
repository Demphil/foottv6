const { config } = require('./config');
const { getSupabase } = require('./supabase');

async function saveStaging(matchId, payload) {
  const { error } = await getSupabase().from(config.stagingCollection).upsert({
    match_id: matchId,
    payload,
    environment: 'staging',
    updated_at: new Date().toISOString()
  }, { onConflict: 'match_id' });
  if (error) throw error;
}

module.exports = { saveStaging };
