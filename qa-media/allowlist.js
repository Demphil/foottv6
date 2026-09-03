const fs = require('node:fs/promises');
const path = require('node:path');
const { config, list } = require('./config');
const { getSupabase } = require('./supabase');

/**
 * دالة التحقق من النطاق ودعم النطاقات الفرعية (Subdomains)
 * مثال: 21.yallalives.fun تُطابق yallalives.fun
 */
function isHostAllowed(hostname, allowedHosts = []) {
  if (!hostname) return false;
  const host = hostname.toLowerCase().trim();

  return allowedHosts.some((allowed) => {
    const cleanAllowed = allowed.toLowerCase().trim();
    if (!cleanAllowed) return false;
    return host === cleanAllowed || host.endsWith('.' + cleanAllowed);
  });
}

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
  let allowlistData = null;
  try {
    const supabaseList = await fromSupabase();
    if (supabaseList?.sourceHosts.length) {
      allowlistData = supabaseList;
    }
  } catch (error) {
    console.warn(`Allowlist Supabase unavailable: ${error.message}`);
  }

  if (!allowlistData) {
    allowlistData = await fromFile();
  }

  // إضافة دالة مساعدة للتحقق المباشر مع دعم الـ Subdomains
  allowlistData.isAllowed = (urlOrHost, listType = 'sourceHosts') => {
    let hostname = urlOrHost;
    try {
      if (typeof urlOrHost === 'string' && (urlOrHost.startsWith('http://') || urlOrHost.startsWith('https://'))) {
        hostname = new URL(urlOrHost).hostname;
      }
    } catch {
      return false;
    }

    const targetList = listType === 'mediaHosts' ? allowlistData.mediaHosts : allowlistData.sourceHosts;
    return isHostAllowed(hostname, targetList);
  };

  return allowlistData;
}

module.exports = { loadAllowlist, isHostAllowed };