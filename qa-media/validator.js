const axios = require('axios');
const { config, assertAllowed } = require('./config');

async function validateStream(url, allowlist) {
  const result = { url, status: 'Failed', code: null, error: null, type: null };
  try {
    if (allowlist.mediaHosts.length && !allowlist.mediaHosts.includes(new URL(url).hostname.toLowerCase())) {
      throw new Error('Media host is not in the runtime allowlist');
    }
    const response = await axios.get(url, {
      timeout: config.timeoutMs,
      responseType: 'text',
      maxContentLength: 1024 * 1024,
      validateStatus: () => true,
      headers: { Accept: '*/*', 'User-Agent': 'Media-Integration-QA/1.0' }
    });
    result.code = response.status;
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    const body = String(response.data || '');
    const isHls = /\.m3u8(?:$|[?#])/i.test(url);
    if (isHls && !body.includes('#EXTM3U')) throw new Error('Missing #EXTM3U header');
    result.type = isHls ? 'hls' : 'mp4';
    result.status = 'Passed';
  } catch (error) {
    result.error = error.message;
  }
  return result;
}

async function validateStreams(urls, allowlist) {
  const report = [];
  for (const url of [...new Set(urls)]) report.push(await validateStream(url, allowlist));
  const passed = report.filter((item) => item.status === 'Passed').slice(0, config.maxStreams);
  return { report, passed };
}

module.exports = { validateStream, validateStreams };
