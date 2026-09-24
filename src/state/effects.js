/* Raden effect metadata foundation.
 * Exposed via window.RadenEffects for compatibility with the static app shell.
 */
(function registerRadenEffects(global) {
  const POST_FX_CONTROL_IDS = [
    "boostR",
    "boostG",
    "boostB",
    "grainToggle",
    "gaussianBlur",
    "fxInvert",
    "fxChromatic",
    "fxGlitch",
    "fxScanline",
  ];

  const EFFECT_LABELS = {
    postFx: "Legacy Post FX Bundle",
    rgbAdjust: "RGB Adjustment",
    gaussianBlur: "Gaussian Blur",
    grain: "Grain",
    invert: "Invert",
    chromatic: "Chromatic Shift",
    glitch: "Tearing",
    scanline: "Scanlines",
  };

  const EFFECT_TYPE_OPTIONS = [
    "rgbAdjust",
    "gaussianBlur",
    "grain",
    "invert",
    "chromatic",
    "glitch",
    "scanline",
    "risoimage",
    "pixelretro",
    "risograph",
    "postFx",
  ];

  const EFFECT_CONTROL_IDS = {
    rgbAdjust: ["boostR", "boostG", "boostB"],
    gaussianBlur: ["gaussianBlur"],
    grain: ["grainAmount", "grainSize", "grainContrast", "grainMonochrome"],
    postFx: POST_FX_CONTROL_IDS,
    invert: [],
    chromatic: ["fxChromatic"],
    glitch: ["fxGlitch"],
    scanline: [
      "fxScanline",
      "scanlineDensity",
      "scanlineWidth",
      "scanlineOpacity",
      "scanlineOrientation",
      "scanlineSoftness",
    ],
  };

  const EFFECT_CONTROL_POLICIES = {
    rgbAdjust: {
      boostR: "live",
      boostG: "live",
      boostB: "live",
    },
    gaussianBlur: {
      gaussianBlur: "deferred",
    },
    grain: {
      grainAmount: "deferred",
      grainSize: "deferred",
      grainContrast: "deferred",
      grainMonochrome: "deferred",
    },
    invert: {},
    chromatic: {
      fxChromatic: "deferred",
    },
    glitch: {
      fxGlitch: "deferred",
    },
    scanline: {
      fxScanline: "deferred",
      scanlineDensity: "deferred",
      scanlineWidth: "deferred",
      scanlineOpacity: "live",
      scanlineOrientation: "deferred",
      scanlineSoftness: "deferred",
    },
    postFx: {
      boostR: "live",
      boostG: "live",
      boostB: "live",
      grainToggle: "deferred",
      gaussianBlur: "deferred",
      fxInvert: "deferred",
      fxChromatic: "deferred",
      fxGlitch: "deferred",
      fxScanline: "deferred",
    },
  };

  const EFFECT_DEFAULT_CONFIGS = {
    postFx: {
      boostR: 1,
      boostG: 1,
      boostB: 1,
      grainToggle: false,
      gaussianBlur: 0,
      fxInvert: false,
      fxChromatic: 0,
      fxGlitch: 0,
      fxScanline: 0,
    },
    rgbAdjust: {
      boostR: 1,
      boostG: 1,
      boostB: 1,
    },
    gaussianBlur: {
      gaussianBlur: 0,
    },
    grain: {
      grainAmount: 0.35,
      grainSize: 1,
      grainContrast: 1,
      grainMonochrome: true,
    },
    invert: {},
    chromatic: {
      fxChromatic: 0,
    },
    glitch: {
      fxGlitch: 0,
    },
    scanline: {
      fxScanline: 1,
      scanlineOpacity: 0.25,
      scanlineDensity: 2,
      scanlineWidth: 1,
      scanlineOrientation: "horizontal",
      scanlineSoftness: 0,
    },
  };

  const EFFECT_PROCESSOR_KINDS = {
    postFx: "legacyBundle",
    rgbAdjust: "pixel",
    gaussianBlur: "canvas",
    grain: "pixel",
    invert: "pixel",
    chromatic: "pixel",
    glitch: "canvas",
    scanline: "canvas",
    risoimage: "imageEffect",
    pixelretro: "imageEffect",
    risograph: "imageEffect",
  };

  const RANDOMIZABLE_EFFECT_TYPES = [
    "rgbAdjust",
    "gaussianBlur",
    "grain",
    "chromatic",
    "glitch",
    "scanline",
    "invert",
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getEffectLabel(effectId) {
    if (EFFECT_LABELS[effectId]) return EFFECT_LABELS[effectId];
    const mode = global.RadenModes?.getMode?.(effectId);
    return mode?.label || effectId || "Effect";
  }

  function getEffectTypeOptions() {
    return EFFECT_TYPE_OPTIONS.slice();
  }

  function getEffectControlIds(effectId) {
    return (EFFECT_CONTROL_IDS[effectId] || []).slice();
  }

  function getEffectControlPolicy(effectId, controlId) {
    if (!effectId || !controlId) return null;
    return EFFECT_CONTROL_POLICIES[effectId]?.[controlId] || "deferred";
  }

  function getEffectDefaults(effectId) {
    return clone(EFFECT_DEFAULT_CONFIGS[effectId] || {});
  }

  function mergeEffectConfig(effectId, config, extras) {
    return Object.assign(
      {},
      getEffectDefaults(effectId),
      clone(config || {}),
      clone(extras || {}),
    );
  }

  function getEffectProcessorKind(effectId) {
    return EFFECT_PROCESSOR_KINDS[effectId] || "unknown";
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function round(value, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  function randomizeEffectConfig(effectId) {
    const defaults = getEffectDefaults(effectId);
    if (effectId === "rgbAdjust") {
      return Object.assign(defaults, {
        boostR: round(randomBetween(0.85, 1.3), 2),
        boostG: round(randomBetween(0.85, 1.3), 2),
        boostB: round(randomBetween(0.85, 1.3), 2),
      });
    }
    if (effectId === "gaussianBlur") {
      return Object.assign(defaults, {
        gaussianBlur: round(randomBetween(0.2, 3.2), 2),
      });
    }
    if (effectId === "grain") {
      return Object.assign(defaults, {
        grainAmount: round(randomBetween(0.12, 0.65), 2),
        grainSize: Math.round(randomBetween(1, 4)),
        grainContrast: round(randomBetween(0.65, 1.65), 2),
        grainMonochrome: Math.random() > 0.25,
      });
    }
    if (effectId === "chromatic") {
      return Object.assign(defaults, {
        fxChromatic: round(randomBetween(0.2, 2.4), 1),
      });
    }
    if (effectId === "glitch") {
      return Object.assign(defaults, {
        fxGlitch: round(randomBetween(0.04, 0.32), 2),
      });
    }
    if (effectId === "scanline") {
      return Object.assign(defaults, {
        fxScanline: round(randomBetween(0.35, 1), 2),
        scanlineDensity: Math.round(randomBetween(2, 8)),
        scanlineWidth: Math.round(randomBetween(1, 3)),
        scanlineOpacity: round(randomBetween(0.12, 0.45), 2),
        scanlineOrientation: Math.random() > 0.25 ? "horizontal" : "vertical",
        scanlineSoftness: round(randomBetween(0, 0.45), 2),
      });
    }
    return defaults;
  }

  function getRandomizableEffectTypes() {
    return RANDOMIZABLE_EFFECT_TYPES.slice();
  }

  global.RadenEffects = {
    POST_FX_CONTROL_IDS: POST_FX_CONTROL_IDS.slice(),
    EFFECT_LABELS: clone(EFFECT_LABELS),
    EFFECT_TYPE_OPTIONS: EFFECT_TYPE_OPTIONS.slice(),
    EFFECT_CONTROL_IDS: clone(EFFECT_CONTROL_IDS),
    EFFECT_CONTROL_POLICIES: clone(EFFECT_CONTROL_POLICIES),
    EFFECT_DEFAULT_CONFIGS: clone(EFFECT_DEFAULT_CONFIGS),
    EFFECT_PROCESSOR_KINDS: clone(EFFECT_PROCESSOR_KINDS),
    RANDOMIZABLE_EFFECT_TYPES: RANDOMIZABLE_EFFECT_TYPES.slice(),
    getEffectLabel,
    getEffectTypeOptions,
    getEffectControlIds,
    getEffectControlPolicy,
    getEffectDefaults,
    mergeEffectConfig,
    getEffectProcessorKind,
    randomizeEffectConfig,
    getRandomizableEffectTypes,
  };
})(window);
