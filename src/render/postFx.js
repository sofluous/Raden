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

  const RETRO_PALETTES = {
    gb: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
    cga: ["#000000", "#55ffff", "#ff55ff", "#ffffff"],
    ega: ["#000000", "#0000aa", "#00aa00", "#00aaaa", "#aa0000", "#aa00aa", "#aa5500", "#aaaaaa", "#555555", "#5555ff", "#55ff55", "#55ffff", "#ff5555", "#ff55ff", "#ffff55", "#ffffff"],
    pc98: ["#101018", "#1e2a4a", "#3b5f9b", "#6c91d9", "#d8e7ff", "#6b3f2a", "#a66b43", "#d9a066", "#f2d29b", "#6a2a4a", "#a5487c", "#d17bb1", "#f0b7df", "#264a3d", "#3f7a67", "#6eb49b"],
    "snes-lite": ["#140c1c", "#442434", "#30346d", "#4e4a4e", "#854c30", "#346524", "#d04648", "#757161", "#597dce", "#d27d2c", "#8595a1", "#6daa2c", "#d2aa99", "#6dc2ca", "#dad45e", "#deeed6"],
  };

  const RISO_PALETTES = {
    "warm-duo": ["#1a1a1a", "#ff5a3c", "#f3d6b5", "#ffffff"],
    "cmyk-lite": ["#00a0d2", "#ff3f8e", "#ffd400", "#111111"],
    fluoro: ["#00e5ff", "#ff2ec4", "#ffe600", "#1a1a1a"],
    "mono-noir": ["#111111", "#4d4d4d", "#8d8d8d", "#f4f1ea"],
    custom: ["#1a1a1a", "#5e5e5e", "#b5b5b5", "#f4f1ea"],
  };

  function hexToRgb(hex) {
    const raw = (hex || "").trim();
    const m = raw.match(/^#([0-9a-f]{6})$/i);
    if (!m) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(m[1].slice(0, 2), 16),
      g: parseInt(m[1].slice(2, 4), 16),
      b: parseInt(m[1].slice(4, 6), 16),
    };
  }

  function getPaletteColors(mode, preset, requestedSize) {
    const palettes = mode === "risoimage" ? RISO_PALETTES : RETRO_PALETTES;
    const fallback = mode === "risoimage" ? RISO_PALETTES["warm-duo"] : RETRO_PALETTES.gb;
    const base = (palettes[preset] || fallback).map(hexToRgb);
    const size = Math.max(2, Math.min(64, requestedSize || base.length));
    if (size <= base.length) return base.slice(0, size);
    const out = base.slice();
    while (out.length < size) out.push(base[out.length % base.length]);
    return out;
  }

  function nearestPaletteColor(r, g, b, palette) {
    let best = palette[0];
    let bestDist = Infinity;
    for (let i = 0; i < palette.length; i += 1) {
      const p = palette[i];
      const dr = r - p.r;
      const dg = g - p.g;
      const db = b - p.b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  function nearestPaletteIndex(r, g, b, palette) {
    let bestIndex = 0;
    let bestDist = Infinity;
    for (let i = 0; i < palette.length; i += 1) {
      const p = palette[i];
      const dr = r - p.r;
      const dg = g - p.g;
      const db = b - p.b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestDist) {
        bestDist = d;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  function getBayerMatrix(size) {
    const target = Math.max(2, Math.min(16, size));
    const cache = getBayerMatrix._cache || (getBayerMatrix._cache = {});
    if (cache[target]) return cache[target];
    if (target === 2) {
      cache[2] = [
        [0, 2],
        [3, 1],
      ];
      return cache[2];
    }
    const half = getBayerMatrix(target / 2);
    const out = Array.from({ length: target }, () => new Array(target).fill(0));
    for (let y = 0; y < target / 2; y += 1) {
      for (let x = 0; x < target / 2; x += 1) {
        const v = half[y][x] * 4;
        out[y][x] = v;
        out[y][x + target / 2] = v + 2;
        out[y + target / 2][x] = v + 3;
        out[y + target / 2][x + target / 2] = v + 1;
      }
    }
    cache[target] = out;
    return out;
  }

  function orderedNoise(x, y, size) {
    const matrix = getBayerMatrix(size);
    const n = matrix.length;
    const v = matrix[y % n][x % n];
    return (v + 0.5) / (n * n) - 0.5;
  }

  function getDitherShapeMask(shape, fx, fy) {
    if (shape === "circle") return Math.sqrt(fx * fx + fy * fy) <= 1 ? 1 : 0;
    if (shape === "diamond") return Math.abs(fx) + Math.abs(fy) <= 1 ? 1 : 0;
    if (shape === "line") return Math.abs(fy) < 0.34 ? 1 : 0;
    if (shape === "cross") return Math.abs(fx) < 0.24 || Math.abs(fy) < 0.24 ? 1 : 0;
    return 1;
  }

  function isRisoLayerVisible(layerIndex, layerCount, config) {
    const mode = config.risoLayerViewMode || "all";
    if (mode === "all") return true;
    if (mode === "solo") {
      const active = Math.max(1, Math.min(layerCount, config.risoActiveLayer || 1));
      return layerIndex === active - 1;
    }
    if (mode === "custom") {
      const mask = Array.isArray(config.risoVisibleMask)
        ? config.risoVisibleMask
        : Array.from({ length: 6 }, (_, index) => config[`risoVisibleL${index + 1}`] !== false);
      return !!mask[layerIndex];
    }
    return true;
  }

  function getRisoLayerOverride(config, layerIndex) {
    if (Array.isArray(config.risoLayerOverrides) && config.risoLayerOverrides[layerIndex]) {
      return config.risoLayerOverrides[layerIndex];
    }
    const layer = layerIndex + 1;
    return {
      angle: Number(config[`risoL${layer}Angle`]),
      opacity: Number(config[`risoL${layer}Opacity`]),
      toneMin: Number(config[`risoL${layer}ToneMin`]),
      toneMax: Number(config[`risoL${layer}ToneMax`]),
    };
  }

  function applyRisoImageEffect(ctx, imageData, config) {
    const effectConfig = getEffectConfig("risoimage", config);
    const out = ctx.createImageData(imageData.width, imageData.height);
    const srcData = imageData.data;
    const d = out.data;
    const layerCount = Math.max(2, Math.min(6, effectConfig.risoLayerCount || 3));
    const palette = getPaletteColors("risoimage", effectConfig.risoPalettePreset, layerCount);
    const cell = Math.max(1, effectConfig.ditherDotSize || 4);
    const spread = Math.max(0, Math.min(1, Number(effectConfig.ditherDotSpread ?? 0.72)));
    const uniformity = Math.max(0, Math.min(1, Number(effectConfig.ditherUniformity ?? 0.56)));
    const shape = effectConfig.ditherDotShape || "circle";
    const layerOpacity = Math.max(0, Math.min(1, Number(effectConfig.risoLayerOpacity ?? 0.82)));
    const overlap = Math.max(0, Math.min(1, Number(effectConfig.risoLayerOverlap ?? 0.32)));
    const colorSplit = Math.max(0, Math.min(1, Number(effectConfig.risoColorSplit ?? 0.65)));
    const style = effectConfig.risoRenderStyle || "original";

    for (let i = 0; i < d.length; i += 4) {
      d[i] = 245;
      d[i + 1] = 241;
      d[i + 2] = 233;
      d[i + 3] = 255;
    }

    const width = imageData.width;
    const height = imageData.height;
    const renderLayer = (layer, toneMinOverride, toneMaxOverride, angleOverride, opacityOverride) => {
      if (!isRisoLayerVisible(layer, layerCount, effectConfig)) return;
      const color = palette[layer];
      const center = layerCount === 1 ? 0.5 : layer / (layerCount - 1);
      const bandHalf = (1 / layerCount) * (1 + overlap * 1.9);
      const toneCenter = Number.isFinite(toneMinOverride) && Number.isFinite(toneMaxOverride)
        ? (toneMinOverride + toneMaxOverride) * 0.5
        : center;
      const toneHalf = Number.isFinite(toneMinOverride) && Number.isFinite(toneMaxOverride)
        ? Math.max(0.0001, Math.abs(toneMaxOverride - toneMinOverride) * 0.5)
        : Math.max(0.0001, bandHalf);
      const angleDeg = Number.isFinite(angleOverride)
        ? angleOverride
        : layer * (effectConfig.risoLayerAngleStep || 24);
      const angle = angleDeg * (Math.PI / 180);
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const currentLayerOpacity = Number.isFinite(opacityOverride)
        ? Math.max(0, Math.min(1, opacityOverride))
        : layerOpacity;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = (y * width + x) * 4;
          const r = srcData[i];
          const g = srcData[i + 1];
          const b = srcData[i + 2];
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          const tone = 1 - lum;
          const toneWeight = Math.max(0, Math.min(1, 1 - Math.abs(tone - toneCenter) / toneHalf));
          if (toneWeight <= 0.001) continue;
          const nearestIndex = nearestPaletteIndex(r, g, b, palette);
          const idxDist = layerCount > 1 ? Math.abs(nearestIndex - layer) / (layerCount - 1) : 0;
          const inkStrength = Math.max(0, Math.min(1, toneWeight * ((1 - colorSplit) + (1 - idxDist) * colorSplit)));
          if (inkStrength <= 0.03) continue;
          const rx = x * ca - y * sa;
          const ry = x * sa + y * ca;
          const noise = orderedNoise(Math.abs(Math.floor(rx)), Math.abs(Math.floor(ry)), 4);
          const randomJitter = (Math.random() - 0.5) * (1 - uniformity) * 0.22;
          const threshold = 0.58 - inkStrength * 0.52 + noise * spread * 0.72 + randomJitter;
          if (inkStrength <= threshold) continue;
          const fx = ((((rx % cell) + cell) % cell) + 0.5) / cell * 2 - 1;
          const fy = ((((ry % cell) + cell) % cell) + 0.5) / cell * 2 - 1;
          if (!getDitherShapeMask(shape, fx, fy)) continue;
          const a = Math.max(0, Math.min(1, currentLayerOpacity * inkStrength * 1.12));
          d[i] = d[i] * (1 - a) + color.r * a;
          d[i + 1] = d[i + 1] * (1 - a) + color.g * a;
          d[i + 2] = d[i + 2] * (1 - a) + color.b * a;
        }
      }
    };

    if (style === "legacy") {
      const angle = ((effectConfig.risoLayerAngleStep || 24) % 180) * (Math.PI / 180);
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = (y * width + x) * 4;
          const r = srcData[i];
          const g = srcData[i + 1];
          const b = srcData[i + 2];
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          const mx = Math.max(r, g, b);
          const mn = Math.min(r, g, b);
          const saturation = (mx - mn) / 255;
          const ink = Math.max(0, Math.min(1, (1 - lum) * 0.82 + saturation * 0.34));
          if (ink <= 0.025) continue;
          const rx = x * ca - y * sa;
          const ry = x * sa + y * ca;
          const noise = orderedNoise(Math.abs(Math.floor(rx)), Math.abs(Math.floor(ry)), 4);
          const jitter = (Math.random() - 0.5) * (1 - uniformity) * 0.24;
          if (ink <= 0.46 + noise * spread * 0.62 + jitter) continue;
          const fx = ((((rx % cell) + cell) % cell) + 0.5) / cell * 2 - 1;
          const fy = ((((ry % cell) + cell) % cell) + 0.5) / cell * 2 - 1;
          if (!getDitherShapeMask(shape, fx, fy)) continue;
          const c = nearestPaletteColor(r, g, b, palette);
          const alpha = Math.max(0, Math.min(1, (0.24 + ink * 0.86) * (0.75 + saturation * 0.35)));
          d[i] = d[i] * (1 - alpha) + c.r * alpha;
          d[i + 1] = d[i + 1] * (1 - alpha) + c.g * alpha;
          d[i + 2] = d[i + 2] * (1 - alpha) + c.b * alpha;
        }
      }
      return out;
    }

    for (let layer = 0; layer < layerCount; layer += 1) {
      const override = getRisoLayerOverride(effectConfig, layer);
      renderLayer(
        layer,
        style === "layered" ? override?.toneMin : null,
        style === "layered" ? override?.toneMax : null,
        style === "layered" ? override?.angle : null,
        style === "layered" ? override?.opacity : null,
      );
    }
    return out;
  }

  function applyPixelRetroEffect(ctx, imageData, config) {
    const effectConfig = getEffectConfig("pixelretro", config);
    const out = ctx.createImageData(imageData.width, imageData.height);
    const srcData = imageData.data;
    const d = out.data;
    const width = imageData.width;
    const height = imageData.height;
    const block = Math.max(1, effectConfig.pixelBlockSize || 6);
    const palette = getPaletteColors(
      "pixelretro",
      effectConfig.palettePreset,
      Math.max(2, Math.min(64, effectConfig.paletteSize || 8)),
    );
    const bayerSize = Math.max(2, Math.min(16, parseInt(effectConfig.ditherBayerSize || "8", 10) || 8));
    const depthSteps = Math.max(2, Math.pow(2, Math.max(1, effectConfig.colorDepthBits || 4)));
    const scanline = Math.max(0, Math.min(1, Number(effectConfig.scanlineStrength ?? 0.18)));

    for (let by = 0; by < height; by += block) {
      for (let bx = 0; bx < width; bx += block) {
        const cx = Math.min(width - 1, bx + Math.floor(block / 2));
        const cy = Math.min(height - 1, by + Math.floor(block / 2));
        const ci = (cy * width + cx) * 4;
        const n = orderedNoise(bx, by, bayerSize) * 36;
        let r = srcData[ci];
        let g = srcData[ci + 1];
        let b = srcData[ci + 2];
        r = Math.max(0, Math.min(255, Math.round(((r + n) / 255) * (depthSteps - 1)) * (255 / (depthSteps - 1))));
        g = Math.max(0, Math.min(255, Math.round(((g + n) / 255) * (depthSteps - 1)) * (255 / (depthSteps - 1))));
        b = Math.max(0, Math.min(255, Math.round(((b + n) / 255) * (depthSteps - 1)) * (255 / (depthSteps - 1))));
        const c = nearestPaletteColor(r, g, b, palette);
        for (let y = by; y < Math.min(height, by + block); y += 1) {
          for (let x = bx; x < Math.min(width, bx + block); x += 1) {
            const i = (y * width + x) * 4;
            const k = scanline > 0 && y % 2 === 1 ? 1 - scanline * 0.45 : 1;
            d[i] = c.r * k;
            d[i + 1] = c.g * k;
            d[i + 2] = c.b * k;
            d[i + 3] = 255;
          }
        }
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
    risoimage(effect, runtime) {
      runtime.buffer = applyRisoImageEffect(runtime.ctx, runtime.buffer, effect.config);
      runtime.markDirty();
    },
    pixelretro(effect, runtime) {
      runtime.buffer = applyPixelRetroEffect(runtime.ctx, runtime.buffer, effect.config);
      runtime.markDirty();
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
    async risoimage(effect, runtime, progressForEffect) {
      progressForEffect(0.1);
      await waitForNextFrame();
      runtime.buffer = applyRisoImageEffect(runtime.ctx, runtime.buffer, effect.config);
      runtime.markDirty();
      progressForEffect(1);
    },
    async pixelretro(effect, runtime, progressForEffect) {
      progressForEffect(0.1);
      await waitForNextFrame();
      runtime.buffer = applyPixelRetroEffect(runtime.ctx, runtime.buffer, effect.config);
      runtime.markDirty();
      progressForEffect(1);
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
    applyRisoImageEffect,
    applyPixelRetroEffect,
    applyPostFxStack,
    applyPostFxStackAsync,
  });
})(window);
