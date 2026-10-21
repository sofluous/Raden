/* Serializable authored palette state and immutable preset registry. */
(function registerRadenPalettes(global) {
  const PALETTE_STATE_VERSION = 1;
  const MAX_STOPS = 16;
  const PRESETS = Object.freeze({
    motherofpearl: Object.freeze({
      classic: Object.freeze([
        Object.freeze({ h: 286, s: 26, l: 83 }),
        Object.freeze({ h: 192, s: 28, l: 85 }),
        Object.freeze({ h: 148, s: 24, l: 84 }),
        Object.freeze({ h: 330, s: 20, l: 88 }),
        Object.freeze({ h: 28, s: 12, l: 93 }),
      ]),
      abalone: Object.freeze([
        Object.freeze({ h: 278, s: 34, l: 82 }),
        Object.freeze({ h: 232, s: 38, l: 79 }),
        Object.freeze({ h: 186, s: 44, l: 79 }),
        Object.freeze({ h: 154, s: 38, l: 80 }),
        Object.freeze({ h: 334, s: 31, l: 86 }),
      ]),
      silver: Object.freeze([
        Object.freeze({ h: 230, s: 10, l: 88 }),
        Object.freeze({ h: 210, s: 12, l: 84 }),
        Object.freeze({ h: 185, s: 15, l: 86 }),
        Object.freeze({ h: 260, s: 10, l: 87 }),
        Object.freeze({ h: 26, s: 6, l: 94 }),
      ]),
      pinkgreen: Object.freeze([
        Object.freeze({ h: 328, s: 34, l: 86 }),
        Object.freeze({ h: 300, s: 30, l: 84 }),
        Object.freeze({ h: 164, s: 38, l: 81 }),
        Object.freeze({ h: 136, s: 34, l: 82 }),
        Object.freeze({ h: 28, s: 12, l: 93 }),
      ]),
    }),
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function getPreset(modeId, presetId) {
    const modePresets = PRESETS[modeId] || {};
    const fallbackId = Object.prototype.hasOwnProperty.call(modePresets, "classic")
      ? "classic"
      : Object.keys(modePresets)[0];
    const resolvedId = Object.prototype.hasOwnProperty.call(modePresets, presetId)
      ? presetId
      : fallbackId;
    return {
      id: resolvedId || null,
      colors: clone((resolvedId && modePresets[resolvedId]) || []),
    };
  }

  function createPaletteState(modeId, presetId) {
    const preset = getPreset(modeId, presetId);
    if (preset.colors.length < 2) return null;
    return {
      version: PALETTE_STATE_VERSION,
      modeId,
      presetId: preset.id,
      source: "preset",
      stops: preset.colors.map((color, index) => ({
        id: `${preset.id || "palette"}-${index + 1}`,
        color,
      })),
    };
  }

  function normalizePaletteState(value, options) {
    const opts = options || {};
    if (value == null && opts.allowNull) return null;
    const modeId = String(value?.modeId || opts.modeId || "");
    const presetId = String(value?.presetId || opts.presetId || "classic");
    const fallback = createPaletteState(modeId, presetId);
    const rawStops = Array.isArray(value?.stops) ? value.stops.slice(0, MAX_STOPS) : [];
    if (rawStops.length < 2) return fallback;
    const seenIds = new Set();
    const stops = rawStops.map((stop, index) => {
      const rawId = String(stop?.id || `swatch-${index + 1}`);
      const id = seenIds.has(rawId) ? `${rawId}-${index + 1}` : rawId;
      seenIds.add(id);
      return {
        id,
        color: {
          h: clamp(Number.isFinite(Number(stop?.color?.h)) ? stop.color.h : 0, 0, 360),
          s: clamp(Number.isFinite(Number(stop?.color?.s)) ? stop.color.s : 0, 0, 100),
          l: clamp(Number.isFinite(Number(stop?.color?.l)) ? stop.color.l : 50, 0, 100),
        },
      };
    });
    return {
      version: PALETTE_STATE_VERSION,
      modeId,
      presetId: value?.presetId == null ? null : presetId,
      source: value?.source === "preset" ? "preset" : "custom",
      stops,
    };
  }

  function resolveColors(options) {
    const opts = options || {};
    const normalized = normalizePaletteState(opts.palette, {
      modeId: opts.modeId,
      presetId: opts.presetId,
      allowNull: true,
    });
    if (normalized?.stops?.length >= 2) {
      return normalized.stops.map((stop) => clone(stop.color));
    }
    return getPreset(opts.modeId, opts.presetId).colors;
  }

  function hslToHex(color) {
    const h = ((Number(color?.h) || 0) % 360 + 360) % 360;
    const s = clamp(color?.s || 0, 0, 100) / 100;
    const l = clamp(color?.l || 0, 0, 100) / 100;
    const a = s * Math.min(l, 1 - l);
    const channel = (n) => {
      const k = (n + h / 30) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    };
    return `#${[channel(0), channel(8), channel(4)]
      .map((value) => Math.round(value * 255).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function randomizePaletteState(value, options) {
    const opts = options || {};
    const random = typeof opts.random === "function" ? opts.random : Math.random;
    const next = normalizePaletteState(value, {
      modeId: opts.modeId,
      presetId: opts.presetId,
    });
    if (!next) return null;
    next.source = "custom";
    next.presetId = null;
    next.stops.forEach((stop) => {
      stop.color.h = Math.floor(random() * 361);
      stop.color.s = 20 + Math.floor(random() * 81);
      stop.color.l = 18 + Math.floor(random() * 78);
    });
    return next;
  }

  global.RadenPalettes = Object.assign({}, global.RadenPalettes || {}, {
    PALETTE_STATE_VERSION,
    createPaletteState,
    normalizePaletteState,
    resolveColors,
    getPreset,
    hslToHex,
    randomizePaletteState,
  });
})(window);
