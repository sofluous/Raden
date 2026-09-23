/* Raden layer/effect state foundation (Non-destructive L0/L1)
 * Exposed via window.RadenLayers for compatibility with the static app shell.
 */
(function registerRadenLayers(global) {
  const LAYER_STATE_VERSION = 2;
  const IMAGE_EFFECT_MODE_IDS = new Set(["risoimage", "pixelretro", "risograph"]);
  const POST_FX_CONTROL_IDS = [
    "boostR",
    "boostG",
    "boostB",
    "grainToggle",
    "gaussianBlur",
    "fxInvert",
    "fxChromatic",
    "fxGlitch",
    "fxScanline",
  ];
  const SOURCE_MODE_FALLBACK = "motherofpearl";

  function nowIso() {
    return new Date().toISOString();
  }

  function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  function getModeLabel(modeId) {
    const mode = global.RadenModes?.getMode?.(modeId);
    return mode?.label || modeId || "Layer";
  }

  function classifyMode(modeId) {
    if (IMAGE_EFFECT_MODE_IDS.has(modeId)) return "effect";
    return "source";
  }

  function getSourceModeForMode(modeId) {
    return classifyMode(modeId) === "source" ? modeId : SOURCE_MODE_FALLBACK;
  }

  function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function buildSourceLayerFromFlatState(flatState, opts) {
    const options = opts || {};
    const modeId = options.modeId || flatState?.modeSelector || SOURCE_MODE_FALLBACK;
    const sourceModeId = getSourceModeForMode(modeId);
    return {
      id: options.layerId || createId("layer"),
      type: "source",
      sourceType: "generator",
      label: getModeLabel(sourceModeId),
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "normal",
      modeId: sourceModeId,
      config: clone(flatState || {}),
      bitmapRef: null,
      effects: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  function buildEffectFromFlatState(flatState, opts) {
    const options = opts || {};
    const modeId = options.modeId || flatState?.modeSelector || "";
    if (classifyMode(modeId) !== "effect") return null;
    return {
      id: options.effectId || createId("effect"),
      type: "effect",
      effectId: modeId,
      label: getModeLabel(modeId),
      enabled: true,
      config: clone(flatState || {}),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  function buildPostFxEffectFromFlatState(flatState, opts) {
    const options = opts || {};
    const config = {};
    POST_FX_CONTROL_IDS.forEach((id) => {
      if (Object.prototype.hasOwnProperty.call(flatState || {}, id)) {
        config[id] = flatState[id];
      }
    });
    return {
      id: options.effectId || createId("effect_post"),
      type: "effect",
      effectId: "postFx",
      label: "Post FX",
      enabled: true,
      config,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  function buildLayerStateFromFlatState(flatState, opts) {
    const options = opts || {};
    const modeId = options.modeId || flatState?.modeSelector || SOURCE_MODE_FALLBACK;
    const sourceLayer = buildSourceLayerFromFlatState(flatState, {
      modeId,
      layerId: options.layerId,
    });
    const imageEffect = buildEffectFromFlatState(flatState, {
      modeId,
      effectId: options.effectId,
    });
    if (imageEffect) {
      sourceLayer.effects.push(imageEffect);
    }
    const postFxEffect = buildPostFxEffectFromFlatState(flatState, {
      effectId: options.postFxEffectId,
    });
    sourceLayer.effects.push(postFxEffect);

    return {
      version: LAYER_STATE_VERSION,
      canvas: {
        width: Number(options.width || flatState?.renderWidth || 0) || null,
        height: Number(options.height || flatState?.renderHeight || 0) || null,
        background: options.background || "#f2efe8",
      },
      activeLayerId: sourceLayer.id,
      activeEffectId: imageEffect?.id || postFxEffect.id,
      layers: [sourceLayer],
      legacySettings: clone(flatState || {}),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  function getLegacySettingsFromLayerState(layerState) {
    if (!layerState || typeof layerState !== "object") return null;
    if (layerState.legacySettings && typeof layerState.legacySettings === "object") {
      return clone(layerState.legacySettings);
    }
    const activeLayer =
      Array.isArray(layerState.layers) &&
      layerState.layers.find((layer) => layer.id === layerState.activeLayerId);
    if (!activeLayer) return null;
    const activeEffect =
      Array.isArray(activeLayer.effects) &&
      activeLayer.effects.find((effect) => effect.id === layerState.activeEffectId);
    return clone(activeEffect?.config || activeLayer.config || null);
  }

  function normalizeGalleryItem(item) {
    if (!item || typeof item !== "object") return item;
    if (item.version >= LAYER_STATE_VERSION && item.state) return item;
    const settings = item.settings || item.legacySettings || {};
    const modeId = settings.modeSelector || document.getElementById("modeSelector")?.value;
    return Object.assign({}, item, {
      version: LAYER_STATE_VERSION,
      state: buildLayerStateFromFlatState(settings, { modeId }),
      legacySettings: clone(settings),
    });
  }

  function validateLayerState(layerState) {
    const issues = [];
    if (!layerState || typeof layerState !== "object") {
      return ["Layer state is missing."];
    }
    if (layerState.version !== LAYER_STATE_VERSION) {
      issues.push(`Unsupported layer state version: ${layerState.version}`);
    }
    if (!Array.isArray(layerState.layers) || !layerState.layers.length) {
      issues.push("Layer state has no layers.");
      return issues;
    }
    const ids = new Set();
    layerState.layers.forEach((layer) => {
      if (!layer?.id) {
        issues.push("Layer is missing id.");
        return;
      }
      if (ids.has(layer.id)) issues.push(`Duplicate layer id: ${layer.id}`);
      ids.add(layer.id);
      if (layer.type !== "source") {
        issues.push(`Layer ${layer.id} has unsupported type: ${layer.type}`);
      }
      if (!layer.modeId && layer.sourceType === "generator") {
        issues.push(`Layer ${layer.id} is missing modeId.`);
      }
      const effectIds = new Set();
      (layer.effects || []).forEach((effect) => {
        if (!effect?.id) {
          issues.push(`Layer ${layer.id} has effect missing id.`);
          return;
        }
        if (effectIds.has(effect.id)) {
          issues.push(`Duplicate effect id in ${layer.id}: ${effect.id}`);
        }
        effectIds.add(effect.id);
        if (!effect.effectId) {
          issues.push(`Effect ${effect.id} is missing effectId.`);
        }
        if (effect.effectId === "postFx" && !effect.config) {
          issues.push(`Post FX effect ${effect.id} is missing config.`);
        }
      });
    });
    if (layerState.activeLayerId && !ids.has(layerState.activeLayerId)) {
      issues.push(`Active layer not found: ${layerState.activeLayerId}`);
    }
    return issues;
  }

  global.RadenLayers = Object.assign({}, global.RadenLayers || {}, {
    LAYER_STATE_VERSION,
    IMAGE_EFFECT_MODE_IDS,
    POST_FX_CONTROL_IDS,
    classifyMode,
    buildLayerStateFromFlatState,
    getLegacySettingsFromLayerState,
    normalizeGalleryItem,
    validateLayerState,
  });
})(window);
