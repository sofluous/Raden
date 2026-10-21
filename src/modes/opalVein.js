/* Opal Vein procedural renderer contract. */
(function registerRadenOpalVein(global) {
  function normalizeOpalConfig(rawConfig) {
    const raw = rawConfig || {};
    return Object.assign({}, raw, {
      // Preserve legacy truthy fallbacks during architecture migration.
      cellScale: Number(raw.opalCellScale) || 0.009,
      veinDensity: Number(raw.opalVeinDensity) || 0.85,
      fireIntensity: Number(raw.opalFire) || 1.2,
      matrix: global.RadenShared.clamp01(Number(raw.opalMatrix) || 0.52),
    });
  }

  function createOpalRenderer(rawConfig, runtime) {
    const config = normalizeOpalConfig(rawConfig);
    if (!runtime?.simplex || typeof runtime.simplex.noise2D !== "function") {
      throw new TypeError("Opal Vein renderer requires a simplex sampler.");
    }
    const { clamp01, smoothstep, hslToRgb } = global.RadenShared;

    function renderPixel(point) {
      const { nx, ny } = point;
      const n1 = runtime.simplex.noise2D(
        nx * 420 * config.cellScale,
        ny * 420 * config.cellScale,
      );
      const n2 =
        runtime.simplex.noise2D(
          (nx + 12.37) * 820 * config.cellScale,
          (ny - 5.91) * 820 * config.cellScale,
        ) * 0.5;
      const cells = clamp01((n1 * 0.75 + n2 * 0.25 + 1) / 2);
      const veins = Math.pow(
        Math.abs(Math.sin((cells * 10 + n1 * 3.5) * Math.PI)),
        1.6 + config.veinDensity * 1.4,
      );
      const edge = smoothstep(
        0.62 - config.veinDensity * 0.18,
        0.92,
        veins,
      );
      const darkBase = 14 + config.matrix * 24;
      let r = darkBase;
      let g = darkBase + 2;
      let b = darkBase + 5;
      const fireHue = (cells * 360 + n2 * 120 + 360) % 360;
      const fireSat = Math.min(
        100,
        45 + config.fireIntensity * 34 + edge * 14,
      );
      const fireLum = Math.min(
        90,
        26 + edge * 42 + config.fireIntensity * 8,
      );
      const [fr, fg, fb] = hslToRgb(fireHue, fireSat, fireLum);
      const fireMask = clamp01(
        edge * (0.58 + config.fireIntensity * 0.25),
      );
      r = r * (1 - fireMask) + fr * fireMask;
      g = g * (1 - fireMask) + fg * fireMask;
      b = b * (1 - fireMask) + fb * fireMask;
      const sparkle =
        Math.pow(
          clamp01((runtime.simplex.noise2D(nx * 1800, ny * 1800) + 1) / 2),
          16,
        ) *
        config.fireIntensity *
        140;
      return {
        r: r + sparkle * 0.65,
        g: g + sparkle * 0.92,
        b: b + sparkle,
        a: 255,
      };
    }

    return { config, renderPixel };
  }

  const api = { normalizeOpalConfig, createOpalRenderer };
  global.RadenOpalVein = Object.assign({}, global.RadenOpalVein || {}, api);
  global.RadenModes?.registerRuntime?.("opalvein", {
    normalizeConfig: normalizeOpalConfig,
    createRenderer: createOpalRenderer,
  });
})(window);
