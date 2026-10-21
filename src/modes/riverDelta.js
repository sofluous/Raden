/* River Delta procedural renderer contract. */
(function registerRadenRiverDelta(global) {
  const PALETTE = Object.freeze([
    Object.freeze([43, 57, 74]),
    Object.freeze([88, 121, 133]),
    Object.freeze([157, 169, 132]),
    Object.freeze([218, 208, 170]),
  ]);
  const SEAM_COLOR = Object.freeze([35, 48, 61]);

  function normalizeRiverDeltaConfig(rawConfig) {
    const raw = rawConfig || {};
    return Object.assign({}, raw, {
      // Preserve legacy truthy fallbacks during architecture migration.
      naturalScale: Math.max(0.0005, Number(raw.naturalScale) || 0.008),
      warp: global.RadenShared.clamp01(Number(raw.naturalWarp) || 0.35),
      turbulence: Math.max(0, Number(raw.naturalTurbulence) || 0.62),
      anisotropy: global.RadenShared.clamp01(
        Number(raw.naturalAnisotropy) || 0.25,
      ),
      channelWidth: Math.max(0.05, Number(raw.deltaChannelWidth) || 0.48),
      branchRate: global.RadenShared.clamp01(
        Number(raw.deltaBranchRate) || 0.52,
      ),
      sedimentMix: global.RadenShared.clamp01(
        Number(raw.deltaSedimentMix) || 0.46,
      ),
      floodplainSoftness: global.RadenShared.clamp01(
        Number(raw.deltaFloodplainSoftness) || 0.56,
      ),
      erosion: global.RadenShared.clamp01(Number(raw.deltaErosion) || 0.38),
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

  function createRiverDeltaRenderer(rawConfig, runtime) {
    const config = normalizeRiverDeltaConfig(rawConfig);
    if (
      !runtime?.simplexBase ||
      !runtime.simplexWarp ||
      !runtime.simplexDetail
    ) {
      throw new TypeError("River Delta renderer requires three simplex samplers.");
    }
    const { clamp01, lerp, smoothstep } = global.RadenShared;

    function renderPixel(point) {
      const { nx, ny } = point;
      const dirX = nx * (1 + config.anisotropy * 3.2);
      const dirY = ny * (1 - config.anisotropy * 0.25);
      const flowWarpX =
        runtime.simplexWarp.noise2D(
          dirX * config.naturalScale * 82 + 140.1,
          dirY * config.naturalScale * 82 - 17.2,
        ) *
        (0.42 +
          config.warp * 2.2 +
          config.erosion * 0.52 +
          config.turbulence * 0.24);
      const flowWarpY =
        runtime.simplexWarp.noise2D(
          dirX * config.naturalScale * 82 - 94.7,
          dirY * config.naturalScale * 82 + 33.6,
        ) *
        (0.28 +
          config.warp * 1.9 +
          config.erosion * 0.44 +
          config.turbulence * 0.18);
      const px = dirX + flowWarpX;
      const py = dirY + flowWarpY;
      const trunk = runtime.simplexBase.noise2D(
        px * config.naturalScale * 170,
        py * config.naturalScale * 78,
      );
      const tributary = runtime.simplexDetail.noise2D(
        px * config.naturalScale * (250 + config.branchRate * 110) + 22.3,
        py * config.naturalScale * (250 + config.branchRate * 110) - 18.5,
      );
      const meander = runtime.simplexWarp.noise2D(
        px * config.naturalScale * 118 - 71.9,
        py * config.naturalScale * 118 + 44.8,
      );
      const turbulenceField =
        runtime.simplexBase.noise2D(
          px * config.naturalScale * 290 + 18.7,
          py * config.naturalScale * 290 - 32.1,
        ) * config.turbulence;
      const branching = Math.abs(
        Math.sin(
          (px * (6 + config.branchRate * 24) +
            tributary * (2.4 + config.branchRate * 5.2) +
            turbulenceField * (0.8 + config.branchRate * 0.9)) *
            Math.PI,
        ),
      );
      const channelSignal = Math.min(
        Math.abs(
          trunk +
            meander * (0.26 + config.erosion * 0.74) +
            turbulenceField * (0.1 + config.turbulence * 0.36),
        ),
        Math.abs(tributary) * (0.56 + config.branchRate * 0.92) +
          branching * (0.1 + config.branchRate * 0.34),
      );
      const widthThreshold = 0.08 + config.channelWidth * 0.42;
      const floodSpread =
        0.08 + config.floodplainSoftness * 0.3 + config.turbulence * 0.08;
      const channelMask =
        1 -
        smoothstep(
          widthThreshold,
          widthThreshold + floodSpread,
          channelSignal,
        );
      const wetBankMask =
        1 -
        smoothstep(
          widthThreshold + floodSpread * 0.28,
          widthThreshold +
            floodSpread * (1.2 + config.floodplainSoftness * 0.65),
          channelSignal,
        );
      const bankNoise =
        runtime.simplexBase.noise2D(
          px * config.naturalScale * 320 + 51.2,
          py * config.naturalScale * 320 - 66.4,
        ) *
          0.5 +
        0.5;
      const sedimentField = clamp01(
        0.16 +
          bankNoise * (0.28 + config.turbulence * 0.14) +
          wetBankMask * (0.22 + config.sedimentMix * 0.56) -
          channelMask * 0.14,
      );
      const floodplain = clamp01(
        0.12 +
          sedimentField * (0.34 + config.sedimentMix * 0.32) +
          wetBankMask * (0.08 + config.floodplainSoftness * 0.22) +
          runtime.simplexDetail.noise2D(
            px * config.naturalScale * 140 - 11.4,
            py * config.naturalScale * 140 + 76.1,
          ) *
            (0.1 +
              config.floodplainSoftness * 0.36 +
              config.turbulence * 0.08),
      );
      let [r, g, b] = samplePalette(
        clamp01(
          floodplain * (0.56 + config.sedimentMix * 0.18) +
            wetBankMask * 0.12 +
            (1 - channelMask) * 0.08,
        ),
      );
      const waterShade = [
        Math.round(lerp(SEAM_COLOR[0], 74, 0.48)),
        Math.round(lerp(SEAM_COLOR[1], 128, 0.52)),
        Math.round(lerp(SEAM_COLOR[2], 152, 0.56)),
      ];
      const waterMix = clamp01(
        channelMask * (0.72 + config.channelWidth * 0.22),
      );
      r = Math.round(lerp(r, waterShade[0], waterMix));
      g = Math.round(lerp(g, waterShade[1], waterMix));
      b = Math.round(lerp(b, waterShade[2], waterMix));
      const bankMask = clamp01(
        wetBankMask *
          (0.42 + config.erosion * 0.34) *
          (1 - channelMask * 0.55),
      );
      const sandyTint = samplePalette(
        clamp01(0.7 + sedimentField * 0.28 + config.sedimentMix * 0.12),
      );
      r = Math.round(
        lerp(r, sandyTint[0], config.sedimentMix * bankMask * 0.82),
      );
      g = Math.round(
        lerp(g, sandyTint[1], config.sedimentMix * bankMask * 0.82),
      );
      b = Math.round(
        lerp(b, sandyTint[2], config.sedimentMix * bankMask * 0.68),
      );
      const cutBank = clamp01(
        channelMask * (0.12 + config.erosion * 0.72) +
          bankMask * (0.08 + config.erosion * 0.28),
      );
      return {
        r: Math.round(lerp(r, SEAM_COLOR[0], cutBank)),
        g: Math.round(lerp(g, SEAM_COLOR[1], cutBank)),
        b: Math.round(lerp(b, SEAM_COLOR[2], cutBank * 0.92)),
        a: 255,
      };
    }

    return { config, renderPixel };
  }

  const api = { normalizeRiverDeltaConfig, createRiverDeltaRenderer };
  global.RadenRiverDelta = Object.assign({}, global.RadenRiverDelta || {}, api);
  global.RadenModes?.registerRuntime?.("riverdelta", {
    normalizeConfig: normalizeRiverDeltaConfig,
    createRenderer: createRiverDeltaRenderer,
  });
})(window);
