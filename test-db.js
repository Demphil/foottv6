require('dotenv').config({ path: require('node:path').resolve(process.cwd(), '.env') });
const { getSupabase } = require('./qa-media/supabase');

async function testDatabase() {
  const row = {
    match_id: `__db_test__${Date.now()}`,
    payload: { test: true, createdAt: new Date().toISOString() },
    environment: 'staging'
  };
  const result = await getSupabase()
    .from('media_qa_staging')
    .insert(row)
    .select();

  console.log('[DB TEST] Result:', JSON.stringify(result, null, 2));
  if (result.error) throw new Error(JSON.stringify(result.error));
}

testDatabase().catch((error) => {
  console.error('[DB TEST] Failed:', error.stack || error.message);
  process.exitCode = 1;
});