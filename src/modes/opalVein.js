/* Opal Vein procedural stages and renderer contract. */
(function registerRadenOpalVein(global) {
  const MODE_MANIFEST = Object.freeze({
    id: "opalvein",
    order: 1,
    label: "Opal Vein",
    status: "stable",
    family: "procedural",
    activeControlIds: [
      "opalCellScale",
      "opalVeinDensity",
      "opalFire",
      "opalMatrix",
      "nacrePalette",
    ],
  });

  const OPAL_VEIN_STAGES = Object.freeze([
    { id: "cellField", label: "Opal cells and veins", kind: "geometry", inputs: ["point", "runtime"], outputs: ["cellStructure"], controlIds: ["opalCellScale", "opalVeinDensity"] },
    { id: "fire", label: "Opal fire", kind: "material", inputs: ["cellStructure", "runtime"], outputs: ["fireColor"], controlIds: ["opalFire"], interfaceId: "materialSource", interfaceBindings: { outputColor: "fireColor" } },
    { id: "matrix", label: "Host matrix", kind: "composite", inputs: ["fireColor", "cellStructure"], outputs: ["nativeColor"], controlIds: ["opalMatrix"], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "fireColor", output: "nativeColor", description: "Forward the opal fire contribution without the host matrix." } },
    { id: "authoredPalette", label: "Authored palette mapping", kind: "material", inputs: ["nativeColor"], outputs: ["pixel"], controlIds: ["nacrePalette"], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "nativeColor", output: "pixel", description: "Return native Opal Vein color unchanged." } },
  ]);
  const INSPECTOR_DEFINITION = Object.freeze({
    rootId: "opalVeinStageInspector",
    groups: Object.freeze([
      { id: "palette", graphStageId: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
      { id: "base", graphStageId: "cellField", label: "Base Structure", controlIds: ["opalCellScale"] },
      { id: "flow", graphStageId: "cellField", label: "Shape and Flow", controlIds: ["opalVeinDensity"] },
      { id: "material", graphStageId: "fire", label: "Material Response", controlIds: ["opalFire"] },
      { id: "mapping", graphStageId: "matrix", label: "Material Mapping", controlIds: ["opalMatrix"] },
    ]),
  });
  const RANDOMIZATION_DEFINITION = Object.freeze({
    controls: Object.freeze([
      { controlId: "opalCellScale", type: "number", min: 0.004, max: 0.018, decimals: 3 },
      { controlId: "opalVeinDensity", type: "number", min: 0.35, max: 1.6, decimals: 2 },
      { controlId: "opalFire", type: "number", min: 0.65, max: 2.1, decimals: 2 },
      { controlId: "opalMatrix", type: "number", min: 0.25, max: 0.85, decimals: 2 },
    ]),
  });

  function normalizeOpalConfig(rawConfig) {
    const raw = rawConfig || {};
    return Object.assign({}, raw, {
      cellScale: Math.max(0.002, global.RadenShared.finiteOr(raw.opalCellScale, 0.009)),
      veinDensity: Math.max(0, global.RadenShared.finiteOr(raw.opalVeinDensity, 0.85)),
      fireIntensity: Math.max(0, global.RadenShared.finiteOr(raw.opalFire, 1.2)),
      matrix: global.RadenShared.clamp01(global.RadenShared.finiteOr(raw.opalMatrix, 0.52)),
    });
  }

  function computeCellField(config, runtime, point) {
    const { clamp01, smoothstep } = global.RadenShared;
    const { nx, ny } = point;
    const n1 = runtime.simplex.noise2D(nx * 420 * config.cellScale, ny * 420 * config.cellScale);
    const n2 = runtime.simplex.noise2D((nx + 12.37) * 820 * config.cellScale, (ny - 5.91) * 820 * config.cellScale) * 0.5;
    const cells = clamp01((n1 * 0.75 + n2 * 0.25 + 1) / 2);
    const veins = Math.pow(Math.abs(Math.sin((cells * 10 + n1 * 3.5) * Math.PI)), 1.6 + config.veinDensity * 1.4);
    const edge = smoothstep(0.62 - config.veinDensity * 0.18, 0.92, veins);
    return { n1, n2, cells, veins, edge };
  }

  function computeFire(config, runtime, point, cellStructure) {
    const { clamp01, hslToRgb } = global.RadenShared;
    const { nx, ny } = point;
    const { cells, n2, edge } = cellStructure;
    const fireHue = (cells * 360 + n2 * 120 + 360) % 360;
    const fireSat = Math.min(100, 45 + config.fireIntensity * 34 + edge * 14);
    const fireLum = Math.min(90, 26 + edge * 42 + config.fireIntensity * 8);
    const [fr, fg, fb] = hslToRgb(fireHue, fireSat, fireLum);
    const fireMask = clamp01(edge * (0.58 + config.fireIntensity * 0.25));
    const sparkle = Math.pow(clamp01((runtime.simplex.noise2D(nx * 1800, ny * 1800) + 1) / 2), 16) * config.fireIntensity * 140;
    return { r: fr * fireMask + sparkle * 0.65, g: fg * fireMask + sparkle * 0.92, b: fb * fireMask + sparkle, fireHue, fireSat, fireLum, fireMask, sparkle };
  }

  function compositeMatrix(config, fireColor) {
    const darkBase = 14 + config.matrix * 24;
    return {
      r: darkBase * (1 - fireColor.fireMask) + fireColor.r,
      g: (darkBase + 2) * (1 - fireColor.fireMask) + fireColor.g,
      b: (darkBase + 5) * (1 - fireColor.fireMask) + fireColor.b,
      a: 255,
    };
  }

  function createOpalRenderer(rawConfig, runtime) {
    const config = normalizeOpalConfig(rawConfig);
    if (!runtime?.simplex || typeof runtime.simplex.noise2D !== "function") {
      throw new TypeError("Opal Vein renderer requires a simplex sampler.");
    }
    const mapAuthoredPalette = typeof runtime.mapAuthoredPalette === "function" ? runtime.mapAuthoredPalette : (pixel) => pixel;

    function execute(point, stageState, diagnostics) {
      const cellStructure = computeCellField(config, runtime, point);
      const fireColor = computeFire(config, runtime, point, cellStructure);
      const nativeColor = stageState.isEnabled("matrix") ? compositeMatrix(config, fireColor) : { r: fireColor.r, g: fireColor.g, b: fireColor.b, a: 255 };
      const pixel = global.RadenStages.applyOptionalColorTransform(stageState, "authoredPalette", mapAuthoredPalette, nativeColor);
      return diagnostics ? { pixel, stages: { cellField: cellStructure, fire: fireColor, matrix: nativeColor, authoredPalette: pixel } } : pixel;
    }

    return global.RadenStages.createPixelStageRenderer({
      modeId: "opalvein",
      stages: OPAL_VEIN_STAGES,
      runtime,
      config,
      execute,
    });
  }

  const api = { normalizeOpalConfig, createOpalRenderer, computeCellField, computeFire, compositeMatrix, stages: OPAL_VEIN_STAGES, INSPECTOR_DEFINITION, RANDOMIZATION_DEFINITION };
  global.RadenOpalVein = Object.assign({}, global.RadenOpalVein || {}, api);
  global.RadenModes?.registerTextureModule?.(MODE_MANIFEST, {
    normalizeConfig: normalizeOpalConfig,
    createRenderer: createOpalRenderer,
    stages: OPAL_VEIN_STAGES,
    inspector: INSPECTOR_DEFINITION,
    randomization: RANDOMIZATION_DEFINITION,
    externalInputs: ["point", "runtime"],
  });
})(window);
