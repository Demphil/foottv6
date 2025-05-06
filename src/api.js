// سيتم تشفير هذا الكود بالكامل
const API_KEY = 'actual-api-key-567';

export function fetchData() {
  if (window.__VALID_ORIGIN__ !== 'foottv.info') {
    return null;
  }
  return fetch('https://api.foottv.info/data', {
    headers: { Authorization: API_KEY }
  });
}
