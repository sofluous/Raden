/* Declarative procedural-stage contracts for node-ready texture pipelines. */
(function registerRadenStages(global) {
  const VALID_KINDS = new Set([
    "coordinates",
    "field",
    "geometry",
    "material",
    "surface",
    "composite",
  ]);
  const STAGE_INTERFACES = Object.freeze({
    materialSource: Object.freeze({
      id: "materialSource",
      label: "Material color source",
      allowedKinds: Object.freeze(["material"]),
      optional: false,
    }),
    colorTransform: Object.freeze({
      id: "colorTransform",
      label: "Color transform",
      allowedKinds: Object.freeze(["material", "surface", "composite"]),
      optional: true,
      bypassType: "identity-color",
    }),
  });

  function normalizeStringList(value) {
    return Array.from(new Set((Array.isArray(value) ? value : []).map(String)));
  }

  function normalizeStage(stage, index) {
    if (!stage || typeof stage !== "object") {
      throw new TypeError(`Stage ${index + 1} must be an object.`);
    }
    const id = String(stage.id || "").trim();
    if (!id) throw new TypeError(`Stage ${index + 1} requires an id.`);
    const kind = String(stage.kind || "").trim();
    if (!VALID_KINDS.has(kind)) {
      throw new TypeError(`Stage ${id} has unsupported kind: ${kind || "missing"}.`);
    }
    const outputs = normalizeStringList(stage.outputs);
    if (!outputs.length) throw new TypeError(`Stage ${id} requires at least one output.`);
    const interfaceId = stage.interfaceId ? String(stage.interfaceId) : null;
    const stageInterface = interfaceId ? STAGE_INTERFACES[interfaceId] : null;
    if (interfaceId && !stageInterface) {
      throw new TypeError(`Stage ${id} has unknown interface: ${interfaceId}.`);
    }
    if (stageInterface && !stageInterface.allowedKinds.includes(kind)) {
      throw new TypeError(`Stage ${id} kind ${kind} is incompatible with ${interfaceId}.`);
    }
    const optional = stage.optional === true;
    if (stageInterface && optional !== stageInterface.optional) {
      throw new TypeError(`Stage ${id} optional state is incompatible with ${interfaceId}.`);
    }
    const rawBypass = optional ? stage.bypass : null;
    const bypass = typeof rawBypass === "string"
      ? Object.freeze({ type: "custom", description: rawBypass.trim() })
      : rawBypass && typeof rawBypass === "object"
        ? Object.freeze({
            type: String(rawBypass.type || "").trim(),
            input: rawBypass.input ? String(rawBypass.input) : null,
            output: rawBypass.output ? String(rawBypass.output) : null,
            description: String(rawBypass.description || "").trim(),
          })
        : null;
    if (optional && !bypass) {
      throw new TypeError(`Optional stage ${id} requires a bypass description.`);
    }
    if (optional && !bypass.description) {
      throw new TypeError(`Optional stage ${id} requires a bypass description.`);
    }
    if (stageInterface?.bypassType && bypass?.type !== stageInterface.bypassType) {
      throw new TypeError(`Stage ${id} requires ${stageInterface.bypassType} bypass.`);
    }
    if (bypass?.type === "identity-color") {
      if (!normalizeStringList(stage.inputs).includes(bypass.input)) {
        throw new TypeError(`Stage ${id} identity bypass input is unavailable: ${bypass.input}.`);
      }
      if (!outputs.includes(bypass.output)) {
        throw new TypeError(`Stage ${id} identity bypass output is unavailable: ${bypass.output}.`);
      }
    }
    return Object.freeze({
      id,
      label: String(stage.label || id),
      kind,
      inputs: Object.freeze(normalizeStringList(stage.inputs)),
      outputs: Object.freeze(outputs),
      controlIds: Object.freeze(normalizeStringList(stage.controlIds)),
      interfaceId,
      optional,
      bypass,
    });
  }

  function createStagePipeline(definition) {
    const modeId = String(definition?.modeId || "").trim();
    if (!modeId) throw new TypeError("Stage pipeline requires a modeId.");
    if (typeof definition.execute !== "function") {
      throw new TypeError(`Stage pipeline ${modeId} requires execute().`);
    }
    const stages = (definition.stages || []).map(normalizeStage);
    if (!stages.length) throw new TypeError(`Stage pipeline ${modeId} has no stages.`);
    const ids = new Set();
    const externalInputs = normalizeStringList(definition.externalInputs);
    const availableValues = new Set(externalInputs);
    stages.forEach((stage) => {
      if (ids.has(stage.id)) throw new TypeError(`Duplicate stage id: ${stage.id}.`);
      ids.add(stage.id);
      const missingInputs = stage.inputs.filter((input) => !availableValues.has(input));
      if (missingInputs.length) {
        throw new TypeError(
          `Stage ${stage.id} has unavailable inputs: ${missingInputs.join(", ")}.`,
        );
      }
      stage.outputs.forEach((output) => availableValues.add(output));
    });
    const requestedDisabledIds = normalizeStringList(definition.disabledStageIds);
    const stagesById = new Map(stages.map((stage) => [stage.id, stage]));
    requestedDisabledIds.forEach((id) => {
      const stage = stagesById.get(id);
      if (!stage) throw new TypeError(`Cannot disable unknown stage: ${id}.`);
      if (!stage.optional) throw new TypeError(`Cannot disable required stage: ${id}.`);
    });
    const disabledStageIds = Object.freeze(requestedDisabledIds);
    const disabledSet = new Set(disabledStageIds);
    const stageState = Object.freeze({
      disabledStageIds,
      isEnabled: (id) => !disabledSet.has(id),
    });
    const description = Object.freeze({
      version: 1,
      modeId,
      externalInputs: Object.freeze(externalInputs),
      stages: Object.freeze(stages),
    });
    return Object.freeze({
      modeId,
      run: (input) => definition.execute(input, stageState),
      inspect: typeof definition.inspect === "function"
        ? (input) => definition.inspect(input, stageState)
        : null,
      supportsDiagnostics: typeof definition.inspect === "function",
      disabledStageIds,
      isStageEnabled: stageState.isEnabled,
      describe: () => description,
    });
  }

  function createPixelStageRenderer(options) {
    const definition = options || {};
    if (typeof definition.execute !== "function") {
      throw new TypeError("Pixel stage renderer requires execute().");
    }
    const pipeline = createStagePipeline({
      modeId: definition.modeId,
      stages: definition.stages,
      externalInputs: definition.externalInputs || ["point", "runtime"],
      disabledStageIds: definition.runtime?.disabledStageIds,
      execute: (point, stageState) => definition.execute(point, stageState, false),
      inspect: (point, stageState) => definition.execute(point, stageState, true),
    });
    return Object.freeze({
      config: definition.config,
      renderPixel: pipeline.run,
      inspectPixel: pipeline.inspect,
      describeStages: pipeline.describe,
    });
  }

  function applyOptionalColorTransform(stageState, stageId, transform, color) {
    if (!stageState.isEnabled(stageId)) return color;
    return typeof transform === "function" ? transform(color) : color;
  }

  global.RadenStages = Object.assign({}, global.RadenStages || {}, {
    createStagePipeline,
    createPixelStageRenderer,
    applyOptionalColorTransform,
    getInterface: (id) => STAGE_INTERFACES[id] || null,
    listInterfaces: () => Object.values(STAGE_INTERFACES),
  });
})(window);
