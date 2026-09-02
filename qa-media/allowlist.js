const fs = require('node:fs/promises');
const path = require('node:path');
const { config, list } = require('./config');
const { getSupabase } = require('./supabase');

async function fromFile() {
  const filePath = path.resolve(config.allowlistFile);
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  return { sourceHosts: list(data.sourceHosts), mediaHosts: list(data.mediaHosts) };
}

async function fromSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { data, error } = await getSupabase().from(config.allowlistCollection).select('host, source_hosts, media_hosts').eq('enabled', true);
  if (error) throw error;
  const sourceHosts = [];
  const mediaHosts = [];
  data.forEach((row) => {
    sourceHosts.push(...list(row.source_hosts || row.host));
    mediaHosts.push(...list(row.media_hosts));
  });
  return { sourceHosts, mediaHosts };
}

async function loadAllowlist() {
  try {
    const supabaseList = await fromSupabase();
    if (supabaseList?.sourceHosts.length) return supabaseList;
  } catch (error) {
    console.warn(`Allowlist Supabase unavailable: ${error.message}`);
  }
  return fromFile();
}

module.exports = { loadAllowlist };
