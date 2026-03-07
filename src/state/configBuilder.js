/* Raden state/config helpers (M1 Batch 2 extraction)
 * Exposed via window.RadenState with compatibility-friendly signatures.
 */
(function registerRadenState(global) {
  const MAX_RENDER_DIMENSION = 4096;
  const MAX_RENDER_PIXELS = MAX_RENDER_DIMENSION * MAX_RENDER_DIMENSION;

  function normalizeRenderSize(width, height) {
    let w = Math.max(1, Math.min(MAX_RENDER_DIMENSION, Math.floor(width)));
    let h = Math.max(1, Math.min(MAX_RENDER_DIMENSION, Math.floor(height)));
    const pixels = w * h;
    if (pixels > MAX_RENDER_PIXELS) {
      const scale = Math.sqrt(MAX_RENDER_PIXELS / pixels);
      w = Math.max(1, Math.floor(w * scale));
      h = Math.max(1, Math.floor(h * scale));
    }
    return { width: w, height: h };
  }

  function getInputValue(id, asInteger) {
    const val = document.getElementById(id).value;
    return asInteger ? parseInt(val, 10) : parseFloat(val);
  }

  function resolveSeedValue(seedInputId) {
    const seedInput = document.getElementById(seedInputId || "seed");
    let seed = parseInt(seedInput.value, 10);
    if (!Number.isFinite(seed)) {
      seed = Math.floor(Math.random() * 2147483647);
      seedInput.value = String(seed);
    }
    return seed;
  }

  function buildRenderConfig(renderOptions, ctx) {
    const options = renderOptions || {};
    const helpers = ctx || {};
    const getInput = helpers.getInput || getInputValue;
    const resolveSeed = helpers.resolveSeed || (() => resolveSeedValue("seed"));
    const clamp01 =
      helpers.clamp01 || ((v) => Math.max(0, Math.min(1, v)));
    const canvas = helpers.canvas;
    const getPreviewScaleForMode = helpers.getPreviewScaleForMode;

    const seed = resolveSeed();
    const viewport = canvas && canvas.parentElement ? canvas.parentElement : null;
    const viewportWidth =
      (viewport && viewport.clientWidth) ||
      (canvas && canvas.clientWidth) ||
      window.innerWidth - 400;
    const viewportHeight =
      (viewport && viewport.clientHeight) ||
      (canvas && canvas.clientHeight) ||
      window.innerHeight;
    const fallbackWidth = Math.max(1, Math.floor(viewportWidth));
    const fallbackHeight = Math.max(1, Math.floor(viewportHeight));
    const mode = document.getElementById("modeSelector").value;
    const requestedWidth = getInput("renderWidth", true) || fallbackWidth;
    const requestedHeight = getInput("renderHeight", true) || fallbackHeight;
    const normalizedSize = normalizeRenderSize(requestedWidth, requestedHeight);
    const previewScale = getPreviewScaleForMode(mode);
    const scaleFactor = options.preview ? previewScale : 1;
    const targetWidth = Math.max(1, Math.floor(normalizedSize.width * scaleFactor));
    const targetHeight = Math.max(1, Math.floor(normalizedSize.height * scaleFactor));
    const risoLayerOverrides = Array.from({ length: 6 }, (_, index) => {
      const layer = index + 1;
      const angle = getInput(`risoL${layer}Angle`);
      const opacity = getInput(`risoL${layer}Opacity`);
      const toneMinRaw = getInput(`risoL${layer}ToneMin`);
      const toneMaxRaw = getInput(`risoL${layer}ToneMax`);
      const toneMin = clamp01(
        Math.min(
          Number.isFinite(toneMinRaw) ? toneMinRaw : 0,
          Number.isFinite(toneMaxRaw) ? toneMaxRaw : 1,
        ),
      );
      const toneMax = clamp01(
        Math.max(
          Number.isFinite(toneMinRaw) ? toneMinRaw : 0,
          Number.isFinite(toneMaxRaw) ? toneMaxRaw : 1,
        ),
      );
      return {
        angle: Number.isFinite(angle) ? angle : null,
        opacity: Number.isFinite(opacity) ? clamp01(opacity) : null,
        toneMin: Number.isFinite(toneMin) ? toneMin : null,
        toneMax: Number.isFinite(toneMax) ? toneMax : null,
      };
    });

    return {
      width: targetWidth,
      height: targetHeight,
      outputWidth: normalizedSize.width,
      outputHeight: normalizedSize.height,
      preview: !!options.preview,
      seed,
      layers: getInput("layers", true),
      scale: getInput("scale"),
      blend: getInput("blend"),
      layerLength: getInput("layerLength"),
      ringSpacing: getInput("ringSpacing"),
      ringJitter: getInput("ringJitter"),
      seamThickness: getInput("seamThickness"),
      seamContrast: getInput("seamContrast"),
      scratchDensity: getInput("scratchDensity"),
      scratchAngle: getInput("scratchAngle"),
      surfacePolish: getInput("surfacePolish"),
      colorIntensity: getInput("intensity"),
      colorRange: getInput("range"),
      nacrePalette: document.getElementById("nacrePalette")?.value || "classic",
      nacreBrilliance: getInput("nacreBrilliance"),
      nacreChromatic: getInput("nacreChromatic"),
      textureFamily:
        document.getElementById("textureFamily")?.value || "classic",
      opalCellScale: getInput("opalCellScale"),
      opalVeinDensity: getInput("opalVeinDensity"),
      opalFire: getInput("opalFire"),
      opalMatrix: getInput("opalMatrix"),
      labradoriteScale: getInput("labradoriteScale"),
      labradoriteDirection: getInput("labradoriteDirection"),
      labradoriteBanding: getInput("labradoriteBanding"),
      labradoriteFlash: getInput("labradoriteFlash"),
      labradoriteDarkness: getInput("labradoriteDarkness"),
      marbleFlowScale: getInput("marbleFlowScale"),
      marbleVeinFreq: getInput("marbleVeinFreq"),
      marbleContrast: getInput("marbleContrast"),
      marbleInkDrift: getInput("marbleInkDrift"),
      marbleLightness: getInput("marbleLightness"),
      substrateTone: document.getElementById("substrateTone")?.value || "light",
      substrateMix: getInput("substrateMix"),
      flowMode: document.getElementById("flowMode").value,
      highlightStrength: getInput("highlightStrength"),
      lightAngle: getInput("lightAngle"),
      lightCurvature: getInput("lightCurvature"),
      lightSpread: getInput("lightSpread"),
      dotSize: getInput("risoDotSize", true),
      threshold: getInput("risoThreshold", true),
      boostR: getInput("boostR"),
      boostG: getInput("boostG"),
      boostB: getInput("boostB"),
      gaussianBlur: getInput("gaussianBlur"),
      grain: document.getElementById("grainToggle").checked,
      fxInvert: !!document.getElementById("fxInvert")?.checked,
      fxChromatic: getInput("fxChromatic"),
      fxGlitch: getInput("fxGlitch"),
      fxScanline: getInput("fxScanline"),
      topoPreset: document.getElementById("topoPreset")?.value || "coastal",
      topoRidge: getInput("topoRidge"),
      topoWarp: getInput("topoWarp"),
      topoErosion: getInput("topoErosion"),
      naturalScale: getInput("naturalScale"),
      naturalWarp: getInput("naturalWarp"),
      naturalTurbulence: getInput("naturalTurbulence"),
      naturalAnisotropy: getInput("naturalAnisotropy"),
      imageFitMode: document.getElementById("imageFitMode")?.value || "contain",
      imageCropScale: getInput("imageCropScale"),
      imageRotate: getInput("imageRotate"),
      risoLayerCount: getInput("risoLayerCount", true),
      risoPalettePreset:
        document.getElementById("risoPalettePreset")?.value || "warm-duo",
      risoQuantMethod:
        document.getElementById("risoQuantMethod")?.value || "kmeans",
      risoRenderStyle:
        document.getElementById("risoRenderStyle")?.value || "original",
      risoLayerAngleStep: getInput("risoLayerAngleStep"),
      risoLayerOpacity: getInput("risoLayerOpacity"),
      risoLayerOverlap: getInput("risoLayerOverlap"),
      risoColorSplit: getInput("risoColorSplit"),
      risoLayerViewMode:
        document.getElementById("risoLayerViewMode")?.value || "all",
      risoActiveLayer: getInput("risoActiveLayer", true),
      risoVisibleMask: [
        !!document.getElementById("risoVisibleL1")?.checked,
        !!document.getElementById("risoVisibleL2")?.checked,
        !!document.getElementById("risoVisibleL3")?.checked,
        !!document.getElementById("risoVisibleL4")?.checked,
        !!document.getElementById("risoVisibleL5")?.checked,
        !!document.getElementById("risoVisibleL6")?.checked,
      ],
      risoLayerOverrides,
      ditherMethod: document.getElementById("ditherMethod")?.value || "ordered",
      ditherDotShape: document.getElementById("ditherDotShape")?.value || "circle",
      ditherDotSize: getInput("ditherDotSize", true),
      ditherDotSpread: getInput("ditherDotSpread"),
      ditherUniformity: getInput("ditherUniformity"),
      palettePreset: document.getElementById("palettePreset")?.value || "gb",
      paletteSize: getInput("paletteSize", true),
      colorDepthBits: getInput("colorDepthBits", true),
      pixelBlockSize: getInput("pixelBlockSize", true),
      ditherBayerSize: document.getElementById("ditherBayerSize")?.value || "8",
      scanlineStrength: getInput("scanlineStrength"),
    };
  }

  global.RadenState = Object.assign({}, global.RadenState || {}, {
    getInputValue,
    resolveSeedValue,
    buildRenderConfig,
  });
})(window);
