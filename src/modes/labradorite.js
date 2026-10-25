/* Labradorite Flash procedural stages and renderer contract. */
(function registerRadenLabradorite(global) {
  const MODE_MANIFEST = Object.freeze({
    id: "labradorite",
    order: 2,
    label: "Labradorite Flash",
    status: "stable",
    family: "procedural",
    activeControlIds: [
      "labradoriteScale",
      "labradoriteDirection",
      "labradoriteBanding",
      "labradoriteFlash",
      "labradoriteDarkness",
      "nacrePalette",
    ],
  });

  const LABRADORITE_STAGES = Object.freeze([
    { id: "stoneField", label: "Stone field", kind: "field", inputs: ["point", "runtime"], outputs: ["stoneField"], controlIds: ["labradoriteScale"] },
    { id: "directionalBands", label: "Directional bands", kind: "geometry", inputs: ["point", "stoneField"], outputs: ["bandStructure"], controlIds: ["labradoriteDirection", "labradoriteBanding"] },
    { id: "flash", label: "Labradorescence flash", kind: "material", inputs: ["point", "bandStructure", "runtime"], outputs: ["flashColor"], controlIds: ["labradoriteFlash"], interfaceId: "materialSource", interfaceBindings: { outputColor: "flashColor" } },
    { id: "matrix", label: "Dark stone matrix", kind: "composite", inputs: ["flashColor", "bandStructure"], outputs: ["nativeColor"], controlIds: ["labradoriteDarkness"], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "flashColor", output: "nativeColor", description: "Forward the labradorescence contribution without the dark stone matrix." } },
    { id: "authoredPalette", label: "Authored palette mapping", kind: "material", inputs: ["nativeColor"], outputs: ["pixel"], controlIds: ["nacrePalette"], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "nativeColor", output: "pixel", description: "Return native Labradorite color unchanged." } },
  ]);
  const INSPECTOR_DEFINITION = Object.freeze({
    rootId: "labradoriteStageInspector",
    groups: Object.freeze([
      { id: "palette", graphStageId: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
      { id: "base", graphStageId: "stoneField", label: "Base Structure", controlIds: ["labradoriteScale"] },
      { id: "flow", graphStageId: "directionalBands", label: "Shape and Flow", controlIds: ["labradoriteDirection", "labradoriteBanding"] },
      { id: "material", graphStageId: "flash", label: "Material Response", controlIds: ["labradoriteFlash"] },
      { id: "mapping", graphStageId: "matrix", label: "Material Mapping", controlIds: ["labradoriteDarkness"] },
    ]),
  });
  const RANDOMIZATION_DEFINITION = Object.freeze({
    controls: Object.freeze([
      { controlId: "labradoriteScale", type: "number", min: 0.003, max: 0.016, decimals: 3 },
      { controlId: "labradoriteDirection", type: "number", min: 0, max: 1, decimals: 2 },
      { controlId: "labradoriteBanding", type: "number", min: 0.7, max: 2.6, decimals: 2 },
      { controlId: "labradoriteFlash", type: "number", min: 0.7, max: 2.2, decimals: 2 },
      { controlId: "labradoriteDarkness", type: "number", min: 0.45, max: 0.92, decimals: 2 },
    ]),
  });

  function normalizeLabradoriteConfig(rawConfig) {
    const raw = rawConfig || {};
    const direction = global.RadenShared.finiteOr(raw.labradoriteDirection, 0.33) * Math.PI * 2;
    return Object.assign({}, raw, {
      scale: Math.max(0.002, global.RadenShared.finiteOr(raw.labradoriteScale, 0.008)),
      bandSharpness: Math.max(0.4, global.RadenShared.finiteOr(raw.labradoriteBanding, 1.6)),
      flashStrength: Math.max(0, global.RadenShared.finiteOr(raw.labradoriteFlash, 1.35)),
      baseDarkness: global.RadenShared.clamp01(global.RadenShared.finiteOr(raw.labradoriteDarkness, 0.68)),
      direction,
      dirX: Math.cos(direction),
      dirY: Math.sin(direction),
    });
  }

  function computeStoneField(config, runtime, point) {
    const { nx, ny } = point;
    const nBase = runtime.simplex.noise2D((nx + 0.5) * 680 * config.scale, (ny + 0.5) * 680 * config.scale);
    const nDetail = runtime.simplex.noise2D((nx + 1.8) * 1400 * config.scale, (ny - 2.4) * 1400 * config.scale) * 0.45;
    return { nBase, nDetail, field: nBase * 0.75 + nDetail * 0.25 };
  }

  function computeDirectionalBands(config, point, stoneField) {
    const { clamp01 } = global.RadenShared;
    const { nx, ny } = point;
    const directionBand = nx * config.dirX + ny * config.dirY;
    const band = Math.pow(
      Math.abs(Math.sin((directionBand * (36 + config.bandSharpness * 22) + stoneField.field * 2.1) * Math.PI)),
      1.2 + config.bandSharpness,
    );
    const flashMask = clamp01(band * (0.4 + config.flashStrength * 0.42) + clamp01((stoneField.field + 1) / 2) * 0.16);
    return { ...stoneField, directionBand, band, flashMask };
  }

  function computeFlash(config, runtime, point, bandStructure) {
    const { clamp01, hslToRgb } = global.RadenShared;
    const { nx, ny } = point;
    const { field, directionBand, flashMask } = bandStructure;
    const hue = (178 + field * 48 + directionBand * 90 + 360) % 360;
    const sat = Math.min(100, 42 + config.flashStrength * 28 + flashMask * 20);
    const lum = Math.min(88, 18 + flashMask * 52);
    const [fr, fg, fb] = hslToRgb(hue, sat, lum);
    const spark = Math.pow(clamp01((runtime.simplex.noise2D((nx + 4.2) * 2600, (ny - 1.3) * 2600) + 1) / 2), 18) * config.flashStrength * 170;
    return { r: fr * flashMask + spark * 0.45, g: fg * flashMask + spark * 0.8, b: fb * flashMask + spark, fr, fg, fb, flashMask, hue, sat, lum, spark };
  }

  function compositeMatrix(config, flashColor) {
    const base = 8 + (1 - config.baseDarkness) * 24;
    let r = base;
    let g = base + 2;
    let b = base + 5;
    r = r * (1 - flashColor.flashMask) + flashColor.fr * flashColor.flashMask;
    g = g * (1 - flashColor.flashMask) + flashColor.fg * flashColor.flashMask;
    b = b * (1 - flashColor.flashMask) + flashColor.fb * flashColor.flashMask;
    return {
      r: r + flashColor.spark * 0.45,
      g: g + flashColor.spark * 0.8,
      b: b + flashColor.spark,
      a: 255,
    };
  }

  function createLabradoriteRenderer(rawConfig, runtime) {
    const config = normalizeLabradoriteConfig(rawConfig);
    if (!runtime?.simplex || typeof runtime.simplex.noise2D !== "function") {
      throw new TypeError("Labradorite renderer requires a simplex sampler.");
    }
    const mapAuthoredPalette = typeof runtime.mapAuthoredPalette === "function" ? runtime.mapAuthoredPalette : (pixel) => pixel;

    function execute(point, stageState, diagnostics) {
      const stoneField = computeStoneField(config, runtime, point);
      const bandStructure = computeDirectionalBands(config, point, stoneField);
      const flashColor = computeFlash(config, runtime, point, bandStructure);
      const nativeColor = stageState.isEnabled("matrix") ? compositeMatrix(config, flashColor) : { r: flashColor.r, g: flashColor.g, b: flashColor.b, a: 255 };
      const pixel = global.RadenStages.applyOptionalColorTransform(stageState, "authoredPalette", mapAuthoredPalette, nativeColor);
      return diagnostics ? { pixel, stages: { stoneField, directionalBands: bandStructure, flash: flashColor, matrix: nativeColor, authoredPalette: pixel } } : pixel;
    }

    return global.RadenStages.createPixelStageRenderer({
      modeId: "labradorite",
      stages: LABRADORITE_STAGES,
      runtime,
      config,
      execute,
    });
  }

  const api = { normalizeLabradoriteConfig, createLabradoriteRenderer, computeStoneField, computeDirectionalBands, computeFlash, compositeMatrix, stages: LABRADORITE_STAGES, INSPECTOR_DEFINITION, RANDOMIZATION_DEFINITION };
  global.RadenLabradorite = Object.assign({}, global.RadenLabradorite || {}, api);
  global.RadenModes?.registerTextureModule?.(MODE_MANIFEST, {
    normalizeConfig: normalizeLabradoriteConfig,
    createRenderer: createLabradoriteRenderer,
    stages: LABRADORITE_STAGES,
    inspector: INSPECTOR_DEFINITION,
    randomization: RANDOMIZATION_DEFINITION,
    externalInputs: ["point", "runtime"],
  });
})(window);
