/* Raden mode registry (Architecture Phase A)
 * Exposed via window.RadenModes to preserve the current static app model.
 */
(function registerRadenModes(global) {
  const MODE_DEFINITIONS = [
    {
      id: "motherofpearl",
      label: "Mother of Pearl",
      status: "stable",
      family: "procedural",
      activeControlIds: [
        "scale",
        "layers",
        "flowMode",
        "layerLength",
        "ringSpacing",
        "ringJitter",
        "seamThickness",
        "seamContrast",
        "highlightStrength",
        "lightAngle",
        "lightCurvature",
        "lightSpread",
        "scratchDensity",
        "scratchAngle",
        "surfacePolish",
        "blend",
        "intensity",
        "range",
        "substrateTone",
        "substrateMix",
        "nacrePalette",
        "nacreBrilliance",
        "nacreChromatic",
        "textureFamily",
        "opalCellScale",
        "opalVeinDensity",
        "opalFire",
        "opalMatrix",
        "labradoriteScale",
        "labradoriteDirection",
        "labradoriteBanding",
        "labradoriteFlash",
        "labradoriteDarkness",
      ],
    },
    {
      id: "opalvein",
      label: "Opal Vein",
      status: "stable",
      family: "procedural",
      activeControlIds: [
        "opalCellScale",
        "opalVeinDensity",
        "opalFire",
        "opalMatrix",
      ],
    },
    {
      id: "labradorite",
      label: "Labradorite Flash",
      status: "stable",
      family: "procedural",
      activeControlIds: [
        "labradoriteScale",
        "labradoriteDirection",
        "labradoriteBanding",
        "labradoriteFlash",
        "labradoriteDarkness",
      ],
    },
    {
      id: "marbleink",
      label: "Marble Ink",
      status: "stable",
      family: "procedural",
      activeControlIds: [
        "marbleFlowScale",
        "marbleVeinFreq",
        "marbleContrast",
        "marbleInkDrift",
        "marbleLightness",
      ],
    },
    {
      id: "agateband",
      label: "Agate Bands",
      status: "stable",
      family: "natural",
      activeControlIds: [
        "naturalScale",
        "naturalWarp",
        "agateBandFreq",
        "agateBandJitter",
        "agateVeinDensity",
        "agateTranslucency",
        "agateEdgeDarken",
      ],
    },
    {
      id: "malachiteflow",
      label: "Malachite Flow",
      status: "stable",
      family: "natural",
      activeControlIds: [
        "naturalScale",
        "naturalWarp",
        "naturalTurbulence",
        "naturalAnisotropy",
        "malachiteSwirl",
        "malachiteRingTightness",
        "malachiteRingVariance",
        "malachiteContrast",
      ],
    },
    {
      id: "lichengrowth",
      label: "Lichen Growth",
      status: "stable",
      family: "natural",
      activeControlIds: [
        "naturalScale",
        "naturalWarp",
        "lichenPatchScale",
        "lichenBranching",
        "lichenCoverage",
        "lichenMoistureTone",
        "lichenEdgeRoughness",
      ],
    },
    {
      id: "icebloom",
      label: "Ice Crystal Bloom",
      status: "deferred",
      family: "natural",
      activeControlIds: [
        "naturalScale",
        "naturalWarp",
        "iceBranchDepth",
        "iceBranchAngleJitter",
        "iceFrostDensity",
        "iceMeltSoftness",
        "iceHaze",
      ],
    },
    {
      id: "riverdelta",
      label: "River Delta",
      status: "stable",
      family: "natural",
      activeControlIds: [
        "naturalScale",
        "naturalWarp",
        "naturalTurbulence",
        "naturalAnisotropy",
        "deltaChannelWidth",
        "deltaBranchRate",
        "deltaSedimentMix",
        "deltaFloodplainSoftness",
        "deltaErosion",
      ],
    },
    {
      id: "bubblefilm",
      label: "Bubble Film",
      status: "stable",
      family: "natural",
      activeControlIds: [
        "naturalScale",
        "naturalWarp",
        "naturalTurbulence",
      ],
    },
    {
      id: "topography",
      label: "Topography",
      status: "stable",
      family: "procedural",
      activeControlIds: [
        "scale",
        "layers",
        "topoPreset",
        "topoNoiseType",
        "topoBandCount",
        "topoRenderMode",
        "topoRidge",
        "topoWarp",
        "topoErosion",
      ],
    },
  ];

  const modesById = new Map(MODE_DEFINITIONS.map((mode) => [mode.id, mode]));

  function cloneMode(mode) {
    return Object.assign({}, mode, {
      activeControlIds: Array.from(mode.activeControlIds || []),
    });
  }

  function listModes() {
    return MODE_DEFINITIONS.map(cloneMode);
  }

  function getMode(id) {
    const mode = modesById.get(id);
    return mode ? cloneMode(mode) : null;
  }

  function getModeLabel(id) {
    return modesById.get(id)?.label || id;
  }

  function getModeStatus(id) {
    return modesById.get(id)?.status || "stable";
  }

  function getActiveControlIdMap() {
    const out = {};
    MODE_DEFINITIONS.forEach((mode) => {
      out[mode.id] = new Set(mode.activeControlIds || []);
    });
    return out;
  }

  function isSetLike(value) {
    return !!value && typeof value.has === "function";
  }

  function validateRegistry(opts) {
    const options = opts || {};
    const domIds = isSetLike(options.domIds) ? options.domIds : null;
    const issues = [];
    const seen = new Set();
    MODE_DEFINITIONS.forEach((mode) => {
      if (!mode.id) issues.push("Mode is missing id");
      if (seen.has(mode.id)) issues.push(`Duplicate mode id: ${mode.id}`);
      seen.add(mode.id);
      if (!mode.label) issues.push(`Mode ${mode.id} is missing label`);
      if (!["stable", "deferred", "experimental"].includes(mode.status)) {
        issues.push(`Mode ${mode.id} has invalid status: ${mode.status}`);
      }
      if (!Array.isArray(mode.activeControlIds)) {
        issues.push(`Mode ${mode.id} activeControlIds must be an array`);
        return;
      }
      if (domIds) {
        mode.activeControlIds.forEach((id) => {
          if (!domIds.has(id)) {
            issues.push(`Mode ${mode.id} references missing control id: ${id}`);
          }
        });
      }
    });
    return issues;
  }

  global.RadenModes = Object.assign({}, global.RadenModes || {}, {
    listModes,
    getMode,
    getModeLabel,
    getModeStatus,
    getActiveControlIdMap,
    validateRegistry,
  });
})(window);
