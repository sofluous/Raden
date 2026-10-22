/* Malachite Flow procedural stages and renderer contract. */
(function registerRadenMalachiteFlow(global) {
  const MALACHITE_FLOW_STAGES = Object.freeze([
    { id: "stoneField", label: "Directional stone field", kind: "field", inputs: ["point"], outputs: ["stoneField"], controlIds: ["naturalScale", "naturalWarp", "naturalTurbulence", "naturalAnisotropy"] },
    { id: "rings", label: "Malachite rings", kind: "geometry", inputs: ["stoneField", "runtime"], outputs: ["ringStructure"], controlIds: ["malachiteSwirl", "malachiteRingTightness", "malachiteRingVariance"] },
    { id: "stone", label: "Malachite material", kind: "material", inputs: ["ringStructure"], outputs: ["nativeColor"], controlIds: ["malachiteContrast"], interfaceId: "materialSource" },
    { id: "authoredPalette", label: "Authored palette mapping", kind: "material", inputs: ["nativeColor"], outputs: ["pixel"], controlIds: ["nacrePalette"], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "nativeColor", output: "pixel", description: "Return native Malachite Flow color unchanged." } },
  ]);
  const PALETTE = Object.freeze([
    Object.freeze([8, 49, 38]),
    Object.freeze([22, 98, 74]),
    Object.freeze([58, 161, 120]),
    Object.freeze([171, 221, 192]),
  ]);
  const SEAM_COLOR = Object.freeze([7, 37, 29]);

  function normalizeMalachiteConfig(rawConfig) {
    const raw = rawConfig || {};
    return Object.assign({}, raw, {
      naturalScale: Math.max(0.0005, global.RadenShared.finiteOr(raw.naturalScale, 0.008)),
      warp: global.RadenShared.clamp01(global.RadenShared.finiteOr(raw.naturalWarp, 0.35)),
      turbulence: Math.max(0, global.RadenShared.finiteOr(raw.naturalTurbulence, 0.62)),
      anisotropy: global.RadenShared.clamp01(global.RadenShared.finiteOr(raw.naturalAnisotropy, 0.25)),
      swirl: global.RadenShared.clamp01(global.RadenShared.finiteOr(raw.malachiteSwirl, 0.58)),
      ringTightness: Math.max(0.2, global.RadenShared.finiteOr(raw.malachiteRingTightness, 1.16)),
      ringVariance: global.RadenShared.clamp01(global.RadenShared.finiteOr(raw.malachiteRingVariance, 0.36)),
      contrast: Math.max(0.2, global.RadenShared.finiteOr(raw.malachiteContrast, 1.08)),
    });
  }

  function samplePalette(value) {
    const { clamp01, lerp } = global.RadenShared;
    const scaled = clamp01(value) * (PALETTE.length - 1);
    const index = Math.floor(scaled);
    const next = Math.min(PALETTE.length - 1, index + 1);
    const mix = scaled - index;
    return PALETTE[index].map((channel, channelIndex) => Math.round(lerp(channel, PALETTE[next][channelIndex], mix)));
  }

  function computeStoneField(config, point) {
    const dirX = point.nx * (1 + config.anisotropy * 2.6);
    const dirY = point.ny * (1 - config.anisotropy * 0.3);
    return { dirX, dirY, radial: Math.hypot(dirX, dirY) };
  }

  function computeRings(config, runtime, stoneField) {
    const { clamp01 } = global.RadenShared;
    const { dirX, dirY, radial } = stoneField;
    const curl = runtime.simplexWarp.noise2D(dirX * config.naturalScale * 120 + 14.2, dirY * config.naturalScale * 120 - 62.7) * (0.28 + config.swirl * 3.6 + config.warp * 1.7 + config.turbulence * 0.95);
    const spiral = Math.atan2(dirY + curl * (0.18 + config.swirl * 0.42), dirX - curl * (0.14 + config.swirl * 0.34));
    const ringBase = radial * (12 + config.ringTightness * 32) + spiral * (1.8 + config.swirl * 10.5) + curl * (0.45 + config.swirl * 1.35);
    const ringNoise = runtime.simplexBase.noise2D(dirX * config.naturalScale * 300 - 41.3, dirY * config.naturalScale * 300 + 22.9) * (0.34 + config.ringVariance * 1.85 + config.turbulence * 0.55) + runtime.simplexDetail.noise2D(dirX * config.naturalScale * 540 + 80.2, dirY * config.naturalScale * 540 - 37.1) * (0.08 + config.ringVariance * 0.76 + config.turbulence * 0.2);
    const contourFold = runtime.simplexWarp.noise2D(dirX * config.naturalScale * 180 - 22.6, dirY * config.naturalScale * 180 + 61.8) * (0.12 + config.swirl * 0.44 + config.ringVariance * 0.18);
    const rings = 0.5 + 0.5 * Math.sin((ringBase + ringNoise * (1.5 + config.ringVariance * 2.8) + contourFold * 2.4) * Math.PI);
    const nested = 0.5 + 0.5 * Math.sin((ringBase * (0.34 + config.ringTightness * 0.28) - ringNoise * (1.8 + config.ringVariance * 3.8)) * Math.PI);
    const tone = clamp01(0.18 + rings * 0.42 + nested * 0.28 + config.swirl * 0.04);
    return { ...stoneField, curl, spiral, ringBase, ringNoise, contourFold, rings, nested, tone };
  }

  function computeStoneColor(config, ringStructure) {
    const { clamp01, lerp } = global.RadenShared;
    let [r, g, b] = samplePalette(ringStructure.tone);
    const seamMask = Math.pow(clamp01(1 - Math.abs(ringStructure.rings * 2 - 1)), 2.8 + config.contrast * 4.2);
    const darkBands = clamp01((1 - ringStructure.nested) * (0.16 + config.contrast * 0.54));
    const paleBands = clamp01(ringStructure.nested * (0.08 + config.contrast * 0.14));
    r = Math.round(lerp(r, 198, paleBands * 0.22));
    g = Math.round(lerp(g, 229, paleBands * 0.26));
    b = Math.round(lerp(b, 190, paleBands * 0.16));
    const seamMix = clamp01(seamMask * (0.56 + config.contrast * 0.24) + darkBands * 0.52);
    return {
      r: Math.round(lerp(r, SEAM_COLOR[0], seamMix)),
      g: Math.round(lerp(g, SEAM_COLOR[1], seamMix)),
      b: Math.round(lerp(b, SEAM_COLOR[2], seamMix)),
      a: 255,
    };
  }

  function createMalachiteRenderer(rawConfig, runtime) {
    const config = normalizeMalachiteConfig(rawConfig);
    if (!runtime?.simplexBase || !runtime.simplexWarp || !runtime.simplexDetail) {
      throw new TypeError("Malachite renderer requires three simplex samplers.");
    }
    const mapAuthoredPalette = typeof runtime.mapAuthoredPalette === "function" ? runtime.mapAuthoredPalette : (pixel) => pixel;
    function execute(point, stageState, diagnostics) {
      const stoneField = computeStoneField(config, point);
      const ringStructure = computeRings(config, runtime, stoneField);
      const nativeColor = computeStoneColor(config, ringStructure);
      const pixel = global.RadenStages.applyOptionalColorTransform(stageState, "authoredPalette", mapAuthoredPalette, nativeColor);
      return diagnostics ? { pixel, stages: { stoneField, rings: ringStructure, stone: nativeColor, authoredPalette: pixel } } : pixel;
    }
    return global.RadenStages.createPixelStageRenderer({
      modeId: "malachiteflow",
      stages: MALACHITE_FLOW_STAGES,
      runtime,
      config,
      execute,
    });
  }

  const api = { normalizeMalachiteConfig, createMalachiteRenderer, computeStoneField, computeRings, computeStoneColor, stages: MALACHITE_FLOW_STAGES };
  global.RadenMalachiteFlow = Object.assign({}, global.RadenMalachiteFlow || {}, api);
  global.RadenModes?.registerRuntime?.("malachiteflow", {
    normalizeConfig: normalizeMalachiteConfig,
    createRenderer: createMalachiteRenderer,
    stages: MALACHITE_FLOW_STAGES,
    externalInputs: ["point", "runtime"],
  });
})(window);
