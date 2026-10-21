/* Agate Bands procedural renderer contract. */
(function registerRadenAgateBands(global) {
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
      // Preserve legacy truthy fallbacks during architecture migration.
      naturalScale: Math.max(0.0005, Number(raw.naturalScale) || 0.008),
      warp: global.RadenShared.clamp01(Number(raw.naturalWarp) || 0.35),
      bandFreq: Math.max(0.2, Number(raw.agateBandFreq) || 1.18),
      bandJitter: global.RadenShared.clamp01(
        Number(raw.agateBandJitter) || 0.34,
      ),
      veinDensity: Math.max(0, Number(raw.agateVeinDensity) || 0.74),
      translucency: global.RadenShared.clamp01(
        Number(raw.agateTranslucency) || 0.58,
      ),
      edgeDarken: global.RadenShared.clamp01(
        Number(raw.agateEdgeDarken) || 0.52,
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

  function createAgateRenderer(rawConfig, runtime) {
    const config = normalizeAgateConfig(rawConfig);
    if (
      !runtime?.simplexBase ||
      !runtime.simplexWarp ||
      !runtime.simplexDetail
    ) {
      throw new TypeError("Agate renderer requires three simplex samplers.");
    }
    const { clamp01, lerp, hslToRgb } = global.RadenShared;

    function renderPixel(point) {
      const { nx, ny } = point;
      const radial = Math.hypot(
        nx * (1.02 + config.bandJitter * 0.6),
        ny * (0.9 + config.translucency * 0.24),
      );
      const swirl =
        runtime.simplexWarp.noise2D(
          nx * config.naturalScale * 95 + 12.1,
          ny * config.naturalScale * 95 - 8.6,
        ) *
        (0.6 + config.warp * 2.9 + config.bandJitter * 0.4);
      const drift =
        runtime.simplexBase.noise2D(
          nx * config.naturalScale * 240 - 33.4,
          ny * config.naturalScale * 240 + 18.7,
        ) *
        config.bandJitter *
        (1.4 + config.bandJitter * 3.6);
      const detail =
        runtime.simplexDetail.noise2D(
          nx * config.naturalScale * 410 + 91.2,
          ny * config.naturalScale * 410 - 57.4,
        ) *
        (0.16 + config.veinDensity * 0.56);
      const fineVein =
        runtime.simplexBase.noise2D(
          nx * config.naturalScale * 720 - 11.8,
          ny * config.naturalScale * 720 + 54.7,
        ) *
        (0.08 + config.veinDensity * 0.42);
      const stratified =
        radial * (10 + config.bandFreq * 30) +
        swirl * (2.1 + config.bandFreq * 1.8) +
        drift * (1.8 + config.bandJitter * 4.2);
      const bands = 0.5 + 0.5 * Math.sin(stratified * Math.PI);
      const secondary =
        0.5 +
        0.5 *
          Math.sin(
            (stratified * (0.42 + config.translucency * 0.22) +
              detail * (3.8 + config.veinDensity * 3.2) +
              fineVein * 4.6) *
              Math.PI,
          );
      const glow = clamp01(
        0.36 +
          bands * (0.22 + config.translucency * 0.16) +
          secondary * (0.1 + config.translucency * 0.3) +
          detail * (0.08 + config.veinDensity * 0.22),
      );
      let [r, g, b] = samplePalette(glow);
      const seamMask = Math.pow(
        clamp01(1 - Math.abs(bands * 2 - 1)),
        3.8 + config.edgeDarken * 2.4 + config.veinDensity * 2.2,
      );
      const veinMask = Math.pow(
        clamp01(
          0.44 + detail * 1.18 + fineVein * 0.72 - secondary * 0.22,
        ),
        1.2 + config.veinDensity * 3.1,
      );
      const internalGlow = clamp01(
        secondary * (0.18 + config.translucency * 0.72) +
          (1 - seamMask) * 0.12,
      );
      const [gr, gg, gb] = hslToRgb(36, 42, 62 + internalGlow * 12);
      r = Math.round(
        lerp(r, gr, config.translucency * 0.08 + internalGlow * 0.2),
      );
      g = Math.round(
        lerp(g, gg, config.translucency * 0.08 + internalGlow * 0.18),
      );
      b = Math.round(
        lerp(b, gb, config.translucency * 0.06 + internalGlow * 0.14),
      );
      const seamStrength = clamp01(
        seamMask * (0.18 + config.edgeDarken * 0.98) +
          veinMask * (0.06 + config.veinDensity * 0.52),
      );
      return {
        r: Math.round(lerp(r, SEAM_COLOR[0], seamStrength)),
        g: Math.round(lerp(g, SEAM_COLOR[1], seamStrength)),
        b: Math.round(lerp(b, SEAM_COLOR[2], seamStrength)),
        a: 255,
      };
    }

    return { config, renderPixel };
  }

  const api = { normalizeAgateConfig, createAgateRenderer };
  global.RadenAgateBands = Object.assign({}, global.RadenAgateBands || {}, api);
  global.RadenModes?.registerRuntime?.("agateband", {
    normalizeConfig: normalizeAgateConfig,
    createRenderer: createAgateRenderer,
  });
})(window);
