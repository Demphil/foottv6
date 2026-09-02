const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');

function clean(value) {
  return String(value || '').replace(/\\/g, '').trim();
}

async function channelPageForName(channel) {
  if (!channel) return null;
  const source = await fs.readFile(path.resolve('assets/js/streams.js'), 'utf8');
  const escaped = String(channel).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`['"]${escaped}['"]\\s*:\\s*['"]https://koralive\\.football/([^/'"]+)/`, 'i'));
  if (!match) return null;
  const filePath = path.resolve(match[1], 'index.html');
  try {
    return { page: filePath, pageName: match[1] };
  } catch {
    return null;
  }
}

async function extractChannelLinks(channel) {
  const pageInfo = await channelPageForName(channel);
  if (!pageInfo) return [];
  let html;
  try {
    html = await fs.readFile(pageInfo.page, 'utf8');
  } catch {
    return [];
  }
  const links = [];
  const iframePattern = /<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(iframePattern)) {
    const url = clean(match[1]);
    if (!/^https?:\/\//i.test(url)) continue;
    try {
      new URL(url);
      links.push({ url, page: pageInfo.pageName, type: 'iframe' });
    } catch {}
  }
  return [...new Map(links.map((item) => [item.url, item])).values()];
}

module.exports = { extractChannelLinks };
