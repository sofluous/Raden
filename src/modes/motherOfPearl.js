/* Mother of Pearl procedural field helpers.
 * Exposed via window.RadenNacre while the renderer remains in the static shell.
 */
(function registerRadenNacre(global) {
  const MODE_MANIFEST = Object.freeze({
    id: "motherofpearl",
    order: 0,
    label: "Mother of Pearl",
    status: "stable",
    family: "procedural",
    activeControlIds: [
      "scale",
      "layers",
      "flowMode",
      "layerLength",
      "ringSpacing",
      "ringJitter",
      "seamThickness",
      "seamContrast",
      "highlightStrength",
      "lightAngle",
      "lightCurvature",
      "lightSpread",
      "scratchDensity",
      "scratchAngle",
      "surfacePolish",
      "blend",
      "intensity",
      "range",
      "substrateTone",
      "substrateMix",
      "nacrePalette",
      "nacreBrilliance",
      "nacreChromatic",
      "textureFamily",
    ],
  });

  const NACRE_STAGES = Object.freeze([
    {
      id: "sampling",
      label: "Coordinates and directional modulation",
      kind: "coordinates",
      inputs: ["point", "lightVec"],
      outputs: ["angleInfluence", "highlightBoost", "samplePosition"],
      controlIds: ["flowMode", "layerLength", "lightAngle", "lightCurvature", "lightSpread", "highlightStrength"],
    },
    {
      id: "noise",
      label: "Flow noise",
      kind: "field",
      inputs: ["samplePosition"],
      outputs: ["noise"],
      controlIds: ["scale", "layers"],
    },
    {
      id: "growth",
      label: "Growth bands and seams",
      kind: "geometry",
      inputs: ["point", "noise", "angleInfluence", "highlightBoost"],
      outputs: ["growthField", "seamField", "lightingField"],
      controlIds: ["flowMode", "layerLength", "ringSpacing", "ringJitter", "seamThickness", "highlightStrength", "lightSpread"],
    },
    {
      id: "family",
      label: "Texture family modulation",
      kind: "geometry",
      inputs: ["growthField", "seamField", "noise", "point"],
      outputs: ["familyBanding", "familySeam", "familyMaterialMultipliers"],
      controlIds: ["textureFamily"],
      optional: true,
      bypass: "Use unmodified growth bands and seams with neutral material multipliers.",
    },
    {
      id: "palette",
      label: "Nacre color mapping",
      kind: "material",
      inputs: ["growthField", "familyBanding", "familySeam", "lightingField"],
      outputs: ["nacreField", "baseColor"],
      controlIds: ["blend", "intensity", "range", "nacrePalette", "nacreBrilliance", "nacreChromatic"],
      interfaceId: "materialSource",
      interfaceBindings: { outputColor: "baseColor" },
    },
    {
      id: "surface",
      label: "Surface and microstructure",
      kind: "surface",
      inputs: ["baseColor", "familySeam", "nacreField", "noise", "point"],
      outputs: ["surfaceColor"],
      controlIds: ["seamContrast", "surfacePolish", "scratchDensity", "scratchAngle"],
      interfaceId: "colorTransform",
      optional: true,
      bypass: { type: "identity-color", input: "baseColor", output: "surfaceColor", description: "Forward palette RGB without seam shading, lift, or scratches." },
    },
    {
      id: "substrate",
      label: "Substrate composite",
      kind: "composite",
      inputs: ["surfaceColor", "nacreField", "familySeam", "highlightBoost"],
      outputs: ["pixel"],
      controlIds: ["substrateTone", "substrateMix", "highlightStrength"],
      interfaceId: "colorTransform",
      optional: true,
      bypass: { type: "identity-color", input: "surfaceColor", output: "pixel", description: "Return surface RGB directly at full opacity." },
    },
  ]);
  const INSPECTOR_DEFINITION = Object.freeze({
    rootId: "motherOfPearlStageInspector",
    groups: Object.freeze([
      { id: "palette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
      { id: "iridescence", graphStageId: "palette", label: "Iridescence", controlIds: ["range", "blend", "intensity", "nacreBrilliance", "nacreChromatic"] },
      { id: "family", label: "Texture Family", controlIds: ["textureFamily"] },
      { id: "noise", label: "Base Structure", controlIds: ["scale", "layers"] },
      { id: "growth", label: "Shape and Flow", controlIds: ["flowMode", "layerLength", "ringSpacing", "ringJitter", "seamThickness"] },
      { id: "substrate", label: "Material Mapping", controlIds: ["substrateTone", "substrateMix"], toggleable: true },
      { id: "surface", label: "Surface Detail", controlIds: ["seamContrast", "scratchDensity", "scratchAngle", "surfacePolish"], toggleable: true },
      { id: "direction", graphStageId: "sampling", label: "Directional Modulation", controlIds: ["lightAngle", "lightCurvature", "lightSpread", "highlightStrength"] },
    ]),
  });
  const RANDOMIZATION_DEFINITION = Object.freeze({
    controls: Object.freeze([
      { controlId: "flowMode", type: "choice", values: ["circular", "linear"] },
      { controlId: "ringSpacing", type: "number", min: 0.35, max: 1.8, decimals: 2 },
      { controlId: "ringJitter", type: "number", min: 0.05, max: 0.9, decimals: 2 },
      { controlId: "seamThickness", type: "number", min: 0.05, max: 0.3, decimals: 2 },
      { controlId: "seamContrast", type: "number", min: 0.15, max: 0.95, decimals: 2 },
      { controlId: "highlightStrength", type: "number", min: 0.2, max: 1.5, decimals: 2 },
      { controlId: "lightAngle", type: "number", min: 0, max: 1, decimals: 2 },
      { controlId: "lightCurvature", type: "number", min: 0.06, max: 0.95, decimals: 2 },
      { controlId: "lightSpread", type: "number", min: 0.15, max: 0.95, decimals: 2 },
      { controlId: "scratchDensity", type: "number", min: 0.05, max: 0.92, decimals: 2 },
      { controlId: "scratchAngle", type: "number", min: 0, max: 1, decimals: 2 },
      { controlId: "surfacePolish", type: "number", min: 0.1, max: 0.95, decimals: 2 },
      { controlId: "nacreBrilliance", type: "number", min: 0.9, max: 1.9, decimals: 2 },
      { controlId: "nacreChromatic", type: "number", min: 0.5, max: 1.8, decimals: 2 },
      { controlId: "textureFamily", type: "choice", values: ["classic", "opal", "labradorite"] },
      { controlId: "substrateTone", type: "choice", values: ["dark", "light"] },
      { controlId: "substrateMix", type: "number", min: 0.2, max: 0.75, decimals: 2 },
    ]),
  });
  const NACRE_DEFAULTS = Object.freeze({
    layers: 3,
    scale: 0.006,
    blend: 1.4,
    layerLength: 1,
    ringSpacing: 0.5,
    ringJitter: 0.35,
    seamThickness: 0.2,
    seamContrast: 0.5,
    scratchDensity: 0.2,
    scratchAngle: 0,
    surfacePolish: 0.55,
    colorIntensity: 100,
    colorRange: 1,
    nacreBrilliance: 1,
    nacreChromatic: 1,
    substrateMix: 0.45,
    highlightStrength: 0.65,
    lightAngle: 0.5,
    lightCurvature: 0.28,
    lightSpread: 0.55,
  });

  function finiteOr(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function normalizeNacreConfig(rawConfig) {
    const raw = rawConfig || {};
    const config = Object.assign({}, raw);
    Object.keys(NACRE_DEFAULTS).forEach((key) => {
      config[key] = finiteOr(raw[key], NACRE_DEFAULTS[key]);
    });
    config.layers = Math.max(1, Math.floor(config.layers));
    config.flowMode = ["circular", "linear"].includes(raw.flowMode)
      ? raw.flowMode
      : "circular";
    config.textureFamily = ["classic", "opal", "labradorite"].includes(
      raw.textureFamily,
    )
      ? raw.textureFamily
      : "classic";
    config.substrateTone = raw.substrateTone === "dark" ? "dark" : "light";
    config.nacrePalette = raw.nacrePalette || "classic";
    return config;
  }

  function computeNacreSamplingFields(input) {
    const radial = Math.hypot(input.nx, input.ny);
    const curvedNx =
      input.nx + input.nx * radial * input.lightCurvature * 1.2;
    const curvedNy =
      input.ny + input.ny * radial * input.lightCurvature * 1.2;
    const angleInfluence =
      curvedNx * input.lightVec.x + curvedNy * input.lightVec.y;
    const bandFreq = 4 + (1 - input.lightSpread) * 18;
    const band = Math.sin(
      (curvedNx * input.lightVec.y - curvedNy * input.lightVec.x) *
        bandFreq *
        Math.PI,
    );
    const spreadDamp = Math.max(
      0.25,
      1 - radial * (0.35 + input.lightSpread * 0.45),
    );
    const highlightBoost = band * input.highlightStrength * spreadDamp;

    let px = input.x;
    let py = input.y;
    if (input.flowMode === "circular") {
      const dx = input.x - input.cx;
      const dy = input.y - input.cy;
      const theta = Math.atan2(dy, dx);
      px += Math.cos(theta) * input.layerLength * 40;
      py += Math.sin(theta) * input.layerLength * 40;
    } else if (input.flowMode === "linear") {
      px += input.layerLength * 40;
    }

    return { angleInfluence, highlightBoost, px, py };
  }

  function computeNacreGrowthFields(input) {
    const {
      nx,
      ny,
      noise,
      flowMode,
      layerLength,
      ringSpacing,
      ringJitter,
      seamThickness,
      angleInfluence,
      highlightStrength,
      lightSpread,
      highlightBoost,
    } = input;
    const { clamp01, smoothstep } = global.RadenShared;

    const growthAxis =
      flowMode === "circular"
        ? Math.hypot(nx, ny) * 2.2
        : (nx * 0.72 + ny * 0.28) * layerLength * 1.4;
    const structureDrift =
      noise * (0.12 + ringJitter * 1.05) +
      angleInfluence * (0.02 + highlightStrength * 0.08);
    const ringPhase =
      (growthAxis + structureDrift) * (10 + ringSpacing * 26);
    const ringWave = Math.sin(ringPhase * Math.PI);
    const seamMask = smoothstep(
      1 - seamThickness * 1.3,
      1,
      Math.abs(ringWave),
    );
    const seamFeather = smoothstep(
      0.32,
      0.96,
      Math.abs(
        Math.sin(
          (ringPhase * (0.56 + ringJitter * 0.42) + noise * 0.9) *
            Math.PI,
        ),
      ),
    );
    const geometricField = clamp01(
      (noise * (0.56 + ringJitter * 0.12) +
        ringWave * (0.5 + ringSpacing * 0.06) +
        1) /
        2,
    );
    const lightingField =
      angleInfluence * (0.24 + lightSpread * 0.22) +
      highlightBoost * (0.2 + highlightStrength * 0.12);
    const bandingField = clamp01(
      (Math.sin(
        (ringPhase + noise * (1.2 + ringJitter * 1.2)) * Math.PI,
      ) +
        1) /
        2,
    );

    return {
      growthAxis,
      structureDrift,
      ringPhase,
      ringWave,
      seamMask,
      seamFeather,
      geometricField,
      lightingField,
      bandingField,
    };
  }

  function computeNacreFamilyFields(input) {
    const {
      textureFamily,
      bandingField,
      seamMask,
      seamFeather,
      noise,
      nx,
      ny,
      angleInfluence,
    } = input;
    const { clamp01, smoothstep } = global.RadenShared;
    let familyBanding = bandingField;
    let familySeam = clamp01(seamMask * 0.72 + seamFeather * 0.28);
    let familyBrillianceMul = 1;
    let familyChromaticMul = 1;
    let substrateCoverageBias = 0;

    if (textureFamily === "opal") {
      const cellField = clamp01(
        (Math.sin((noise * 4.2 + nx * 3.1 - ny * 2.7) * Math.PI) + 1) /
          2,
      );
      familyBanding = clamp01(bandingField * 0.58 + cellField * 0.42);
      familySeam = clamp01(
        seamMask * 0.52 + smoothstep(0.72, 1, cellField) * 0.48,
      );
      familyBrillianceMul = 1.08;
      familyChromaticMul = 1.12;
      substrateCoverageBias = -0.06;
    } else if (textureFamily === "labradorite") {
      const flash = Math.pow(clamp01((angleInfluence + 1) / 2), 2.7);
      familyBanding = clamp01(bandingField * 0.7 + flash * 0.3);
      familySeam = clamp01(seamMask * 1.18);
      familyBrillianceMul = 1.04;
      familyChromaticMul = 1.28;
      substrateCoverageBias = 0.08;
    }

    return {
      familyBanding,
      familySeam,
      familyBrillianceMul,
      familyChromaticMul,
      substrateCoverageBias,
    };
  }

  function blendNacrePalette(
    value,
    blendSharpness,
    colorRange,
    colorIntensity,
    palette,
  ) {
    const valueClamped = Math.min(1, Math.max(0, value)) * colorRange;
    const scaled = valueClamped * 4;
    const index = Math.max(
      0,
      Math.min(Math.floor(scaled), palette.length - 2),
    );
    const frac = Math.pow(scaled - index, blendSharpness);
    const c1 = palette[index];
    const c2 = palette[index + 1];

    return {
      h: c1.h + (c2.h - c1.h) * frac,
      s: (c1.s + (c2.s - c1.s) * frac) * (colorIntensity / 100),
      l: c1.l + (c2.l - c1.l) * frac,
    };
  }

  function computeNacrePaletteColor(input) {
    const {
      geometricField,
      familyBanding,
      familySeam,
      surfacePolish,
      lightingField,
      highlightStrength,
      blendSharpness,
      colorRange,
      colorIntensity,
      palette,
      nacreBrilliance,
      familyBrillianceMul,
      textureFamily,
      nacreChromatic,
      familyChromaticMul,
      angleInfluence,
      highlightBoost,
    } = input;
    const { clamp01 } = global.RadenShared;
    const nacreField = clamp01(
      geometricField * 0.52 + familyBanding * 0.34 + familySeam * 0.14,
    );
    const value = clamp01(
      nacreField * (0.78 + surfacePolish * 0.08) +
        lightingField * (0.14 + highlightStrength * 0.06),
    );
    let { h, s, l } = blendNacrePalette(
      value,
      blendSharpness,
      colorRange,
      colorIntensity,
      palette,
    );
    s = Math.min(100, s * nacreBrilliance * familyBrillianceMul);
    l = Math.min(97, l + (nacreBrilliance * familyBrillianceMul - 1) * 6);
    if (textureFamily === "labradorite") {
      l = Math.max(10, l - 8);
    }

    const structureHueShift =
      (familyBanding - 0.5) *
        (44 * nacreChromatic * familyChromaticMul) *
        colorRange +
      familySeam * (14 * nacreChromatic * familyChromaticMul) -
      (nacreField - 0.5) * 12;
    const directionalHueShift =
      (angleInfluence * 9 + highlightBoost * 4) *
      (0.35 + 0.45 * nacreChromatic * familyChromaticMul);
    const shiftedHue =
      (h + structureHueShift + directionalHueShift + 360) % 360;

    return {
      nacreField,
      value,
      h,
      s,
      l,
      structureHueShift,
      directionalHueShift,
      shiftedHue,
    };
  }

  function applyNacreSurfaceAndScratches(input) {
    let { r, g, b } = input;
    const seamStrength = input.familySeam * input.seamContrast;
    const seamDark = 1 - seamStrength * 0.68;
    const seamWarm = seamStrength * 95;
    r = r * seamDark + seamWarm * 0.42;
    g = g * seamDark + seamWarm * 0.28;
    b = b * (1 - seamStrength * 0.34);

    const geometryLift = input.nacreField * (12 + 20 * input.surfacePolish);
    r += geometryLift * 0.55;
    g += geometryLift * 0.62;
    b += geometryLift * 0.78;

    const scratchFreq = 60 + input.scratchDensity * 320;
    const scratchPhase =
      (input.nx * input.scratchDir.x + input.ny * input.scratchDir.y) *
        scratchFreq +
      input.noise * 6;
    const scratchLine = Math.pow(
      Math.abs(Math.sin(scratchPhase * Math.PI)),
      24,
    );
    const scratchAmount =
      scratchLine *
      input.scratchDensity *
      (1 - input.surfacePolish) *
      45;
    r += scratchAmount;
    g += scratchAmount * 0.88;
    b += scratchAmount * 0.75;

    return {
      r,
      g,
      b,
      seamStrength,
      geometryLift,
      scratchFreq,
      scratchPhase,
      scratchLine,
      scratchAmount,
    };
  }

  function compositeNacreSubstrate(input) {
    const { clamp01 } = global.RadenShared;
    const coverage = clamp01(
      (0.28 +
        input.nacreField * 0.64 +
        input.highlightBoost * (0.1 + input.highlightStrength * 0.08) +
        input.substrateCoverageBias) *
        (1 - input.substrateMix) +
        input.substrateMix * (0.18 + input.familySeam * 0.3),
    );
    return {
      coverage,
      r: input.substrate.r * (1 - coverage) + input.r * coverage,
      g: input.substrate.g * (1 - coverage) + input.g * coverage,
      b: input.substrate.b * (1 - coverage) + input.b * coverage,
    };
  }

  function createNacreRenderer(rawConfig, runtime) {
    const config = normalizeNacreConfig(rawConfig);
    if (!runtime || typeof runtime.sampleNoise !== "function") {
      throw new TypeError("Mother of Pearl renderer requires sampleNoise().");
    }
    if (typeof runtime.hslToRgb !== "function") {
      throw new TypeError("Mother of Pearl renderer requires hslToRgb().");
    }
    if (!Array.isArray(runtime.palette) || runtime.palette.length < 2) {
      throw new TypeError("Mother of Pearl renderer requires a palette.");
    }

    const { clamp01 } = global.RadenShared;
    const lightCurvature = clamp01(config.lightCurvature || 0.28);
    const lightSpread = clamp01(config.lightSpread || 0.55);
    const substrateMix = clamp01(config.substrateMix);
    const lightVec = {
      x: Math.cos(config.lightAngle * 2 * Math.PI),
      y: Math.sin(config.lightAngle * 2 * Math.PI),
    };
    const scratchDir = {
      x: Math.cos(config.scratchAngle * 2 * Math.PI),
      y: Math.sin(config.scratchAngle * 2 * Math.PI),
    };

    function executeStages(point, stageState) {
      const { x, y, nx, ny, cx, cy } = point;
      const { angleInfluence, highlightBoost, px, py } =
        computeNacreSamplingFields({
          nx,
          ny,
          x,
          y,
          cx,
          cy,
          flowMode: config.flowMode,
          layerLength: config.layerLength,
          lightVec,
          highlightStrength: config.highlightStrength,
          lightSpread,
          lightCurvature,
        });
      const noise = runtime.sampleNoise(
        px,
        py,
        config.layers,
        config.scale,
      );
      const growth = computeNacreGrowthFields({
        nx,
        ny,
        noise,
        flowMode: config.flowMode,
        layerLength: config.layerLength,
        ringSpacing: config.ringSpacing,
        ringJitter: config.ringJitter,
        seamThickness: config.seamThickness,
        angleInfluence,
        highlightStrength: config.highlightStrength,
        lightSpread,
        highlightBoost,
      });
      const family = stageState.isEnabled("family")
        ? computeNacreFamilyFields({
            textureFamily: config.textureFamily,
            bandingField: growth.bandingField,
            seamMask: growth.seamMask,
            seamFeather: growth.seamFeather,
            noise,
            nx,
            ny,
            angleInfluence,
          })
        : {
            familyBanding: growth.bandingField,
            familySeam: clamp01(growth.seamMask * 0.72 + growth.seamFeather * 0.28),
            familyBrillianceMul: 1,
            familyChromaticMul: 1,
            substrateCoverageBias: 0,
          };
      const color = computeNacrePaletteColor({
        geometricField: growth.geometricField,
        familyBanding: family.familyBanding,
        familySeam: family.familySeam,
        surfacePolish: config.surfacePolish,
        lightingField: growth.lightingField,
        highlightStrength: config.highlightStrength,
        blendSharpness: config.blend,
        colorRange: config.colorRange,
        colorIntensity: config.colorIntensity,
        palette: runtime.palette,
        nacreBrilliance: config.nacreBrilliance,
        familyBrillianceMul: family.familyBrillianceMul,
        textureFamily: config.textureFamily,
        nacreChromatic: config.nacreChromatic,
        familyChromaticMul: family.familyChromaticMul,
        angleInfluence,
        highlightBoost,
      });
      const baseRgb = runtime.hslToRgb(color.shiftedHue, color.s, color.l);
      const surface = stageState.isEnabled("surface")
        ? applyNacreSurfaceAndScratches({
            r: baseRgb[0],
            g: baseRgb[1],
            b: baseRgb[2],
            familySeam: family.familySeam,
            seamContrast: config.seamContrast,
            nacreField: color.nacreField,
            surfacePolish: config.surfacePolish,
            nx,
            ny,
            scratchDir,
            scratchDensity: config.scratchDensity,
            noise,
          })
        : { r: baseRgb[0], g: baseRgb[1], b: baseRgb[2] };
      if (!stageState.isEnabled("substrate")) {
        return { r: surface.r, g: surface.g, b: surface.b, a: 255 };
      }
      return compositeNacreSubstrate({
        r: surface.r,
        g: surface.g,
        b: surface.b,
        substrate: runtime.substrate,
        nacreField: color.nacreField,
        highlightBoost,
        highlightStrength: config.highlightStrength,
        substrateCoverageBias: family.substrateCoverageBias,
        substrateMix,
        familySeam: family.familySeam,
      });
    }

    if (!global.RadenStages?.createStagePipeline) {
      throw new TypeError("Mother of Pearl renderer requires the procedural-stage contract.");
    }
    const stagePipeline = global.RadenStages.createStagePipeline({
      modeId: "motherofpearl",
      externalInputs: ["point", "lightVec"],
      stages: NACRE_STAGES,
      execute: executeStages,
      disabledStageIds: runtime.disabledStageIds,
    });
    return {
      config,
      renderPixel: stagePipeline.run,
      describeStages: stagePipeline.describe,
    };
  }

  const api = {
    normalizeNacreConfig,
    createNacreRenderer,
    computeNacreSamplingFields,
    computeNacreGrowthFields,
    computeNacreFamilyFields,
    computeNacrePaletteColor,
    applyNacreSurfaceAndScratches,
    compositeNacreSubstrate,
    NACRE_STAGES,
    INSPECTOR_DEFINITION,
    RANDOMIZATION_DEFINITION,
  };
  global.RadenNacre = Object.assign({}, global.RadenNacre || {}, api);
  global.RadenModes?.registerTextureModule?.(MODE_MANIFEST, {
    normalizeConfig: normalizeNacreConfig,
    createRenderer: createNacreRenderer,
    stages: NACRE_STAGES,
    inspector: INSPECTOR_DEFINITION,
    randomization: RANDOMIZATION_DEFINITION,
    externalInputs: ["point", "lightVec"],
  });
})(window);
