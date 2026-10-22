/* Bubble Film procedural stages and renderer contract. */
(function registerRadenBubbleFilm(global) {
  const BUBBLE_FILM_STAGES = Object.freeze([
    { id: "pressureWarp", label: "Pressure warp", kind: "coordinates", inputs: ["point", "runtime"], outputs: ["warpedPoint"], controlIds: ["naturalScale", "naturalWarp", "naturalTurbulence"] },
    { id: "cellStructure", label: "Cell and membrane structure", kind: "geometry", inputs: ["warpedPoint", "runtime"], outputs: ["filmStructure"], controlIds: [] },
    { id: "thinFilm", label: "Thin-film interference", kind: "material", inputs: ["filmStructure"], outputs: ["filmColor"], controlIds: [], interfaceId: "materialSource" },
    { id: "surface", label: "Membrane surface", kind: "surface", inputs: ["filmColor", "filmStructure"], outputs: ["nativeColor"], controlIds: [], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "filmColor", output: "nativeColor", description: "Forward thin-film RGB without membrane shading or tear finishing." } },
    { id: "authoredPalette", label: "Authored palette mapping", kind: "material", inputs: ["nativeColor"], outputs: ["pixel"], controlIds: ["nacrePalette"], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "nativeColor", output: "pixel", description: "Return the native Bubble Film color unchanged." } },
  ]);
  const PROFILE = Object.freeze({
    palette: Object.freeze([
      Object.freeze([78, 50, 97]),
      Object.freeze([77, 146, 181]),
      Object.freeze([154, 223, 209]),
      Object.freeze([249, 227, 255]),
    ]),
    seamColor: Object.freeze([55, 35, 69]),
  });
  const BASELINE = Object.freeze({
    cellScale: 1.06,
    wallThickness: 0.14,
    pressureWarp: 0.42,
    iridescence: 0.72,
    breakup: 0.36,
  });

  function normalizeBubbleFilmConfig(rawConfig) {
    const raw = rawConfig || {};
    return Object.assign({}, raw, BASELINE, {
      naturalScale: Math.max(
        0.0005,
        global.RadenShared.finiteOr(raw.naturalScale, 0.008),
      ),
      warp: global.RadenShared.clamp01(
        global.RadenShared.finiteOr(raw.naturalWarp, 0.35),
      ),
      turbulence: Math.max(
        0,
        global.RadenShared.finiteOr(raw.naturalTurbulence, 0.62),
      ),
    });
  }

  function samplePressureWarp(input) {
    const amplitude =
      input.pressureWarp *
      (0.52 + input.warp * 1.45 + input.turbulence * 0.4);
    const warpX =
      input.simplexWarp.noise2D(
        input.nx * input.naturalScale * 210 + 92.5,
        input.ny * input.naturalScale * 210 - 35.8,
      ) * amplitude;
    const warpY =
      input.simplexWarp.noise2D(
        input.nx * input.naturalScale * 210 - 76.2,
        input.ny * input.naturalScale * 210 + 41.4,
      ) * amplitude;
    return { warpX, warpY, px: input.nx + warpX, py: input.ny + warpY };
  }

  function computeBubbleStructure(input) {
    const { clamp01, smoothstep } = global.RadenShared;
    const cell = global.RadenCellular.sampleCellularField(
      input.px,
      input.py,
      2.2 + input.cellScale * 3.6,
      12031,
    );
    const membrane =
      1 -
      smoothstep(
        input.wallThickness * 0.08,
        input.wallThickness * 1.25,
        cell.edge,
      );
    const centerGlow = clamp01(
      1 - cell.nearest * (1.38 - input.breakup * 0.28),
    );
    const pressure =
      input.simplexBase.noise2D(
        input.px * input.naturalScale * 320 + 18.6,
        input.py * input.naturalScale * 320 + 71.2,
      ) *
        0.5 +
      0.5;
    const tearNoise =
      input.simplexDetail.noise2D(
        input.px * input.naturalScale * 620 - 44.5,
        input.py * input.naturalScale * 620 + 83.7,
      ) *
        0.5 +
      0.5;
    const breakupMask = clamp01(
      input.breakup * 0.88 +
        tearNoise * (0.34 + input.breakup * 0.28) -
        centerGlow * (0.18 + input.breakup * 0.12) -
        membrane * 0.16,
    );
    const tearEdge = smoothstep(0.46, 0.84, breakupMask);
    return { cell, membrane, centerGlow, pressure, tearNoise, breakupMask, tearEdge };
  }

  function samplePalette(palette, value) {
    const { clamp01, lerp } = global.RadenShared;
    const scaled = clamp01(value) * (palette.length - 1);
    const index = Math.floor(scaled);
    const next = Math.min(palette.length - 1, index + 1);
    const mix = scaled - index;
    return palette[index].map((channel, channelIndex) =>
      Math.round(lerp(channel, palette[next][channelIndex], mix)),
    );
  }

  function computeThinFilmColor(input) {
    const { clamp01, lerp } = global.RadenShared;
    const filmTone = clamp01(
      0.34 +
        input.centerGlow * 0.34 +
        input.pressure * 0.18 -
        input.tearEdge * (0.16 + input.breakup * 0.1),
    );
    let [r, g, b] = samplePalette(input.palette, filmTone);
    const filmThickness = clamp01(
      0.12 +
        input.pressure * 0.42 +
        input.tearNoise * 0.22 +
        input.turbulence * 0.18 -
        input.membrane * (0.18 + input.wallThickness * 0.12) +
        input.pressureWarp * 0.14,
    );
    const thinFilmMask = clamp01(
      input.centerGlow * 0.48 +
        (1 - input.membrane) * 0.22 +
        input.pressure * 0.2 -
        input.tearEdge * 0.1,
    );
    const spectralPhase =
      (input.cellId * 6.8 +
        filmThickness * (18 + input.iridescence * 34) +
        input.pressure * 9.2 +
        input.tearNoise * 6.4 +
        (input.px * 3.1 - input.py * 2.7) *
          (1 + input.pressureWarp * 1.8)) *
      Math.PI;
    const spectralR = 0.5 + 0.5 * Math.sin(spectralPhase);
    const spectralG = 0.5 + 0.5 * Math.sin(spectralPhase + 2.094);
    const spectralB = 0.5 + 0.5 * Math.sin(spectralPhase + 4.188);
    const sheenMix = clamp01(
      input.iridescence *
        (0.08 + thinFilmMask * 0.72 + input.pressureWarp * 0.16),
    );
    r = Math.round(lerp(r, Math.round(150 + spectralR * 105), sheenMix));
    g = Math.round(lerp(g, Math.round(135 + spectralG * 120), sheenMix));
    b = Math.round(lerp(b, Math.round(165 + spectralB * 90), sheenMix));
    return { r, g, b, filmTone, filmThickness, thinFilmMask, spectralPhase };
  }

  function finishBubbleSurface(input) {
    const { clamp01, lerp } = global.RadenShared;
    let { r, g, b } = input;
    const wallShade = clamp01(
      input.membrane * (0.68 + input.wallThickness * 0.95) +
        input.tearEdge * (0.18 + input.breakup * 0.26),
    );
    r = Math.round(lerp(r, input.seamColor[0], wallShade));
    g = Math.round(lerp(g, input.seamColor[1], wallShade));
    b = Math.round(lerp(b, input.seamColor[2], wallShade));
    const thinning = clamp01(
      input.tearEdge * (0.32 + input.breakup * 0.5) +
        (1 - input.centerGlow) * 0.12,
    );
    r = Math.round(lerp(r, 22, thinning * 0.42));
    g = Math.round(lerp(g, 20, thinning * 0.42));
    b = Math.round(lerp(b, 28, thinning * 0.46));
    const tearHighlight = clamp01(
      input.tearEdge * (0.18 + input.breakup * 0.34) +
        input.iridescence * input.thinFilmMask * 0.1,
    );
    r = Math.round(lerp(r, 244, tearHighlight * 0.22));
    g = Math.round(lerp(g, 248, tearHighlight * 0.24));
    b = Math.round(lerp(b, 255, tearHighlight * 0.28));
    return { r, g, b, a: 255, wallShade, thinning, tearHighlight };
  }

  function createBubbleFilmRenderer(rawConfig, runtime) {
    const config = normalizeBubbleFilmConfig(rawConfig);
    if (
      !runtime ||
      !runtime.simplexBase ||
      !runtime.simplexWarp ||
      !runtime.simplexDetail
    ) {
      throw new TypeError("Bubble Film renderer requires three simplex samplers.");
    }

    function executeStages(point, stageState, diagnostics = false) {
      const warped = samplePressureWarp({
        ...config,
        ...point,
        simplexWarp: runtime.simplexWarp,
      });
      const structure = computeBubbleStructure({
        ...config,
        ...warped,
        simplexBase: runtime.simplexBase,
        simplexDetail: runtime.simplexDetail,
      });
      const color = computeThinFilmColor({
        ...config,
        ...warped,
        ...structure,
        cellId: structure.cell.cellId,
        palette: PROFILE.palette,
      });
      const surface = stageState.isEnabled("surface")
        ? finishBubbleSurface({
            ...config,
            ...structure,
            ...color,
            seamColor: PROFILE.seamColor,
          })
        : { r: color.r, g: color.g, b: color.b, a: 255 };
      const pixel = stageState.isEnabled("authoredPalette") &&
        typeof runtime.mapAuthoredPalette === "function"
        ? runtime.mapAuthoredPalette(surface)
        : surface;
      if (!diagnostics) return pixel;
      return {
        pixel,
        disabledStageIds: stageState.disabledStageIds,
        stages: {
          pressureWarp: warped,
          cellStructure: structure,
          thinFilm: color,
          surface,
          authoredPalette: pixel,
        },
      };
    }

    if (!global.RadenStages?.createStagePipeline) {
      throw new TypeError("Bubble Film renderer requires the procedural-stage contract.");
    }
    const stagePipeline = global.RadenStages.createStagePipeline({
      modeId: "bubblefilm",
      externalInputs: ["point", "runtime"],
      stages: BUBBLE_FILM_STAGES,
      execute: (point, stageState) => executeStages(point, stageState, false),
      inspect: (point, stageState) => executeStages(point, stageState, true),
      disabledStageIds: runtime.disabledStageIds,
    });
    return {
      config,
      renderPixel: stagePipeline.run,
      inspectPixel: stagePipeline.inspect,
      describeStages: stagePipeline.describe,
    };
  }

  const api = {
    normalizeBubbleFilmConfig,
    samplePressureWarp,
    computeBubbleStructure,
    computeThinFilmColor,
    finishBubbleSurface,
    createBubbleFilmRenderer,
    BUBBLE_FILM_STAGES,
  };
  global.RadenBubbleFilm = Object.assign({}, global.RadenBubbleFilm || {}, api);
  global.RadenModes?.registerRuntime?.("bubblefilm", {
    normalizeConfig: normalizeBubbleFilmConfig,
    createRenderer: createBubbleFilmRenderer,
    stages: BUBBLE_FILM_STAGES,
    externalInputs: ["point", "runtime"],
  });
})(window);
