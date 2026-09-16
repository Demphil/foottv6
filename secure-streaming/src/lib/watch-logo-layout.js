export const BEIN_LOGO_RECT = { left: 0.843, top: 0.07, width: 0.108, height: 0.03 };

export function watchLogoAnchor(channelName) {
  return /bein/i.test(channelName)
    ? BEIN_LOGO_RECT
    : { left: 0.835, top: 0.083, width: 0.135, height: 0.04 };
}

export function videoContentRect(box, videoWidth, videoHeight, fit = "contain") {
  if (fit === "fill") return { ...box };
  const scale = (fit === "cover" ? Math.max : Math.min)(box.width / videoWidth, box.height / videoHeight);
  const width = videoWidth * scale;
  const height = videoHeight * scale;
  return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height };
}

export function mapWatchLogo(rect, videoBox, parentBox, parentWidth, parentHeight) {
  const scaleX = parentWidth / parentBox.width;
  const scaleY = parentHeight / parentBox.height;
  return {
    left: (videoBox.left + rect.left * videoBox.width - parentBox.left) * scaleX,
    top: (videoBox.top + rect.top * videoBox.height - parentBox.top) * scaleY,
    width: rect.width * videoBox.width * scaleX,
    height: rect.height * videoBox.height * scaleY
  };
}

export function logoLuminance(rgba) {
  const result = new Float32Array(rgba.length / 4);
  for (let i = 0; i < result.length; i += 1) {
    result[i] = rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114;
  }
  return result;
}

export function prepareWatchTemplate(luma, width, height, id) {
  const mean = luma.reduce((sum, value) => sum + value, 0) / luma.length;
  const centered = Float32Array.from(luma, value => value - mean);
  const energy = centered.reduce((sum, value) => sum + value * value, 0);
  return { centered, energy, width, height, id };
}

export function matchWatchLogo(luma, width, height, templates, anchor) {
  let best = null;
  // Compare the complete light/dark pattern, not just bright pixels in the crowd.
  for (const template of templates) {
    if (template.energy < 1) continue;
    const left = Math.max(0, Math.floor((anchor.left - 0.025) * width));
    const right = Math.min(width - template.width, Math.ceil((anchor.left + 0.025) * width));
    const top = Math.max(0, Math.floor((anchor.top - 0.018) * height));
    const bottom = Math.min(height - template.height, Math.ceil((anchor.top + 0.018) * height));
    const count = template.width * template.height;
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        let sum = 0;
        let squares = 0;
        let dot = 0;
        for (let ty = 0; ty < template.height; ty += 1) {
          for (let tx = 0; tx < template.width; tx += 1) {
            const value = luma[(y + ty) * width + x + tx];
            sum += value;
            squares += value * value;
            dot += value * template.centered[ty * template.width + tx];
          }
        }
        const variance = squares - sum * sum / count;
        const score = variance > 1 ? dot / Math.sqrt(variance * template.energy) : 0;
        if (score >= 0.65 && (!best || score > best.confidence)) {
          const coverTop = Math.max(anchor.top, (y - 0.5) / height);
          best = {
            left: (x - 0.5) / width,
            top: coverTop,
            width: (template.width + 1) / width,
            height: (y + template.height + 0.5) / height - coverTop,
            confidence: score,
            templateId: template.id
          };
        }
      }
    }
  }
  return best;
}
