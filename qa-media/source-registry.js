const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');
const { config } = require('./config');

async function loadSources() {
  const filePath = path.resolve(process.env.MEDIA_QA_SOURCES_FILE || 'qa-media/sources.json');
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  return (data.sources || []).filter((source) => source && source.enabled !== false).map((source) => {
    const listUrl = new URL(source.listUrl);
    if (!['http:', 'https:'].includes(listUrl.protocol)) {
      throw new Error(`Unsupported source URL protocol: ${source.listUrl}`);
    }
    return {
      ...source,
      listUrl: listUrl.href,
      name: String(source.name || '').trim(),
      allowedHosts: Array.isArray(source.allowedHosts)
        ? source.allowedHosts.map((host) => String(host).trim().toLowerCase()).filter(Boolean)
        : []
    };
  }).filter((source) => source.name && source.listUrl);
}

function sourceHosts(sources) {
  return sources.flatMap((source) => [
    new URL(source.listUrl).hostname.toLowerCase(),
    ...(source.allowedHosts || [])
  ]).filter((host, index, hosts) => hosts.indexOf(host) === index);
}

module.exports = { loadSources, sourceHosts };
