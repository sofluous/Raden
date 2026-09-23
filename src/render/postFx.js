/* Raden post-processing helpers (Architecture Phase E)
 * Exposed via window.RadenPostFx for compatibility with the static app shell.
 */
(function registerRadenPostFx(global) {
  function clampByte(value) {
    return Math.min(255, Math.max(0, value));
  }

  function applyGrainOverlay(ctx, width, height) {
    const grainImage = ctx.getImageData(0, 0, width, height);
    const data = grainImage.data;

    for (let i = 0; i < data.length; i += 4) {
      const grain = Math.floor((Math.random() - 0.5) * 20);
      data[i] = clampByte(data[i] + grain);
      data[i + 1] = clampByte(data[i + 1] + grain);
      data[i + 2] = clampByte(data[i + 2] + grain);
    }

    ctx.putImageData(grainImage, 0, 0);
  }

  function applyGaussianBlurOverlay(ctx, sourceCanvas, blurAmount, alpha = 0.75) {
    if (!blurAmount || blurAmount <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.filter = `blur(${blurAmount}px)`;
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = "none";
  }

  function applyExperimentalEffects(ctx, canvas, config) {
    const fxInvert = config.fxInvert;
    const fxChromatic = config.fxChromatic || 0;
    const fxGlitch = config.fxGlitch || 0;
    const fxScanline = config.fxScanline || 0;
    const width = canvas.width;
    const height = canvas.height;

    if (fxChromatic > 0.05) {
      const src = ctx.getImageData(0, 0, width, height);
      const out = ctx.createImageData(width, height);
      const srcData = src.data;
      const outData = out.data;
      const shift = Math.max(1, Math.round(fxChromatic));
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const xr = Math.min(width - 1, x + shift);
          const xb = Math.max(0, x - shift);
          const ir = (y * width + xr) * 4;
          const ib = (y * width + xb) * 4;
          outData[i] = srcData[ir];
          outData[i + 1] = srcData[i + 1];
          outData[i + 2] = srcData[ib + 2];
          outData[i + 3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0);
    }

    if (fxGlitch > 0.01) {
      const maxSlices = Math.max(1, Math.floor(6 + fxGlitch * 28));
      const maxShift = Math.max(
        1,
        Math.floor(width * (0.002 + fxGlitch * 0.03)),
      );
      for (let s = 0; s < maxSlices; s++) {
        const bandH = Math.max(
          1,
          Math.floor(2 + Math.random() * (8 + fxGlitch * 24)),
        );
        const y = Math.floor(Math.random() * Math.max(1, height - bandH));
        const shift = Math.floor((Math.random() * 2 - 1) * maxShift);
        if (shift === 0) continue;
        ctx.drawImage(canvas, 0, y, width, bandH, shift, y, width, bandH);
      }
    }

    if (fxScanline > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.7, fxScanline * 0.45);
      ctx.fillStyle = "#000";
      for (let y = 0; y < height; y += 2) {
        ctx.fillRect(0, y, width, 1);
      }
      ctx.restore();
    }

    if (fxInvert) {
      const img = ctx.getImageData(0, 0, width, height);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
      ctx.putImageData(img, 0, 0);
    }
  }

  function applyColorBoosts(ctx, originalImageData, boosts) {
    if (!originalImageData) return null;
    const options = boosts || {};
    const boostR = options.boostR ?? 1;
    const boostG = options.boostG ?? 1;
    const boostB = options.boostB ?? 1;
    const width = originalImageData.width;
    const height = originalImageData.height;
    const originalData = originalImageData.data;
    const newImageData = ctx.createImageData(width, height);
    const newData = newImageData.data;

    for (let i = 0; i < originalData.length; i += 4) {
      newData[i] = clampByte(originalData[i] * boostR);
      newData[i + 1] = clampByte(originalData[i + 1] * boostG);
      newData[i + 2] = clampByte(originalData[i + 2] * boostB);
      newData[i + 3] = originalData[i + 3];
    }

    ctx.putImageData(newImageData, 0, 0);
    return newImageData;
  }

  global.RadenPostFx = Object.assign({}, global.RadenPostFx || {}, {
    applyGrainOverlay,
    applyGaussianBlurOverlay,
    applyExperimentalEffects,
    applyColorBoosts,
  });
})(window);
