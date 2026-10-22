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
    opalvein: makePresetSet([[220, 18, 18], [192, 30, 48], [168, 42, 68], [36, 72, 66], [318, 64, 58]]),
    labradorite: makePresetSet([[218, 24, 12], [206, 38, 24], [184, 62, 42], [154, 54, 48], [48, 58, 58]]),
    marbleink: makePresetSet([[224, 16, 16], [216, 12, 34], [205, 10, 58], [42, 18, 82], [38, 22, 94]]),
    agateband: makePresetSet([[18, 38, 14], [17, 35, 28], [28, 46, 52], [36, 49, 72], [39, 43, 87]]),
    malachiteflow: makePresetSet([[160, 68, 9], [158, 63, 18], [156, 47, 38], [145, 43, 57], [139, 42, 77]]),
    lichengrowth: makePresetSet([[92, 20, 12], [88, 25, 27], [78, 29, 46], [68, 31, 62], [66, 37, 79]]),
    icebloom: makePresetSet([[218, 35, 18], [210, 52, 38], [199, 62, 62], [190, 70, 80], [186, 72, 94]]),
    riverdelta: makePresetSet([[214, 27, 19], [194, 20, 43], [73, 20, 59], [43, 36, 69], [39, 40, 84]]),
    bubblefilm: makePresetSet([[245, 34, 18], [218, 42, 34], [190, 55, 54], [302, 48, 68], [42, 62, 82]]),
    topography: makePresetSet([[210, 8, 12], [205, 10, 30], [74, 18, 50], [42, 28, 70], [38, 22, 90]]),
  });

  function makePresetSet(classic) {
    const toColors = (values) => Object.freeze(values.map(([h, s, l]) => Object.freeze({ h, s, l })));
    return Object.freeze({
      classic: toColors(classic),
      cool: toColors(classic.map(([h, s, l], index) => [((h + 38 + index * 5) % 360), Math.min(100, s + 8), l])),
      warm: toColors(classic.map(([h, s, l], index) => [((h + 322 - index * 4) % 360), Math.min(100, s + 10), l])),
    });
  }

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

  function listPresets(modeId) {
    return Object.keys(PRESETS[modeId] || {}).map((id) => ({
      id,
      label: id === "classic" ? "Classic" : id[0].toUpperCase() + id.slice(1),
    }));
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
    listPresets,
    hslToHex,
    randomizePaletteState,
  });
})(window);
