/* Labradorite Flash procedural renderer contract. */
(function registerRadenLabradorite(global) {
  function normalizeLabradoriteConfig(rawConfig) {
    const raw = rawConfig || {};
    const direction = (Number(raw.labradoriteDirection) || 0.33) * Math.PI * 2;
    return Object.assign({}, raw, {
      // Preserve legacy truthy fallbacks during architecture migration.
      scale: Number(raw.labradoriteScale) || 0.008,
      bandSharpness: Number(raw.labradoriteBanding) || 1.6,
      flashStrength: Number(raw.labradoriteFlash) || 1.35,
      baseDarkness: global.RadenShared.clamp01(
        Number(raw.labradoriteDarkness) || 0.68,
      ),
      direction,
      dirX: Math.cos(direction),
      dirY: Math.sin(direction),
    });
  }

  function createLabradoriteRenderer(rawConfig, runtime) {
    const config = normalizeLabradoriteConfig(rawConfig);
    if (!runtime?.simplex || typeof runtime.simplex.noise2D !== "function") {
      throw new TypeError("Labradorite renderer requires a simplex sampler.");
    }
    const { clamp01, hslToRgb } = global.RadenShared;

    function renderPixel(point) {
      const { nx, ny } = point;
      const nBase = runtime.simplex.noise2D(
        (nx + 0.5) * 680 * config.scale,
        (ny + 0.5) * 680 * config.scale,
      );
      const nDetail =
        runtime.simplex.noise2D(
          (nx + 1.8) * 1400 * config.scale,
          (ny - 2.4) * 1400 * config.scale,
        ) * 0.45;
      const field = nBase * 0.75 + nDetail * 0.25;
      const directionBand = nx * config.dirX + ny * config.dirY;
      const band = Math.pow(
        Math.abs(
          Math.sin(
            (directionBand * (36 + config.bandSharpness * 22) + field * 2.1) *
              Math.PI,
          ),
        ),
        1.2 + config.bandSharpness,
      );
      const flashMask = clamp01(
        band * (0.4 + config.flashStrength * 0.42) +
          clamp01((field + 1) / 2) * 0.16,
      );
      const base = 8 + (1 - config.baseDarkness) * 24;
      let r = base;
      let g = base + 2;
      let b = base + 5;
      const hue = (178 + field * 48 + directionBand * 90 + 360) % 360;
      const sat = Math.min(
        100,
        42 + config.flashStrength * 28 + flashMask * 20,
      );
      const lum = Math.min(88, 18 + flashMask * 52);
      const [fr, fg, fb] = hslToRgb(hue, sat, lum);
      r = r * (1 - flashMask) + fr * flashMask;
      g = g * (1 - flashMask) + fg * flashMask;
      b = b * (1 - flashMask) + fb * flashMask;
      const spark =
        Math.pow(
          clamp01(
            (runtime.simplex.noise2D(
              (nx + 4.2) * 2600,
              (ny - 1.3) * 2600,
            ) +
              1) /
              2,
          ),
          18,
        ) *
        config.flashStrength *
        170;
      return {
        r: r + spark * 0.45,
        g: g + spark * 0.8,
        b: b + spark,
        a: 255,
      };
    }

    return { config, renderPixel };
  }

  const api = { normalizeLabradoriteConfig, createLabradoriteRenderer };
  global.RadenLabradorite = Object.assign(
    {},
    global.RadenLabradorite || {},
    api,
  );
  global.RadenModes?.registerRuntime?.("labradorite", {
    normalizeConfig: normalizeLabradoriteConfig,
    createRenderer: createLabradoriteRenderer,
  });
})(window);
