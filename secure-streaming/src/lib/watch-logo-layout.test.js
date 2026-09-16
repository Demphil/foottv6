import assert from "node:assert/strict";
import test from "node:test";
import { BEIN_LOGO_RECT, videoContentRect, mapWatchLogo, prepareWatchTemplate, matchWatchLogo } from "./watch-logo-layout.js";

test("watch logo follows source coordinates on desktop, portrait, landscape and fullscreen", () => {
  for (const [width, height] of [[1280, 720], [390, 700], [844, 390], [1920, 1080], [2560, 1080]]) {
    const parent = { left: 170, top: 90, width, height };
    const content = videoContentRect(parent, 1920, 1080);
    const result = mapWatchLogo(BEIN_LOGO_RECT, content, parent, width, height);
    assert.ok(Math.abs((result.left + parent.left - content.left) / content.width - BEIN_LOGO_RECT.left) < 1e-9);
    assert.ok(Math.abs((result.top + parent.top - content.top) / content.height - BEIN_LOGO_RECT.top) < 1e-9);
    assert.ok(Math.abs(result.width / content.width - BEIN_LOGO_RECT.width) < 1e-9);
    assert.ok(result.top > (content.top - parent.top) + content.height * 0.06, "LIVE above the channel logo remains uncovered");
  }
});

test("fullscreen uses the overlay parent rather than the old page offset", () => {
  const content = videoContentRect({ left: 0, top: 0, width: 1920, height: 1080 }, 1920, 1080);
  assert.equal(mapWatchLogo(BEIN_LOGO_RECT, content, content, 1920, 1080).left, 1920 * BEIN_LOGO_RECT.left);
});

test("CSS transforms are converted back to the overlay coordinate space", () => {
  const parent = { left: 100, top: 50, width: 640, height: 360 };
  const result = mapWatchLogo(BEIN_LOGO_RECT, parent, parent, 1280, 720);
  assert.equal(result.width, 1280 * BEIN_LOGO_RECT.width);
  assert.equal(result.top, 720 * BEIN_LOGO_RECT.top);
});

test("template matching rejects a featureless bright area", () => {
  const template = prepareWatchTemplate(new Float32Array([0, 200, 0, 200, 0, 200]), 3, 2, "test");
  assert.equal(matchWatchLogo(new Float32Array(420 * 236).fill(255), 420, 236, [template], BEIN_LOGO_RECT), null);
});

test("template matching locates the whole graphic rather than a nearby bright area", () => {
  const pixels = new Float32Array([10, 210, 25, 190, 240, 30, 220, 45, 15, 170, 50, 250]);
  const template = prepareWatchTemplate(pixels, 4, 3, "test");
  const image = new Float32Array(420 * 236).fill(70);
  for (let y = 0; y < 3; y += 1) for (let x = 0; x < 4; x += 1) image[(17 + y) * 420 + 355 + x] = pixels[y * 4 + x];
  const result = matchWatchLogo(image, 420, 236, [template], BEIN_LOGO_RECT);
  assert.ok(result.confidence > 0.99);
  assert.equal(result.left, 354.5 / 420);
  assert.equal(result.top, BEIN_LOGO_RECT.top);
});
