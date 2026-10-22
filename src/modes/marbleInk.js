/* Marble Ink procedural stages and renderer contract. */
(function registerRadenMarbleInk(global) {
  const MARBLE_INK_STAGES = Object.freeze([
    { id: "flowField", label: "Marble flow field", kind: "field", inputs: ["point", "runtime"], outputs: ["flowField"], controlIds: ["marbleFlowScale", "marbleInkDrift"] },
    { id: "veins", label: "Stone veins", kind: "geometry", inputs: ["flowField"], outputs: ["veinStructure"], controlIds: ["marbleVeinFreq", "marbleContrast"] },
    { id: "stone", label: "Stone material", kind: "material", inputs: ["veinStructure", "runtime"], outputs: ["nativeColor"], controlIds: ["marbleContrast", "marbleLightness"], interfaceId: "materialSource" },
    { id: "authoredPalette", label: "Authored palette mapping", kind: "material", inputs: ["nativeColor"], outputs: ["pixel"], controlIds: ["nacrePalette"], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "nativeColor", output: "pixel", description: "Return native Marble Ink color unchanged." } },
  ]);

  function normalizeMarbleConfig(rawConfig) {
    const raw = rawConfig || {};
    return Object.assign({}, raw, {
      flowScale: Math.max(0.002, global.RadenShared.finiteOr(raw.marbleFlowScale, 0.007)),
      veinFreq: Math.max(0.2, global.RadenShared.finiteOr(raw.marbleVeinFreq, 1.2)),
      contrast: Math.max(0, global.RadenShared.finiteOr(raw.marbleContrast, 0.78)),
      inkDrift: global.RadenShared.clamp01(global.RadenShared.finiteOr(raw.marbleInkDrift, 0.42)),
      stoneLightness: global.RadenShared.clamp01(global.RadenShared.finiteOr(raw.marbleLightness, 0.72)),
    });
  }

  function computeFlowField(config, runtime, point) {
    const { nx, ny } = point;
    const warp1 = runtime.simplex.noise2D(nx * 900 * config.flowScale, ny * 900 * config.flowScale) * config.inkDrift * 0.32;
    const warp2 = runtime.simplex.noise2D((nx + 4.7) * 1600 * config.flowScale, (ny - 1.8) * 1600 * config.flowScale) * config.inkDrift * 0.18;
    const px = nx + warp1;
    const py = ny + warp2;
    const n = runtime.simplex.noise2D(px * 1200 * config.flowScale, py * 1200 * config.flowScale);
    const n2 = runtime.simplex.noise2D((px + 2.3) * 2400 * config.flowScale, (py - 2.1) * 2400 * config.flowScale) * 0.4;
    return { warp1, warp2, px, py, n, n2, flow: n * 0.7 + n2 * 0.3 };
  }

  function computeVeins(config, flowField) {
    const vein = Math.pow(
      Math.abs(Math.sin((flowField.flow * config.veinFreq * 4.2 + flowField.py * 3.2) * Math.PI)),
      1.4 + config.contrast * 1.7,
    );
    const veinMask = global.RadenShared.smoothstep(0.62 - config.contrast * 0.2, 0.96, vein);
    return { ...flowField, vein, veinMask };
  }

  function computeStoneColor(config, runtime, veinStructure) {
    const { clamp01 } = global.RadenShared;
    const { px, py, flow, veinMask } = veinStructure;
    const stone = Math.round(145 + config.stoneLightness * 92 + flow * 9);
    let r = stone;
    let g = stone - 4;
    let b = stone - 10;
    const warmVein = 42 + config.contrast * 38;
    r = r * (1 - veinMask) + warmVein * veinMask;
    g = g * (1 - veinMask) + (warmVein - 10) * veinMask;
    b = b * (1 - veinMask) + (warmVein - 18) * veinMask;
    const cloud = clamp01((runtime.simplex.noise2D(px * 400 * config.flowScale, py * 400 * config.flowScale) + 1) / 2);
    return { r: r + cloud * 14, g: g + cloud * 11, b: b + cloud * 7, a: 255 };
  }

  function createMarbleRenderer(rawConfig, runtime) {
    const config = normalizeMarbleConfig(rawConfig);
    if (!runtime?.simplex || typeof runtime.simplex.noise2D !== "function") {
      throw new TypeError("Marble Ink renderer requires a simplex sampler.");
    }
    const mapAuthoredPalette = typeof runtime.mapAuthoredPalette === "function" ? runtime.mapAuthoredPalette : (pixel) => pixel;

    function execute(point, stageState, diagnostics) {
      const flowField = computeFlowField(config, runtime, point);
      const veinStructure = computeVeins(config, flowField);
      const nativeColor = computeStoneColor(config, runtime, veinStructure);
      const pixel = global.RadenStages.applyOptionalColorTransform(stageState, "authoredPalette", mapAuthoredPalette, nativeColor);
      return diagnostics ? { pixel, stages: { flowField, veins: veinStructure, stone: nativeColor, authoredPalette: pixel } } : pixel;
    }

    return global.RadenStages.createPixelStageRenderer({
      modeId: "marbleink",
      stages: MARBLE_INK_STAGES,
      runtime,
      config,
      execute,
    });
  }

  const api = { normalizeMarbleConfig, createMarbleRenderer, computeFlowField, computeVeins, computeStoneColor, stages: MARBLE_INK_STAGES };
  global.RadenMarbleInk = Object.assign({}, global.RadenMarbleInk || {}, api);
  global.RadenModes?.registerRuntime?.("marbleink", {
    normalizeConfig: normalizeMarbleConfig,
    createRenderer: createMarbleRenderer,
    stages: MARBLE_INK_STAGES,
    externalInputs: ["point", "runtime"],
  });
})(window);
