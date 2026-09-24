/* Raden post-processing helpers (Architecture Phase E)
 * Exposed via window.RadenPostFx for compatibility with the static app shell.
 */
(function registerRadenPostFx(global) {
  function clampByte(value) {
    return Math.min(255, Math.max(0, value));
  }

  function getEffectConfig(effectId, config, extras) {
    if (global.RadenEffects?.mergeEffectConfig) {
      return global.RadenEffects.mergeEffectConfig(effectId, config, extras);
    }
    return Object.assign({}, config || {}, extras || {});
  }

  function applyGrainOverlay(ctx, width, height, opts) {
    const options = opts || {};
    const amount = Math.max(0, Number(options.amount ?? options.grainAmount ?? 0.35));
    const size = Math.max(1, Math.round(Number(options.size ?? options.grainSize ?? 1)));
    const contrast = Math.max(0, Number(options.contrast ?? options.grainContrast ?? 1));
    const monochrome = options.monochrome ?? options.grainMonochrome ?? true;
    if (amount <= 0) return;
    const grainImage = ctx.getImageData(0, 0, width, height);
    const data = grainImage.data;
    const strength = 48 * amount * contrast;

    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const grain = (Math.random() - 0.5) * strength;
        const grainR = monochrome ? grain : (Math.random() - 0.5) * strength;
        const grainG = monochrome ? grain : (Math.random() - 0.5) * strength;
        const grainB = monochrome ? grain : (Math.random() - 0.5) * strength;
        for (let yy = y; yy < Math.min(height, y + size); yy++) {
          for (let xx = x; xx < Math.min(width, x + size); xx++) {
            const i = (yy * width + xx) * 4;
            data[i] = clampByte(data[i] + grainR);
            data[i + 1] = clampByte(data[i + 1] + grainG);
            data[i + 2] = clampByte(data[i + 2] + grainB);
          }
        }
      }
    }

    ctx.putImageData(grainImage, 0, 0);
  }

  function applyScanlineOverlay(ctx, canvas, opts) {
    const options = opts || {};
    const opacity = Math.max(0, Math.min(1, Number(options.opacity ?? options.scanlineOpacity ?? options.fxScanline ?? 0)));
    if (opacity <= 0) return;
    const width = canvas.width;
    const height = canvas.height;
    const density = Math.max(2, Math.round(Number(options.density ?? options.scanlineDensity ?? 2)));
    const lineWidth = Math.max(1, Math.round(Number(options.width ?? options.scanlineWidth ?? 1)));
    const orientation = options.orientation || options.scanlineOrientation || "horizontal";
    const softness = Math.max(0, Math.min(1, Number(options.softness ?? options.scanlineSoftness ?? 0)));
    ctx.save();
    ctx.globalAlpha = Math.min(0.85, opacity);
    ctx.fillStyle = "#000";
    if (orientation === "vertical") {
      for (let x = 0; x < width; x += density) {
        ctx.fillRect(x, 0, lineWidth, height);
        if (softness > 0) {
          ctx.globalAlpha = Math.min(0.35, opacity * softness);
          ctx.fillRect(x + lineWidth, 0, 1, height);
          ctx.globalAlpha = Math.min(0.85, opacity);
        }
      }
    } else {
      for (let y = 0; y < height; y += density) {
        ctx.fillRect(0, y, width, lineWidth);
        if (softness > 0) {
          ctx.globalAlpha = Math.min(0.35, opacity * softness);
          ctx.fillRect(0, y + lineWidth, width, 1);
          ctx.globalAlpha = Math.min(0.85, opacity);
        }
      }
    }
    ctx.restore();
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
      applyScanlineOverlay(ctx, canvas, { fxScanline: Math.min(0.7, fxScanline * 0.45) });
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

  function cloneImageData(ctx, imageData) {
    const copy = ctx.createImageData(imageData.width, imageData.height);
    copy.data.set(imageData.data);
    return copy;
  }

  function applyColorBoostsToImageData(imageData, boosts) {
    const options = boosts || {};
    const boostR = options.boostR ?? 1;
    const boostG = options.boostG ?? 1;
    const boostB = options.boostB ?? 1;
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = clampByte(data[i] * boostR);
      data[i + 1] = clampByte(data[i + 1] * boostG);
      data[i + 2] = clampByte(data[i + 2] * boostB);
    }
    return imageData;
  }

  function applyGrainToImageData(imageData, opts) {
    const options = opts || {};
    const amount = Math.max(0, Number(options.amount ?? options.grainAmount ?? 0.35));
    const size = Math.max(1, Math.round(Number(options.size ?? options.grainSize ?? 1)));
    const contrast = Math.max(0, Number(options.contrast ?? options.grainContrast ?? 1));
    const monochrome = options.monochrome ?? options.grainMonochrome ?? true;
    if (amount <= 0) return imageData;
    const { width, height, data } = imageData;
    const strength = 48 * amount * contrast;
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const grain = (Math.random() - 0.5) * strength;
        const grainR = monochrome ? grain : (Math.random() - 0.5) * strength;
        const grainG = monochrome ? grain : (Math.random() - 0.5) * strength;
        const grainB = monochrome ? grain : (Math.random() - 0.5) * strength;
        for (let yy = y; yy < Math.min(height, y + size); yy++) {
          for (let xx = x; xx < Math.min(width, x + size); xx++) {
            const i = (yy * width + xx) * 4;
            data[i] = clampByte(data[i] + grainR);
            data[i + 1] = clampByte(data[i + 1] + grainG);
            data[i + 2] = clampByte(data[i + 2] + grainB);
          }
        }
      }
    }
    return imageData;
  }

  function applyInvertToImageData(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
    return imageData;
  }

  function applyChromaticToImageData(ctx, imageData, amount) {
    const fxChromatic = Number(amount) || 0;
    if (fxChromatic <= 0.05) return imageData;
    const { width, height } = imageData;
    const out = ctx.createImageData(width, height);
    const srcData = imageData.data;
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
        outData[i + 3] = srcData[i + 3];
      }
    }
    return out;
  }

  function applyGlitchOverlay(ctx, canvas, amount) {
    const fxGlitch = Number(amount) || 0;
    if (fxGlitch <= 0.01) return;
    const width = canvas.width;
    const height = canvas.height;
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

  function getScanlineLayerConfig(config) {
    const effectConfig = getEffectConfig("scanline", config);
    const amount = Math.max(0, Math.min(1, Number(effectConfig.fxScanline ?? 1)));
    const opacity = Math.max(0, Math.min(1, Number(effectConfig.scanlineOpacity ?? 0.25)));
    return Object.assign({}, effectConfig, {
      opacity: amount * opacity,
    });
  }

  function createFxRuntime(ctx, canvas, baseImageData, options) {
    let buffer = cloneImageData(ctx, baseImageData);
    let bufferDirty = true;

    const flushBuffer = () => {
      if (!bufferDirty) return;
      ctx.putImageData(buffer, 0, 0);
      bufferDirty = false;
    };

    return {
      ctx,
      canvas,
      fallbackConfig: options?.fallbackConfig || {},
      blurAlpha: options?.blurAlpha ?? 0.75,
      chunkRows: options?.chunkRows || 64,
      get buffer() {
        return buffer;
      },
      set buffer(nextBuffer) {
        buffer = nextBuffer;
      },
      markDirty() {
        bufferDirty = true;
      },
      markClean() {
        bufferDirty = false;
      },
      flushBuffer,
      captureCanvasToBuffer() {
        buffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
        bufferDirty = false;
      },
    };
  }

  const SYNC_EFFECT_PROCESSORS = {
    postFx(effect, runtime) {
      const effectConfig = getEffectConfig("postFx", runtime.fallbackConfig, effect.config || {});
      runtime.buffer = applyColorBoostsToImageData(runtime.buffer, effectConfig);
      if (effectConfig.gaussianBlur > 0) {
        runtime.flushBuffer();
        applyGaussianBlurOverlay(runtime.ctx, runtime.canvas, effectConfig.gaussianBlur, runtime.blurAlpha);
        runtime.captureCanvasToBuffer();
      }
      if (effectConfig.grain || effectConfig.grainToggle) {
        runtime.buffer = applyGrainToImageData(runtime.buffer, effectConfig);
        runtime.markDirty();
      }
      if (effectConfig.fxChromatic > 0.05) {
        runtime.buffer = applyChromaticToImageData(runtime.ctx, runtime.buffer, effectConfig.fxChromatic);
        runtime.markDirty();
      }
      if (effectConfig.fxGlitch > 0.01) {
        runtime.flushBuffer();
        applyGlitchOverlay(runtime.ctx, runtime.canvas, effectConfig.fxGlitch);
        runtime.captureCanvasToBuffer();
      }
      if (effectConfig.fxScanline > 0.01) {
        runtime.flushBuffer();
        applyScanlineOverlay(runtime.ctx, runtime.canvas, { fxScanline: Math.min(0.7, effectConfig.fxScanline * 0.45) });
        runtime.captureCanvasToBuffer();
      }
      if (effectConfig.fxInvert) {
        runtime.buffer = applyInvertToImageData(runtime.buffer);
        runtime.markDirty();
      }
    },
    rgbAdjust(effect, runtime) {
      runtime.buffer = applyColorBoostsToImageData(
        runtime.buffer,
        getEffectConfig("rgbAdjust", effect.config),
      );
      runtime.markDirty();
    },
    gaussianBlur(effect, runtime) {
      const effectConfig = getEffectConfig("gaussianBlur", effect.config);
      if (effectConfig.gaussianBlur <= 0) return;
      runtime.flushBuffer();
      applyGaussianBlurOverlay(runtime.ctx, runtime.canvas, effectConfig.gaussianBlur, runtime.blurAlpha);
      runtime.captureCanvasToBuffer();
    },
    grain(effect, runtime) {
      const effectConfig = getEffectConfig("grain", effect.config);
      if (effectConfig.grainToggle === false || effectConfig.grain === false) return;
      runtime.buffer = applyGrainToImageData(runtime.buffer, effectConfig);
      runtime.markDirty();
    },
    invert(effect, runtime) {
      runtime.buffer = applyInvertToImageData(runtime.buffer);
      runtime.markDirty();
    },
    chromatic(effect, runtime) {
      const effectConfig = getEffectConfig("chromatic", effect.config);
      runtime.buffer = applyChromaticToImageData(runtime.ctx, runtime.buffer, effectConfig.fxChromatic);
      runtime.markDirty();
    },
    glitch(effect, runtime) {
      const effectConfig = getEffectConfig("glitch", effect.config);
      if (effectConfig.fxGlitch <= 0.01) return;
      runtime.flushBuffer();
      applyGlitchOverlay(runtime.ctx, runtime.canvas, effectConfig.fxGlitch);
      runtime.captureCanvasToBuffer();
    },
    scanline(effect, runtime) {
      runtime.flushBuffer();
      applyScanlineOverlay(runtime.ctx, runtime.canvas, getScanlineLayerConfig(effect.config));
      runtime.captureCanvasToBuffer();
    },
  };

  function applyPostFxStack(ctx, canvas, baseImageData, effects, options) {
    if (!baseImageData) return false;
    const stack = Array.isArray(effects) ? effects : [];
    const runtime = createFxRuntime(ctx, canvas, baseImageData, options);

    stack.forEach((effect) => {
      if (!effect || effect.enabled === false) return;
      SYNC_EFFECT_PROCESSORS[effect.effectId]?.(effect, runtime);
    });

    runtime.flushBuffer();
    return true;
  }

  function waitForNextFrame() {
    return new Promise((resolve) => {
      const raf = global.requestAnimationFrame || ((callback) => setTimeout(callback, 0));
      raf(resolve);
    });
  }

  async function processRowsInChunks(height, chunkRows, onChunk, onProgress) {
    const rowsPerChunk = Math.max(1, Math.round(chunkRows || 64));
    for (let y = 0; y < height; y += rowsPerChunk) {
      const yEnd = Math.min(height, y + rowsPerChunk);
      onChunk(y, yEnd);
      onProgress?.(yEnd / Math.max(1, height));
      if (yEnd < height) await waitForNextFrame();
    }
  }

  async function applyColorBoostsToImageDataAsync(imageData, boosts, onProgress) {
    const options = boosts || {};
    const boostR = options.boostR ?? 1;
    const boostG = options.boostG ?? 1;
    const boostB = options.boostB ?? 1;
    const { width, height, data } = imageData;
    await processRowsInChunks(height, options.chunkRows, (yStart, yEnd) => {
      for (let y = yStart; y < yEnd; y++) {
        let i = y * width * 4;
        const rowEnd = i + width * 4;
        for (; i < rowEnd; i += 4) {
          data[i] = clampByte(data[i] * boostR);
          data[i + 1] = clampByte(data[i + 1] * boostG);
          data[i + 2] = clampByte(data[i + 2] * boostB);
        }
      }
    }, onProgress);
    return imageData;
  }

  async function applyGrainToImageDataAsync(imageData, opts, onProgress) {
    const options = opts || {};
    const amount = Math.max(0, Number(options.amount ?? options.grainAmount ?? 0.35));
    const size = Math.max(1, Math.round(Number(options.size ?? options.grainSize ?? 1)));
    const contrast = Math.max(0, Number(options.contrast ?? options.grainContrast ?? 1));
    const monochrome = options.monochrome ?? options.grainMonochrome ?? true;
    if (amount <= 0) return imageData;
    const { width, height, data } = imageData;
    const strength = 48 * amount * contrast;
    const chunkRows = Math.max(size, Math.round(options.chunkRows || 64));
    for (let y = 0; y < height; y += chunkRows) {
      const yEnd = Math.min(height, y + chunkRows);
      for (let gy = y; gy < yEnd; gy += size) {
        for (let x = 0; x < width; x += size) {
          const grain = (Math.random() - 0.5) * strength;
          const grainR = monochrome ? grain : (Math.random() - 0.5) * strength;
          const grainG = monochrome ? grain : (Math.random() - 0.5) * strength;
          const grainB = monochrome ? grain : (Math.random() - 0.5) * strength;
          for (let yy = gy; yy < Math.min(height, gy + size, yEnd); yy++) {
            for (let xx = x; xx < Math.min(width, x + size); xx++) {
              const i = (yy * width + xx) * 4;
              data[i] = clampByte(data[i] + grainR);
              data[i + 1] = clampByte(data[i + 1] + grainG);
              data[i + 2] = clampByte(data[i + 2] + grainB);
            }
          }
        }
      }
      onProgress?.(yEnd / Math.max(1, height));
      if (yEnd < height) await waitForNextFrame();
    }
    return imageData;
  }

  async function applyInvertToImageDataAsync(imageData, opts, onProgress) {
    const options = opts || {};
    const { width, height, data } = imageData;
    await processRowsInChunks(height, options.chunkRows, (yStart, yEnd) => {
      for (let y = yStart; y < yEnd; y++) {
        let i = y * width * 4;
        const rowEnd = i + width * 4;
        for (; i < rowEnd; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
      }
    }, onProgress);
    return imageData;
  }

  async function applyChromaticToImageDataAsync(ctx, imageData, amount, opts, onProgress) {
    const fxChromatic = Number(amount) || 0;
    if (fxChromatic <= 0.05) return imageData;
    const options = opts || {};
    const { width, height } = imageData;
    const out = ctx.createImageData(width, height);
    const srcData = imageData.data;
    const outData = out.data;
    const shift = Math.max(1, Math.round(fxChromatic));
    await processRowsInChunks(height, options.chunkRows, (yStart, yEnd) => {
      for (let y = yStart; y < yEnd; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const xr = Math.min(width - 1, x + shift);
          const xb = Math.max(0, x - shift);
          const ir = (y * width + xr) * 4;
          const ib = (y * width + xb) * 4;
          outData[i] = srcData[ir];
          outData[i + 1] = srcData[i + 1];
          outData[i + 2] = srcData[ib + 2];
          outData[i + 3] = srcData[i + 3];
        }
      }
    }, onProgress);
    return out;
  }

  const ASYNC_EFFECT_PROCESSORS = {
    async postFx(effect, runtime, progressForEffect) {
      const effectConfig = getEffectConfig(
        "postFx",
        runtime.fallbackConfig,
        Object.assign({}, effect.config || {}, { chunkRows: runtime.chunkRows }),
      );
      runtime.buffer = await applyColorBoostsToImageDataAsync(runtime.buffer, effectConfig, (part) => progressForEffect(part * 0.2));
      runtime.markDirty();
      if (effectConfig.gaussianBlur > 0) {
        runtime.flushBuffer();
        applyGaussianBlurOverlay(runtime.ctx, runtime.canvas, effectConfig.gaussianBlur, runtime.blurAlpha);
        runtime.captureCanvasToBuffer();
      }
      if (effectConfig.grain || effectConfig.grainToggle) {
        runtime.buffer = await applyGrainToImageDataAsync(runtime.buffer, effectConfig, (part) => progressForEffect(0.25 + part * 0.25));
        runtime.markDirty();
      }
      if (effectConfig.fxChromatic > 0.05) {
        runtime.buffer = await applyChromaticToImageDataAsync(runtime.ctx, runtime.buffer, effectConfig.fxChromatic, effectConfig, (part) => progressForEffect(0.5 + part * 0.2));
        runtime.markDirty();
      }
      if (effectConfig.fxGlitch > 0.01) {
        runtime.flushBuffer();
        applyGlitchOverlay(runtime.ctx, runtime.canvas, effectConfig.fxGlitch);
        runtime.captureCanvasToBuffer();
      }
      if (effectConfig.fxScanline > 0.01) {
        runtime.flushBuffer();
        applyScanlineOverlay(runtime.ctx, runtime.canvas, { fxScanline: Math.min(0.7, effectConfig.fxScanline * 0.45) });
        runtime.captureCanvasToBuffer();
      }
      if (effectConfig.fxInvert) {
        runtime.buffer = await applyInvertToImageDataAsync(runtime.buffer, effectConfig, (part) => progressForEffect(0.8 + part * 0.2));
        runtime.markDirty();
      }
    },
    async rgbAdjust(effect, runtime, progressForEffect) {
      runtime.buffer = await applyColorBoostsToImageDataAsync(
        runtime.buffer,
        getEffectConfig("rgbAdjust", effect.config, { chunkRows: runtime.chunkRows }),
        progressForEffect,
      );
      runtime.markDirty();
    },
    async gaussianBlur(effect, runtime) {
      const effectConfig = getEffectConfig("gaussianBlur", effect.config);
      if (effectConfig.gaussianBlur <= 0) return;
      runtime.flushBuffer();
      applyGaussianBlurOverlay(runtime.ctx, runtime.canvas, effectConfig.gaussianBlur, runtime.blurAlpha);
      runtime.captureCanvasToBuffer();
    },
    async grain(effect, runtime, progressForEffect) {
      const effectConfig = getEffectConfig("grain", effect.config, { chunkRows: runtime.chunkRows });
      if (effectConfig.grainToggle === false || effectConfig.grain === false) return;
      runtime.buffer = await applyGrainToImageDataAsync(runtime.buffer, effectConfig, progressForEffect);
      runtime.markDirty();
    },
    async invert(effect, runtime, progressForEffect) {
      runtime.buffer = await applyInvertToImageDataAsync(runtime.buffer, { chunkRows: runtime.chunkRows }, progressForEffect);
      runtime.markDirty();
    },
    async chromatic(effect, runtime, progressForEffect) {
      const effectConfig = getEffectConfig("chromatic", effect.config, { chunkRows: runtime.chunkRows });
      runtime.buffer = await applyChromaticToImageDataAsync(runtime.ctx, runtime.buffer, effectConfig.fxChromatic, effectConfig, progressForEffect);
      runtime.markDirty();
    },
    async glitch(effect, runtime) {
      const effectConfig = getEffectConfig("glitch", effect.config);
      if (effectConfig.fxGlitch <= 0.01) return;
      runtime.flushBuffer();
      applyGlitchOverlay(runtime.ctx, runtime.canvas, effectConfig.fxGlitch);
      runtime.captureCanvasToBuffer();
    },
    async scanline(effect, runtime) {
      runtime.flushBuffer();
      applyScanlineOverlay(runtime.ctx, runtime.canvas, getScanlineLayerConfig(effect.config));
      runtime.captureCanvasToBuffer();
    },
  };

  async function applyPostFxStackAsync(ctx, canvas, baseImageData, effects, options) {
    if (!baseImageData) return false;
    const stack = Array.isArray(effects) ? effects.filter((effect) => effect?.enabled !== false) : [];
    const onProgress = typeof options?.onProgress === "function" ? options.onProgress : null;
    const total = Math.max(1, stack.length);
    const runtime = createFxRuntime(ctx, canvas, baseImageData, options);
    const emitProgress = (phase, index, effect, effectProgress = 0) => {
      const percent = ((index + Math.max(0, Math.min(1, effectProgress))) / total) * 100;
      onProgress?.({ phase, effect, index, total, percent });
    };
    onProgress?.({ phase: "start", index: 0, total, percent: 0 });
    for (let index = 0; index < stack.length; index++) {
      const effect = stack[index];
      const progressForEffect = (part) => emitProgress("effect", index, effect, part);
      await ASYNC_EFFECT_PROCESSORS[effect.effectId]?.(effect, runtime, progressForEffect);
      emitProgress("effect", index, effect, 1);
      if (index < stack.length - 1) await waitForNextFrame();
    }
    if (!stack.length) {
      runtime.flushBuffer();
      onProgress?.({ phase: "complete", index: 0, total, percent: 100 });
    }
    runtime.flushBuffer();
    onProgress?.({ phase: "complete", index: stack.length, total, percent: 100 });
    return true;
  }

  global.RadenPostFx = Object.assign({}, global.RadenPostFx || {}, {
    applyGrainOverlay,
    applyScanlineOverlay,
    applyGaussianBlurOverlay,
    applyExperimentalEffects,
    applyColorBoosts,
    applyPostFxStack,
    applyPostFxStackAsync,
  });
})(window);
