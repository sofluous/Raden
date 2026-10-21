/* Lichen Growth procedural renderer contract. */
(function registerRadenLichenGrowth(global) {
  const PALETTE = Object.freeze([
    Object.freeze([38, 48, 32]),
    Object.freeze([88, 110, 68]),
    Object.freeze([150, 167, 106]),
    Object.freeze([213, 221, 180]),
  ]);
  const SEAM_COLOR = Object.freeze([30, 39, 26]);

  function normalizeLichenConfig(rawConfig) {
    const raw = rawConfig || {};
    return Object.assign({}, raw, {
      // Preserve legacy truthy fallbacks during architecture migration.
      naturalScale: Math.max(0.0005, Number(raw.naturalScale) || 0.008),
      warp: global.RadenShared.clamp01(Number(raw.naturalWarp) || 0.35),
      patchScale: Math.max(0.2, Number(raw.lichenPatchScale) || 0.94),
      branching: global.RadenShared.clamp01(
        Number(raw.lichenBranching) || 0.46,
      ),
      edgeRoughness: global.RadenShared.clamp01(
        Number(raw.lichenEdgeRoughness) || 0.58,
      ),
      coverage: global.RadenShared.clamp01(
        Number(raw.lichenCoverage) || 0.52,
      ),
      moisture: global.RadenShared.clamp01(
        Number(raw.lichenMoistureTone) || 0.48,
      ),
    });
  }

  function samplePalette(value) {
    const { clamp01, lerp } = global.RadenShared;
    const scaled = clamp01(value) * (PALETTE.length - 1);
    const index = Math.floor(scaled);
    const next = Math.min(PALETTE.length - 1, index + 1);
    const mix = scaled - index;
    return PALETTE[index].map((channel, channelIndex) =>
      Math.round(lerp(channel, PALETTE[next][channelIndex], mix)),
    );
  }

  function createLichenRenderer(rawConfig, runtime) {
    const config = normalizeLichenConfig(rawConfig);
    if (
      !runtime?.simplexBase ||
      !runtime.simplexWarp ||
      !runtime.simplexDetail
    ) {
      throw new TypeError("Lichen renderer requires three simplex samplers.");
    }
    if (!global.RadenCellular?.sampleCellularField) {
      throw new TypeError("Lichen renderer requires the cellular sampler.");
    }
    const { clamp01, lerp, smoothstep } = global.RadenShared;

    function renderPixel(point) {
      const { nx, ny } = point;
      const colonyWarp =
        runtime.simplexWarp.noise2D(
          nx * config.naturalScale * 160 + 44.1,
          ny * config.naturalScale * 160 - 28.6,
        ) *
        (0.12 + config.warp * 1.8 + config.patchScale * 0.08);
      const px = nx + colonyWarp;
      const py = ny - colonyWarp * 0.4;
      const cell = global.RadenCellular.sampleCellularField(
        px,
        py,
        4.8 + config.patchScale * 14.2,
        9001,
      );
      const colonyNoise =
        runtime.simplexBase.noise2D(
          px * config.naturalScale * 260 + 22.7,
          py * config.naturalScale * 260 - 14.2,
        ) *
          0.5 +
        0.5;
      const branchNoise =
        runtime.simplexDetail.noise2D(
          px * config.naturalScale * 540 - 81.1,
          py * config.naturalScale * 540 + 63.8,
        ) *
          0.5 +
        0.5;
      const moistureNoise =
        runtime.simplexBase.noise2D(
          px * config.naturalScale * 420 - 17.4,
          py * config.naturalScale * 420 + 49.8,
        ) *
          0.5 +
        0.5;
      const colonyStrength = clamp01(
        config.coverage * 1.1 +
          colonyNoise * (0.18 + config.patchScale * 0.1) -
          cell.nearest * (0.54 + config.patchScale * 0.26),
      );
      const branchMask = clamp01(
        branchNoise * (0.12 + config.branching * 0.86) +
          (0.18 - cell.edge * (0.8 + config.edgeRoughness * 1.2)) +
          colonyStrength * (0.12 + config.branching * 0.42),
      );
      const edgeMask = clamp01(
        1 -
          smoothstep(
            0.01,
            0.08 + config.edgeRoughness * 0.24,
            cell.edge +
              branchNoise * (0.02 + config.edgeRoughness * 0.1),
          ),
      );
      const occupied = clamp01(
        colonyStrength * (0.7 + config.coverage * 0.24) +
          branchMask * (0.08 + config.branching * 0.34) -
          (1 - config.coverage) * 0.44,
      );
      const dampMask = clamp01(
        moistureNoise * (0.18 + config.moisture * 0.44) +
          occupied * config.moisture * 0.32,
      );
      const tone = clamp01(
        0.1 +
          occupied * 0.38 +
          dampMask * 0.22 +
          colonyNoise * (0.06 + config.moisture * 0.08),
      );
      let [r, g, b] = samplePalette(tone);
      const dampTint = samplePalette(clamp01(0.62 + config.moisture * 0.28));
      r = Math.round(lerp(r, dampTint[0], dampMask * 0.56));
      g = Math.round(lerp(g, dampTint[1], dampMask * 0.56));
      b = Math.round(lerp(b, dampTint[2], dampMask * 0.42));
      const chalkMask = clamp01(
        (1 - config.moisture) * occupied * 0.34 + edgeMask * 0.08,
      );
      r = Math.round(lerp(r, 210, chalkMask * 0.18));
      g = Math.round(lerp(g, 214, chalkMask * 0.2));
      b = Math.round(lerp(b, 188, chalkMask * 0.12));
      const rim = clamp01(
        edgeMask * (0.12 + config.edgeRoughness * 0.62) +
          branchMask * config.edgeRoughness * 0.18,
      );
      r = Math.round(lerp(r, SEAM_COLOR[0], rim));
      g = Math.round(lerp(g, SEAM_COLOR[1], rim));
      b = Math.round(lerp(b, SEAM_COLOR[2], rim));
      if (occupied < 0.18) {
        const bare = Math.round(lerp(34, 92, colonyNoise));
        return {
          r: bare,
          g: Math.round(bare * 1.08),
          b: Math.round(bare * 0.88),
          a: 255,
        };
      }
      return { r, g, b, a: 255 };
    }

    return { config, renderPixel };
  }

  const api = { normalizeLichenConfig, createLichenRenderer };
  global.RadenLichenGrowth = Object.assign(
    {},
    global.RadenLichenGrowth || {},
    api,
  );
  global.RadenModes?.registerRuntime?.("lichengrowth", {
    normalizeConfig: normalizeLichenConfig,
    createRenderer: createLichenRenderer,
  });
})(window);
