/* Marble Ink procedural renderer contract. */
(function registerRadenMarbleInk(global) {
  function normalizeMarbleConfig(rawConfig) {
    const raw = rawConfig || {};
    return Object.assign({}, raw, {
      // Preserve legacy truthy fallbacks during architecture migration.
      flowScale: Number(raw.marbleFlowScale) || 0.007,
      veinFreq: Number(raw.marbleVeinFreq) || 1.2,
      contrast: Number(raw.marbleContrast) || 0.78,
      inkDrift: global.RadenShared.clamp01(
        Number(raw.marbleInkDrift) || 0.42,
      ),
      stoneLightness: global.RadenShared.clamp01(
        Number(raw.marbleLightness) || 0.72,
      ),
    });
  }

  function createMarbleRenderer(rawConfig, runtime) {
    const config = normalizeMarbleConfig(rawConfig);
    if (!runtime?.simplex || typeof runtime.simplex.noise2D !== "function") {
      throw new TypeError("Marble Ink renderer requires a simplex sampler.");
    }
    const { clamp01, smoothstep } = global.RadenShared;

    function renderPixel(point) {
      const { nx, ny } = point;
      const warp1 =
        runtime.simplex.noise2D(
          nx * 900 * config.flowScale,
          ny * 900 * config.flowScale,
        ) *
        config.inkDrift *
        0.32;
      const warp2 =
        runtime.simplex.noise2D(
          (nx + 4.7) * 1600 * config.flowScale,
          (ny - 1.8) * 1600 * config.flowScale,
        ) *
        config.inkDrift *
        0.18;
      const px = nx + warp1;
      const py = ny + warp2;
      const n = runtime.simplex.noise2D(
        px * 1200 * config.flowScale,
        py * 1200 * config.flowScale,
      );
      const n2 =
        runtime.simplex.noise2D(
          (px + 2.3) * 2400 * config.flowScale,
          (py - 2.1) * 2400 * config.flowScale,
        ) * 0.4;
      const flow = n * 0.7 + n2 * 0.3;
      const vein = Math.pow(
        Math.abs(
          Math.sin((flow * config.veinFreq * 4.2 + py * 3.2) * Math.PI),
        ),
        1.4 + config.contrast * 1.7,
      );
      const veinMask = smoothstep(
        0.62 - config.contrast * 0.2,
        0.96,
        vein,
      );
      const stone = Math.round(
        145 + config.stoneLightness * 92 + flow * 9,
      );
      let r = stone;
      let g = stone - 4;
      let b = stone - 10;
      const warmVein = 42 + config.contrast * 38;
      r = r * (1 - veinMask) + warmVein * veinMask;
      g = g * (1 - veinMask) + (warmVein - 10) * veinMask;
      b = b * (1 - veinMask) + (warmVein - 18) * veinMask;
      const cloud = clamp01(
        (runtime.simplex.noise2D(
          px * 400 * config.flowScale,
          py * 400 * config.flowScale,
        ) +
          1) /
          2,
      );
      return {
        r: r + cloud * 14,
        g: g + cloud * 11,
        b: b + cloud * 7,
        a: 255,
      };
    }

    return { config, renderPixel };
  }

  const api = { normalizeMarbleConfig, createMarbleRenderer };
  global.RadenMarbleInk = Object.assign({}, global.RadenMarbleInk || {}, api);
  global.RadenModes?.registerRuntime?.("marbleink", {
    normalizeConfig: normalizeMarbleConfig,
    createRenderer: createMarbleRenderer,
  });
})(window);
