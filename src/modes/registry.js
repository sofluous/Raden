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
        "nacrePalette",
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
        "nacrePalette",
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
        "nacrePalette",
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
        "nacrePalette",
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
        "nacrePalette",
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
        "nacrePalette",
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
        "nacrePalette",
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
        "nacrePalette",
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
        "nacrePalette",
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
        "nacrePalette",
      ],
    },
  ];

  const modesById = new Map(MODE_DEFINITIONS.map((mode) => [mode.id, mode]));
  const runtimesById = new Map();

  function registerRuntime(modeId, runtime) {
    if (!modesById.has(modeId)) {
      throw new Error(`Cannot register runtime for unknown mode: ${modeId}`);
    }
    if (
      !runtime ||
      typeof runtime.normalizeConfig !== "function" ||
      typeof runtime.createRenderer !== "function"
    ) {
      throw new TypeError(
        `Mode runtime ${modeId} requires normalizeConfig() and createRenderer().`,
      );
    }
    const stageDefinition = runtime.stages
      ? { externalInputs: runtime.externalInputs || ["point", "runtime"], stages: runtime.stages }
      : null;
    let stageDescription = null;
    if (stageDefinition && global.RadenStages?.createStagePipeline) {
      stageDescription = global.RadenStages.createStagePipeline({
        modeId,
        externalInputs: stageDefinition.externalInputs,
        stages: stageDefinition.stages,
        execute: (value) => value,
      }).describe();
    }
    const createRenderer = runtime.createRenderer;
    const registeredRuntime = Object.assign({}, runtime, {
      stages: stageDescription?.stages || runtime.stages || null,
      ownsAuthoredPalette: !!stageDescription?.stages.some(
        (stage) => stage.id === "authoredPalette",
      ),
      describeStages: stageDescription ? () => stageDescription : null,
      createRenderer: stageDescription
        ? (...args) => {
            const renderer = createRenderer(...args);
            return Object.assign({}, renderer, {
              describeStages: () => stageDescription,
            });
          }
        : createRenderer,
    });
    runtimesById.set(modeId, Object.freeze(registeredRuntime));
  }

  function getRuntime(modeId) {
    return runtimesById.get(modeId) || null;
  }

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
    registerRuntime,
    getRuntime,
    validateRegistry,
  });
})(window);
