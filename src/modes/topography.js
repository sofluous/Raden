/* Topography multi-pass renderer contract. */
(function registerRadenTopography(global) {
  const TOPOGRAPHY_STAGES = Object.freeze([
    { id: "terrain", label: "Terrain field", kind: "field", inputs: ["point", "runtime"], outputs: ["heightField"], controlIds: ["scale", "layers", "topoPreset", "topoNoiseType", "topoRidge", "topoWarp"] },
    { id: "erosion", label: "Terrain erosion", kind: "surface", inputs: ["heightField"], outputs: ["erodedHeightField"], controlIds: ["topoErosion"], optional: true, bypass: { type: "custom", description: "Forward the generated height field without erosion smoothing." } },
    { id: "contours", label: "Contour rendering", kind: "material", inputs: ["erodedHeightField"], outputs: ["nativeColor"], controlIds: ["topoBandCount", "topoRenderMode"], interfaceId: "materialSource", interfaceBindings: { outputColor: "nativeColor" } },
    { id: "authoredPalette", label: "Authored palette mapping", kind: "material", inputs: ["nativeColor"], outputs: ["pixel"], controlIds: ["nacrePalette"], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "nativeColor", output: "pixel", description: "Return native grayscale Topography color unchanged." } },
  ]);
  function numberOr(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeTopographyConfig(rawConfig) {
    const raw = rawConfig || {};
    return Object.assign({}, raw, {
      bandCount: Math.max(1, Math.floor(numberOr(raw.topoBandCount, 12))),
      renderMode: ["lines", "fill", "gradient"].includes(raw.topoRenderMode)
        ? raw.topoRenderMode
        : "lines",
      noiseType: String(raw.topoNoiseType || "simplex"),
      ridgeStrength: numberOr(raw.topoRidge, 0.58),
      warpStrength: numberOr(raw.topoWarp, 0.42),
      erosionStrength: numberOr(raw.topoErosion, 0.36),
      effectiveScale: 620 * numberOr(raw.scale, 0.006),
    });
  }

  function createTopographyRenderer(rawConfig, runtime) {
    const config = normalizeTopographyConfig(rawConfig);
    if (typeof runtime?.baseNoise !== "function") {
      throw new TypeError("Topography renderer requires a base-noise function.");
    }
    const { clamp01 } = global.RadenShared;
    const mapAuthoredPalette = typeof runtime.mapAuthoredPalette === "function" ? runtime.mapAuthoredPalette : (pixel) => pixel;
    const pipeline = global.RadenStages.createStagePipeline({
      modeId: "topography",
      stages: TOPOGRAPHY_STAGES,
      externalInputs: ["point", "runtime"],
      disabledStageIds: runtime.disabledStageIds,
      execute: (value) => value,
    });
    const noiseFunc = (x, y) => {
      let total = 0;
      let amplitude = 1;
      let frequency = 1;
      let maximum = 0;
      for (let layer = 0; layer < config.layers; layer++) {
        total +=
          runtime.baseNoise(
            x * frequency * config.effectiveScale,
            y * frequency * config.effectiveScale,
          ) * amplitude;
        maximum += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }
      return total / maximum;
    };

    function sampleTerrain(nx, ny) {
      const warpAmplitude = 0.18 * config.warpStrength;
      const wx = nx + noiseFunc(nx + 7.91, ny - 4.28) * warpAmplitude;
      const wy = ny + noiseFunc(nx - 5.73, ny + 9.16) * warpAmplitude;
      const noise = noiseFunc(wx, wy);
      const ridged = 1 - Math.abs(noise);
      const ridgedSigned = ridged * 2 - 1;
      return (
        noise * (1 - config.ridgeStrength) +
        ridgedSigned * config.ridgeStrength
      );
    }

    function createHeightField(getPoint) {
      const heights = new Float32Array(config.width * config.height);
      for (let y = 0; y < config.height; y++) {
        for (let x = 0; x < config.width; x++) {
          const point = getPoint(x, y);
          heights[y * config.width + x] = clamp01(
            (sampleTerrain(point.nx, point.ny) + 1) / 2,
          );
        }
      }
      return heights;
    }

    function erodeHeightField(heights) {
      if (!pipeline.isStageEnabled("erosion")) return heights;
      const erosionSteps = config.preview
        ? Math.floor(config.erosionStrength * 2)
        : Math.floor(config.erosionStrength * 4);
      for (let step = 0; step < erosionSteps; step++) {
        const smoothed = new Float32Array(heights.length);
        for (let y = 0; y < config.height; y++) {
          for (let x = 0; x < config.width; x++) {
            const index = y * config.width + x;
            const left = heights[y * config.width + Math.max(0, x - 1)];
            const right =
              heights[y * config.width + Math.min(config.width - 1, x + 1)];
            const up = heights[Math.max(0, y - 1) * config.width + x];
            const down =
              heights[Math.min(config.height - 1, y + 1) * config.width + x];
            const average =
              (left + right + up + down + heights[index]) / 5;
            smoothed[index] =
              heights[index] +
              (average - heights[index]) *
                (0.3 + config.erosionStrength * 0.45);
          }
        }
        heights.set(smoothed);
      }
      return heights;
    }

    function renderNativePixel(x, y, heights) {
      const value = heights[y * config.width + x];
      const band = Math.floor(value * config.bandCount);
      let color = 255;
      if (config.renderMode === "lines") {
        const valueRight =
          heights[y * config.width + Math.min(config.width - 1, x + 1)];
        const valueDown =
          heights[Math.min(config.height - 1, y + 1) * config.width + x];
        const bandRight = Math.floor(valueRight * config.bandCount);
        const bandDown = Math.floor(valueDown * config.bandCount);
        color = band !== bandRight || band !== bandDown ? 0 : 255;
      } else if (config.renderMode === "fill") {
        const stepped = band / Math.max(1, config.bandCount - 1);
        color = Math.floor(stepped * 255);
      } else if (config.renderMode === "gradient") {
        color = Math.floor(value * 255);
      }
      return { r: color, g: color, b: color, a: 255 };
    }

    function renderPixel(x, y, heights) {
      const nativeColor = renderNativePixel(x, y, heights);
      return pipeline.isStageEnabled("authoredPalette")
        ? mapAuthoredPalette(nativeColor)
        : nativeColor;
    }

    function inspectPixel(x, y, heights) {
      const nativeColor = renderNativePixel(x, y, heights);
      const pixel = pipeline.isStageEnabled("authoredPalette")
        ? mapAuthoredPalette(nativeColor)
        : nativeColor;
      return {
        pixel,
        stages: {
          terrain: heights[y * config.width + x],
          erosion: heights[y * config.width + x],
          contours: nativeColor,
          authoredPalette: pixel,
        },
      };
    }

    return {
      config,
      sampleTerrain,
      createHeightField,
      erodeHeightField,
      renderPixel,
      inspectPixel,
      describeStages: pipeline.describe,
    };
  }

  const api = { normalizeTopographyConfig, createTopographyRenderer, stages: TOPOGRAPHY_STAGES };
  global.RadenTopography = Object.assign({}, global.RadenTopography || {}, api);
  global.RadenModes?.registerRuntime?.("topography", {
    normalizeConfig: normalizeTopographyConfig,
    createRenderer: createTopographyRenderer,
    stages: TOPOGRAPHY_STAGES,
    externalInputs: ["point", "runtime"],
  });
})(window);
