/* Raden layer/effect state foundation (Non-destructive L0/L1)
 * Exposed via window.RadenLayers for compatibility with the static app shell.
 */
(function registerRadenLayers(global) {
  const LAYER_STATE_VERSION = 2;
  const IMAGE_EFFECT_MODE_IDS = new Set(["risoimage", "pixelretro", "risograph"]);
  const POST_FX_CONTROL_IDS = global.RadenEffects?.POST_FX_CONTROL_IDS || [
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
  const EFFECT_LABELS = global.RadenEffects?.EFFECT_LABELS || {
    postFx: "Legacy Post FX Bundle",
    rgbAdjust: "RGB Adjustment",
    gaussianBlur: "Gaussian Blur",
    grain: "Grain",
    invert: "Invert",
    chromatic: "Chromatic Shift",
    glitch: "Glitch",
    scanline: "Scanlines",
  };
  const SOURCE_MODE_FALLBACK = "motherofpearl";

  function nowIso() {
    return new Date().toISOString();
  }

  function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  function getModeLabel(modeId) {
    if (global.RadenEffects?.getEffectLabel) return global.RadenEffects.getEffectLabel(modeId);
    if (EFFECT_LABELS[modeId]) return EFFECT_LABELS[modeId];
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
      label: getModeLabel("postFx"),
      enabled: true,
      config,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  function buildEffect(effectId, opts) {
    const options = opts || {};
    const id = effectId || "postFx";
    const defaultConfig = global.RadenEffects?.getEffectDefaults?.(id) || {};
    return {
      id: options.id || createId(id === "postFx" ? "effect_post" : "effect"),
      type: "effect",
      effectId: id,
      label: options.label || getModeLabel(id),
      enabled: options.enabled !== false,
      config: Object.assign({}, defaultConfig, clone(options.config || {})),
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
    if (options.includePostFxBundle) {
      const postFxEffect = buildPostFxEffectFromFlatState(flatState, {
        effectId: options.postFxEffectId,
      });
      sourceLayer.effects.push(postFxEffect);
    }

    return {
      version: LAYER_STATE_VERSION,
      canvas: {
        width: Number(options.width || flatState?.renderWidth || 0) || null,
        height: Number(options.height || flatState?.renderHeight || 0) || null,
        background: options.background || "#f2efe8",
      },
      activeLayerId: sourceLayer.id,
      activeEffectId: null,
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

  function getActiveLayer(layerState) {
    if (!layerState || !Array.isArray(layerState.layers)) return null;
    return (
      layerState.layers.find((layer) => layer.id === layerState.activeLayerId) ||
      layerState.layers[0] ||
      null
    );
  }

  function getActiveEffect(layerState) {
    const layer = getActiveLayer(layerState);
    if (!layer || !Array.isArray(layer.effects)) return null;
    return (
      layer.effects.find((effect) => effect.id === layerState.activeEffectId) ||
      layer.effects[0] ||
      null
    );
  }

  function updateLayerState(layerState, updater) {
    const nextState = clone(layerState);
    const layer = getActiveLayer(nextState);
    if (!layer) return nextState;
    if (!Array.isArray(layer.effects)) layer.effects = [];
    updater(nextState, layer);
    nextState.updatedAt = nowIso();
    layer.updatedAt = nowIso();
    return nextState;
  }

  function selectBaseLayer(layerState) {
    return updateLayerState(layerState, (nextState) => {
      nextState.activeEffectId = null;
    });
  }

  function selectEffect(layerState, effectId) {
    return updateLayerState(layerState, (nextState, layer) => {
      const exists = layer.effects.some((effect) => effect.id === effectId);
      nextState.activeEffectId = exists ? effectId : layer.effects[0]?.id || null;
    });
  }

  function addEffect(layerState, effectId, opts) {
    const options = opts || {};
    return updateLayerState(layerState, (nextState, layer) => {
      const effect = buildEffect(effectId || "postFx", {
        config: options.config,
        enabled: options.enabled,
      });
      const selectedIndex = layer.effects.findIndex(
        (item) => item.id === nextState.activeEffectId,
      );
      const insertAt =
        Number.isInteger(options.index) && options.index >= 0
          ? Math.min(options.index, layer.effects.length)
          : selectedIndex >= 0
            ? selectedIndex + 1
            : layer.effects.length;
      layer.effects.splice(insertAt, 0, effect);
      nextState.activeEffectId = effect.id;
    });
  }

  function removeEffect(layerState, effectId) {
    return updateLayerState(layerState, (nextState, layer) => {
      const index = layer.effects.findIndex((effect) => effect.id === effectId);
      if (index < 0) return;
      layer.effects.splice(index, 1);
      if (nextState.activeEffectId === effectId) {
        nextState.activeEffectId =
          layer.effects[Math.min(index, layer.effects.length - 1)]?.id || null;
      }
    });
  }

  function moveEffect(layerState, effectId, direction) {
    return updateLayerState(layerState, (nextState, layer) => {
      const index = layer.effects.findIndex((effect) => effect.id === effectId);
      const delta = direction === "up" ? -1 : 1;
      const nextIndex = index + delta;
      if (index < 0 || nextIndex < 0 || nextIndex >= layer.effects.length) return;
      const [effect] = layer.effects.splice(index, 1);
      layer.effects.splice(nextIndex, 0, effect);
      nextState.activeEffectId = effect.id;
    });
  }

  function moveEffectToIndex(layerState, effectId, targetIndex) {
    return updateLayerState(layerState, (nextState, layer) => {
      const index = layer.effects.findIndex((effect) => effect.id === effectId);
      if (index < 0) return;
      const boundedIndex = Math.max(0, Math.min(Number(targetIndex) || 0, layer.effects.length - 1));
      if (index === boundedIndex) return;
      const [effect] = layer.effects.splice(index, 1);
      layer.effects.splice(boundedIndex, 0, effect);
      nextState.activeEffectId = effect.id;
    });
  }

  function setEffectEnabled(layerState, effectId, enabled) {
    return updateLayerState(layerState, (nextState, layer) => {
      const effect = layer.effects.find((item) => item.id === effectId);
      if (!effect) return;
      effect.enabled = !!enabled;
      effect.updatedAt = nowIso();
      nextState.activeEffectId = effect.id;
    });
  }

  function updateEffectConfig(layerState, effectId, configPatch) {
    return updateLayerState(layerState, (nextState, layer) => {
      const effect = layer.effects.find((item) => item.id === effectId);
      if (!effect) return;
      effect.config = Object.assign({}, effect.config || {}, clone(configPatch || {}));
      effect.updatedAt = nowIso();
    });
  }

  function normalizeGalleryItem(item) {
    if (!item || typeof item !== "object") return item;
    if (item.version >= LAYER_STATE_VERSION && item.state) return item;
    const settings = item.settings || item.legacySettings || {};
    const modeId = settings.modeSelector || document.getElementById("modeSelector")?.value;
    return Object.assign({}, item, {
      version: LAYER_STATE_VERSION,
      state: buildLayerStateFromFlatState(settings, {
        modeId,
        includePostFxBundle: true,
      }),
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
    EFFECT_LABELS,
    classifyMode,
    buildLayerStateFromFlatState,
    getActiveLayer,
    getActiveEffect,
    getLegacySettingsFromLayerState,
    selectBaseLayer,
    selectEffect,
    addEffect,
    removeEffect,
    moveEffect,
    moveEffectToIndex,
    setEffectEnabled,
    updateEffectConfig,
    normalizeGalleryItem,
    validateLayerState,
  });
})(window);
