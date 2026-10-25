/* Raden mode registry (Architecture Phase A)
 * Exposed via window.RadenModes to preserve the current static app model.
 */
(function registerRadenModes(global) {
  const MODE_DEFINITIONS = [
    {
      id: "icebloom",
      order: 7,
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
  ];

  const modesById = new Map();
  const runtimesById = new Map();

  function normalizeModeDefinition(definition) {
    const mode = definition || {};
    const id = String(mode.id || "").trim();
    if (!id) throw new TypeError("Mode definition requires an id.");
    const label = String(mode.label || "").trim();
    if (!label) throw new TypeError(`Mode ${id} requires a label.`);
    const status = String(mode.status || "");
    if (!["stable", "deferred", "experimental"].includes(status)) {
      throw new TypeError(`Mode ${id} has invalid status: ${status || "missing"}.`);
    }
    const activeControlIds = Array.from(
      new Set((Array.isArray(mode.activeControlIds) ? mode.activeControlIds : []).map(String)),
    );
    if (!Array.isArray(mode.activeControlIds)) {
      throw new TypeError(`Mode ${id} activeControlIds must be an array.`);
    }
    const order = Number(mode.order);
    if (!Number.isFinite(order)) throw new TypeError(`Mode ${id} requires a finite order.`);
    return Object.freeze({
      id,
      order,
      label,
      status,
      family: String(mode.family || "procedural"),
      activeControlIds: Object.freeze(activeControlIds),
    });
  }

  function assertModeAvailable(mode) {
    if (modesById.has(mode.id)) {
      throw new Error(`Cannot register duplicate mode: ${mode.id}`);
    }
    if (MODE_DEFINITIONS.some((candidate) => candidate.order === mode.order)) {
      throw new Error(`Cannot register duplicate mode order: ${mode.order}`);
    }
  }

  function commitMode(mode) {
    MODE_DEFINITIONS.push(mode);
    modesById.set(mode.id, mode);
  }

  function registerMode(definition) {
    const mode = normalizeModeDefinition(definition);
    assertModeAvailable(mode);
    commitMode(mode);
    return cloneMode(mode);
  }

  MODE_DEFINITIONS.forEach((definition, index) => {
    const mode = normalizeModeDefinition(definition);
    if (modesById.has(mode.id)) throw new Error(`Duplicate mode id: ${mode.id}`);
    if (
      MODE_DEFINITIONS.slice(0, index).some(
        (candidate) => Number(candidate.order) === mode.order,
      )
    ) {
      throw new Error(`Duplicate mode order: ${mode.order}`);
    }
    MODE_DEFINITIONS[index] = mode;
    modesById.set(mode.id, mode);
  });

  function buildRegisteredRuntime(mode, runtime) {
    const modeId = mode.id;
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
      if (mode.status === "stable") {
        global.RadenStages.assertTextureStageDescription(stageDescription, {
          activeControlIds: mode.activeControlIds,
          paletteControlId: "nacrePalette",
        });
      }
    }
    if (mode.status === "stable" && !runtime.inspector) {
      throw new TypeError(`Stable mode ${modeId} requires an inspector definition.`);
    }
    const inspector = runtime.inspector
      ? normalizeInspectorDefinition(mode, runtime.inspector, stageDescription)
      : null;
    const randomization = runtime.randomization
      ? normalizeRandomizationDefinition(mode, runtime.randomization)
      : null;
    if (mode.status === "stable" && !randomization) {
      throw new TypeError(`Stable mode ${modeId} requires a randomization definition.`);
    }
    const help = runtime.help ? normalizeHelpDefinition(mode, runtime.help) : null;
    const createRenderer = runtime.createRenderer;
    const registeredRuntime = Object.assign({}, runtime, {
      stages: stageDescription?.stages || runtime.stages || null,
      inspector,
      randomization,
      help,
      ownsAuthoredPalette: !!stageDescription?.stages.some(
        (stage) => stage.controlIds.includes("nacrePalette"),
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
    return Object.freeze(registeredRuntime);
  }

  function normalizeHelpDefinition(mode, definition) {
    const entries = Object.entries(definition?.sectionIntros || {});
    if (!entries.length) {
      throw new TypeError(`Mode ${mode.id} help requires section introductions.`);
    }
    const sectionIntros = {};
    entries.forEach(([sectionId, value]) => {
      const id = String(sectionId || "").trim();
      const text = String(value || "").trim();
      if (!id || !text) {
        throw new TypeError(`Mode ${mode.id} help has an empty section introduction.`);
      }
      sectionIntros[id] = text;
    });
    return Object.freeze({ sectionIntros: Object.freeze(sectionIntros) });
  }

  function normalizeRandomizationDefinition(mode, definition) {
    if (!Array.isArray(definition?.controls) || !definition.controls.length) {
      throw new TypeError(`Mode ${mode.id} randomization requires non-empty controls.`);
    }
    const seen = new Set();
    const controls = definition.controls.map((candidate) => {
      const controlId = String(candidate?.controlId || "").trim();
      const type = String(candidate?.type || "number");
      if (!controlId || !mode.activeControlIds.includes(controlId)) {
        throw new TypeError(
          `Mode ${mode.id} randomization references inactive control: ${controlId || "missing"}.`,
        );
      }
      if (seen.has(controlId)) {
        throw new TypeError(`Mode ${mode.id} randomization has duplicate control: ${controlId}.`);
      }
      seen.add(controlId);
      if (type === "choice") {
        if (!Array.isArray(candidate.values) || !candidate.values.length) {
          throw new TypeError(
            `Mode ${mode.id} randomization choice ${controlId} requires values.`,
          );
        }
        return Object.freeze({
          controlId,
          type,
          values: Object.freeze(candidate.values.map(String)),
        });
      }
      if (!['number', 'integer'].includes(type)) {
        throw new TypeError(
          `Mode ${mode.id} randomization control ${controlId} has invalid type: ${type}.`,
        );
      }
      const min = Number(candidate.min);
      const max = Number(candidate.max);
      const decimals = Number(candidate.decimals ?? (type === "integer" ? 0 : 2));
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
        throw new TypeError(
          `Mode ${mode.id} randomization control ${controlId} requires an increasing finite range.`,
        );
      }
      if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
        throw new TypeError(
          `Mode ${mode.id} randomization control ${controlId} has invalid decimals.`,
        );
      }
      return Object.freeze({ controlId, type, min, max, decimals });
    });
    return Object.freeze({ controls: Object.freeze(controls) });
  }

  function normalizeInspectorDefinition(mode, definition, stageDescription) {
    const rootId = String(definition?.rootId || "").trim();
    if (!rootId) throw new TypeError(`Mode ${mode.id} inspector requires a rootId.`);
    if (!Array.isArray(definition?.groups) || !definition.groups.length) {
      throw new TypeError(`Mode ${mode.id} inspector requires non-empty groups.`);
    }
    if (!stageDescription) {
      throw new TypeError(`Mode ${mode.id} inspector requires validated stages.`);
    }
    const stagesById = new Map(stageDescription.stages.map((stage) => [stage.id, stage]));
    const groupIds = new Set();
    const controlIds = new Set();
    const groups = definition.groups.map((candidate) => {
      const id = String(candidate?.id || "").trim();
      const label = String(candidate?.label || "").trim();
      if (!id || !label) {
        throw new TypeError(`Mode ${mode.id} inspector groups require id and label.`);
      }
      if (groupIds.has(id)) {
        throw new TypeError(`Mode ${mode.id} inspector has duplicate group: ${id}.`);
      }
      groupIds.add(id);
      const graphStageId = String(candidate.graphStageId || id);
      const stage = stagesById.get(graphStageId);
      if (!stage) {
        throw new TypeError(
          `Mode ${mode.id} inspector group ${id} references unknown stage: ${graphStageId}.`,
        );
      }
      if (!Array.isArray(candidate.controlIds) || !candidate.controlIds.length) {
        throw new TypeError(`Mode ${mode.id} inspector group ${id} requires controls.`);
      }
      const groupControlIds = candidate.controlIds.map(String);
      groupControlIds.forEach((controlId) => {
        if (controlIds.has(controlId)) {
          throw new TypeError(
            `Mode ${mode.id} inspector has duplicate control owner: ${controlId}.`,
          );
        }
        controlIds.add(controlId);
      });
      if (candidate.toggleable && !stage.optional) {
        throw new TypeError(
          `Mode ${mode.id} inspector group ${id} cannot toggle required stage ${graphStageId}.`,
        );
      }
      return Object.freeze({
        id,
        graphStageId,
        label,
        controlIds: Object.freeze(groupControlIds),
        includePaletteEditor: candidate.includePaletteEditor === true,
        toggleable: candidate.toggleable === true,
      });
    });
    const missingControls = mode.activeControlIds.filter((id) => !controlIds.has(id));
    const unknownControls = Array.from(controlIds).filter(
      (id) => !mode.activeControlIds.includes(id),
    );
    if (missingControls.length || unknownControls.length) {
      const details = [];
      if (missingControls.length) details.push(`missing controls: ${missingControls.join(", ")}`);
      if (unknownControls.length) details.push(`unknown controls: ${unknownControls.join(", ")}`);
      throw new TypeError(`Mode ${mode.id} inspector control ownership mismatch (${details.join("; ")}).`);
    }
    return Object.freeze({ rootId, groups: Object.freeze(groups) });
  }

  function registerRuntime(modeId, runtime) {
    const mode = modesById.get(modeId);
    if (!mode) {
      throw new Error(`Cannot register runtime for unknown mode: ${modeId}`);
    }
    const registeredRuntime = buildRegisteredRuntime(mode, runtime);
    runtimesById.set(modeId, registeredRuntime);
    return registeredRuntime;
  }

  function registerTextureModule(definition, runtime) {
    const mode = normalizeModeDefinition(definition);
    assertModeAvailable(mode);
    const registeredRuntime = buildRegisteredRuntime(mode, runtime);
    commitMode(mode);
    runtimesById.set(mode.id, registeredRuntime);
    return Object.freeze({
      mode: cloneMode(mode),
      runtime: registeredRuntime,
    });
  }

  function getRuntime(modeId) {
    return runtimesById.get(modeId) || null;
  }

  function getInspectorDefinition(modeId) {
    return runtimesById.get(modeId)?.inspector || null;
  }

  function getRandomizationDefinition(modeId) {
    return runtimesById.get(modeId)?.randomization || null;
  }

  function getHelpDefinition(modeId) {
    return runtimesById.get(modeId)?.help || null;
  }

  function cloneMode(mode) {
    return Object.assign({}, mode, {
      activeControlIds: Array.from(mode.activeControlIds || []),
    });
  }

  function listModes() {
    return MODE_DEFINITIONS
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(cloneMode);
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
    listModes().forEach((mode) => {
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
    listModes().forEach((mode) => {
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
    registerMode,
    registerRuntime,
    registerTextureModule,
    getRuntime,
    getInspectorDefinition,
    getRandomizationDefinition,
    getHelpDefinition,
    validateRegistry,
  });
})(window);
