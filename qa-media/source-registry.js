const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');
const { config } = require('./config');

const DISABLED_SOURCES = new Set(['livehd77']);
const DEFAULT_SOURCE_TIME_ZONE = 'Africa/Casablanca';

async function loadSources() {
  const filePath = path.resolve(process.env.MEDIA_QA_SOURCES_FILE || 'qa-media/sources.json');
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  return (data.sources || []).filter((source) => source && source.enabled !== false)
    .filter((source) => !DISABLED_SOURCES.has(String(source.name || '').trim().toLowerCase()))
    .map((source) => {
    const listUrl = new URL(source.listUrl);
    if (!['http:', 'https:'].includes(listUrl.protocol)) {
      throw new Error(`Unsupported source URL protocol: ${source.listUrl}`);
    }
    return {
      ...source,
      listUrl: listUrl.href,
      name: String(source.name || '').trim(),
      timeZone: String(source.timeZone || DEFAULT_SOURCE_TIME_ZONE).trim(),
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

function matchPageHosts(source) {
  if (!source || typeof source !== 'object') return [];

  const configured = source.matchPageHosts;
  let hosts = configured;
  if (typeof configured === 'function') {
    try {
      hosts = configured(source);
    } catch {
      hosts = [];
    }
  }

  if (typeof hosts === 'string') hosts = [hosts];
  if (!hosts || typeof hosts[Symbol.iterator] !== 'function') hosts = [];

  return [...hosts, ...(Array.isArray(source.allowedHosts) ? source.allowedHosts : [])]
    .map((host) => String(host).trim().toLowerCase())
    .filter(Boolean)
    .filter((host, index, values) => values.indexOf(host) === index);
}

module.exports = { loadSources, sourceHosts, matchPageHosts, DISABLED_SOURCES, DEFAULT_SOURCE_TIME_ZONE };
