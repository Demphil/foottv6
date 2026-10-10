const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({ URL });
vm.runInContext(fs.readFileSync('assets/js/news-images.js', 'utf8').replace('export function', 'function') + '; this.resolveImages = newsImageCandidates;', context);
const images = article => Array.from(context.resolveImages(article, 'https://fraja.online', html => ({ querySelectorAll: () => [{ getAttribute: key => key === 'src' ? html : null }] })));
test('RSS images are used without downloading a repeated site logo', () => {
  assert.deepEqual(images({ thumbnail: 'https://publisher.test/photo.jpg' }), ['https://publisher.test/photo.jpg']);
  assert.deepEqual(images({}), []);
});
test('relative article images resolve and deduplicate', () => {
  assert.deepEqual(images({ link: 'https://publisher.test/story', thumbnail: '/photo.jpg', content: '/photo.jpg' }), ['https://publisher.test/photo.jpg']);
});
test('unsafe URLs and video attachments are rejected', () => {
  assert.deepEqual(images({ thumbnail: 'javascript:alert(1)', image: 'https://secret:password@publisher.test/photo.jpg', enclosure: { link: 'https://publisher.test/video.mp4', type: 'video/mp4' }, content: 'data:text/html,test' }), []);
});
