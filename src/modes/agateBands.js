/* Agate Bands procedural stages and renderer contract. */
(function registerRadenAgateBands(global) {
  const AGATE_BANDS_STAGES = Object.freeze([
    { id: "stoneField", label: "Warped stone field", kind: "field", inputs: ["point", "runtime"], outputs: ["stoneField"], controlIds: ["naturalScale", "naturalWarp"] },
    { id: "bands", label: "Agate bands", kind: "geometry", inputs: ["stoneField"], outputs: ["bandStructure"], controlIds: ["agateBandFreq", "agateBandJitter"] },
    { id: "veins", label: "Mineral veins", kind: "geometry", inputs: ["bandStructure"], outputs: ["veinStructure"], controlIds: ["agateVeinDensity", "agateEdgeDarken"] },
    { id: "stone", label: "Translucent stone", kind: "material", inputs: ["veinStructure"], outputs: ["nativeColor"], controlIds: ["agateTranslucency"], interfaceId: "materialSource" },
    { id: "authoredPalette", label: "Authored palette mapping", kind: "material", inputs: ["nativeColor"], outputs: ["pixel"], controlIds: ["nacrePalette"], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "nativeColor", output: "pixel", description: "Return native Agate Bands color unchanged." } },
  ]);
  const PALETTE = Object.freeze([
    Object.freeze([64, 40, 30]),
    Object.freeze([139, 92, 67]),
    Object.freeze([214, 170, 129]),
    Object.freeze([238, 225, 205]),
  ]);
  const SEAM_COLOR = Object.freeze([89, 48, 36]);

  function normalizeAgateConfig(rawConfig) {
    const raw = rawConfig || {};
    return Object.assign({}, raw, {
      naturalScale: Math.max(0.0005, global.RadenShared.finiteOr(raw.naturalScale, 0.008)),
      warp: global.RadenShared.clamp01(global.RadenShared.finiteOr(raw.naturalWarp, 0.35)),
      bandFreq: Math.max(0.2, global.RadenShared.finiteOr(raw.agateBandFreq, 1.18)),
      bandJitter: global.RadenShared.clamp01(global.RadenShared.finiteOr(raw.agateBandJitter, 0.34)),
      veinDensity: Math.max(0, global.RadenShared.finiteOr(raw.agateVeinDensity, 0.74)),
      translucency: global.RadenShared.clamp01(global.RadenShared.finiteOr(raw.agateTranslucency, 0.58)),
      edgeDarken: global.RadenShared.clamp01(global.RadenShared.finiteOr(raw.agateEdgeDarken, 0.52)),
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

  function computeStoneField(config, runtime, point) {
    const { nx, ny } = point;
    const radial = Math.hypot(nx * (1.02 + config.bandJitter * 0.6), ny * (0.9 + config.translucency * 0.24));
    const swirl = runtime.simplexWarp.noise2D(nx * config.naturalScale * 95 + 12.1, ny * config.naturalScale * 95 - 8.6) * (0.6 + config.warp * 2.9 + config.bandJitter * 0.4);
    const drift = runtime.simplexBase.noise2D(nx * config.naturalScale * 240 - 33.4, ny * config.naturalScale * 240 + 18.7) * config.bandJitter * (1.4 + config.bandJitter * 3.6);
    const detail = runtime.simplexDetail.noise2D(nx * config.naturalScale * 410 + 91.2, ny * config.naturalScale * 410 - 57.4) * (0.16 + config.veinDensity * 0.56);
    const fineVein = runtime.simplexBase.noise2D(nx * config.naturalScale * 720 - 11.8, ny * config.naturalScale * 720 + 54.7) * (0.08 + config.veinDensity * 0.42);
    return { radial, swirl, drift, detail, fineVein };
  }

  function computeBands(config, stoneField) {
    const { clamp01 } = global.RadenShared;
    const { radial, swirl, drift, detail, fineVein } = stoneField;
    const stratified = radial * (10 + config.bandFreq * 30) + swirl * (2.1 + config.bandFreq * 1.8) + drift * (1.8 + config.bandJitter * 4.2);
    const bands = 0.5 + 0.5 * Math.sin(stratified * Math.PI);
    const secondary = 0.5 + 0.5 * Math.sin((stratified * (0.42 + config.translucency * 0.22) + detail * (3.8 + config.veinDensity * 3.2) + fineVein * 4.6) * Math.PI);
    const glow = clamp01(0.36 + bands * (0.22 + config.translucency * 0.16) + secondary * (0.1 + config.translucency * 0.3) + detail * (0.08 + config.veinDensity * 0.22));
    return { ...stoneField, stratified, bands, secondary, glow };
  }

  function computeVeins(config, bandStructure) {
    const { clamp01 } = global.RadenShared;
    const { bands, secondary, detail, fineVein } = bandStructure;
    const seamMask = Math.pow(clamp01(1 - Math.abs(bands * 2 - 1)), 3.8 + config.edgeDarken * 2.4 + config.veinDensity * 2.2);
    const veinMask = Math.pow(clamp01(0.44 + detail * 1.18 + fineVein * 0.72 - secondary * 0.22), 1.2 + config.veinDensity * 3.1);
    const internalGlow = clamp01(secondary * (0.18 + config.translucency * 0.72) + (1 - seamMask) * 0.12);
    const seamStrength = clamp01(seamMask * (0.18 + config.edgeDarken * 0.98) + veinMask * (0.06 + config.veinDensity * 0.52));
    return { ...bandStructure, seamMask, veinMask, internalGlow, seamStrength };
  }

  function computeStoneColor(config, veinStructure) {
    const { lerp, hslToRgb } = global.RadenShared;
    let [r, g, b] = samplePalette(veinStructure.glow);
    const [gr, gg, gb] = hslToRgb(36, 42, 62 + veinStructure.internalGlow * 12);
    r = Math.round(lerp(r, gr, config.translucency * 0.08 + veinStructure.internalGlow * 0.2));
    g = Math.round(lerp(g, gg, config.translucency * 0.08 + veinStructure.internalGlow * 0.18));
    b = Math.round(lerp(b, gb, config.translucency * 0.06 + veinStructure.internalGlow * 0.14));
    return {
      r: Math.round(lerp(r, SEAM_COLOR[0], veinStructure.seamStrength)),
      g: Math.round(lerp(g, SEAM_COLOR[1], veinStructure.seamStrength)),
      b: Math.round(lerp(b, SEAM_COLOR[2], veinStructure.seamStrength)),
      a: 255,
    };
  }

  function createAgateRenderer(rawConfig, runtime) {
    const config = normalizeAgateConfig(rawConfig);
    if (!runtime?.simplexBase || !runtime.simplexWarp || !runtime.simplexDetail) {
      throw new TypeError("Agate renderer requires three simplex samplers.");
    }
    const mapAuthoredPalette = typeof runtime.mapAuthoredPalette === "function" ? runtime.mapAuthoredPalette : (pixel) => pixel;
    function execute(point, stageState, diagnostics) {
      const stoneField = computeStoneField(config, runtime, point);
      const bandStructure = computeBands(config, stoneField);
      const veinStructure = computeVeins(config, bandStructure);
      const nativeColor = computeStoneColor(config, veinStructure);
      const pixel = global.RadenStages.applyOptionalColorTransform(stageState, "authoredPalette", mapAuthoredPalette, nativeColor);
      return diagnostics ? { pixel, stages: { stoneField, bands: bandStructure, veins: veinStructure, stone: nativeColor, authoredPalette: pixel } } : pixel;
    }
    return global.RadenStages.createPixelStageRenderer({
      modeId: "agateband",
      stages: AGATE_BANDS_STAGES,
      runtime,
      config,
      execute,
    });
  }

  const api = { normalizeAgateConfig, createAgateRenderer, computeStoneField, computeBands, computeVeins, computeStoneColor, stages: AGATE_BANDS_STAGES };
  global.RadenAgateBands = Object.assign({}, global.RadenAgateBands || {}, api);
  global.RadenModes?.registerRuntime?.("agateband", {
    normalizeConfig: normalizeAgateConfig,
    createRenderer: createAgateRenderer,
    stages: AGATE_BANDS_STAGES,
    externalInputs: ["point", "runtime"],
  });
})(window);
