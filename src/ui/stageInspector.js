/* Contextual procedural-stage inspector for generated source layers. */
(function registerRadenStageInspector(global) {
  const MOTHER_OF_PEARL_GROUPS = Object.freeze([
    { id: "palette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
    { id: "iridescence", graphStageId: "palette", label: "Iridescence", controlIds: ["range", "blend", "intensity", "nacreBrilliance", "nacreChromatic"] },
    { id: "family", label: "Texture Family", controlIds: ["textureFamily"] },
    { id: "noise", label: "Base Structure", controlIds: ["scale", "layers"] },
    { id: "growth", label: "Shape and Flow", controlIds: ["flowMode", "layerLength", "ringSpacing", "ringJitter", "seamThickness"] },
    { id: "substrate", label: "Material Mapping", controlIds: ["substrateTone", "substrateMix"], toggleable: true },
    { id: "surface", label: "Surface Detail", controlIds: ["seamContrast", "scratchDensity", "scratchAngle", "surfacePolish"], toggleable: true },
    { id: "direction", graphStageId: "sampling", label: "Directional Modulation", controlIds: ["lightAngle", "lightCurvature", "lightSpread", "highlightStrength"] },
  ]);
  const BUBBLE_FILM_GROUPS = Object.freeze([
    { id: "palette", graphStageId: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
    { id: "base", graphStageId: "pressureWarp", label: "Base Structure", controlIds: ["naturalScale"] },
    { id: "flow", graphStageId: "pressureWarp", label: "Shape and Flow", controlIds: ["naturalWarp", "naturalTurbulence"] },
  ]);
  const OPAL_VEIN_GROUPS = Object.freeze([
    { id: "palette", graphStageId: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
    { id: "base", graphStageId: "cellField", label: "Base Structure", controlIds: ["opalCellScale"] },
    { id: "flow", graphStageId: "cellField", label: "Shape and Flow", controlIds: ["opalVeinDensity"] },
    { id: "material", graphStageId: "fire", label: "Material Response", controlIds: ["opalFire"] },
    { id: "mapping", graphStageId: "matrix", label: "Material Mapping", controlIds: ["opalMatrix"] },
  ]);
  const LABRADORITE_GROUPS = Object.freeze([
    { id: "palette", graphStageId: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
    { id: "base", graphStageId: "stoneField", label: "Base Structure", controlIds: ["labradoriteScale"] },
    { id: "flow", graphStageId: "directionalBands", label: "Shape and Flow", controlIds: ["labradoriteDirection", "labradoriteBanding"] },
    { id: "material", graphStageId: "flash", label: "Material Response", controlIds: ["labradoriteFlash"] },
    { id: "mapping", graphStageId: "matrix", label: "Material Mapping", controlIds: ["labradoriteDarkness"] },
  ]);
  const MARBLE_INK_GROUPS = Object.freeze([
    { id: "palette", graphStageId: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
    { id: "base", graphStageId: "flowField", label: "Base Structure", controlIds: ["marbleFlowScale"] },
    { id: "flow", graphStageId: "flowField", label: "Shape and Flow", controlIds: ["marbleInkDrift"] },
    { id: "veins", label: "Vein Structure", controlIds: ["marbleVeinFreq", "marbleContrast"] },
    { id: "material", graphStageId: "stone", label: "Material Response", controlIds: ["marbleLightness"] },
  ]);
  const AGATE_BANDS_GROUPS = Object.freeze([
    { id: "palette", graphStageId: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
    { id: "base", graphStageId: "stoneField", label: "Base Structure", controlIds: ["naturalScale", "naturalWarp"] },
    { id: "flow", graphStageId: "bands", label: "Shape and Flow", controlIds: ["agateBandFreq", "agateBandJitter"] },
    { id: "veins", label: "Vein Structure", controlIds: ["agateVeinDensity", "agateEdgeDarken"] },
    { id: "material", graphStageId: "stone", label: "Material Response", controlIds: ["agateTranslucency"] },
  ]);
  const MALACHITE_FLOW_GROUPS = Object.freeze([
    { id: "palette", graphStageId: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
    { id: "base", graphStageId: "stoneField", label: "Base Structure", controlIds: ["naturalScale"] },
    { id: "flow", graphStageId: "stoneField", label: "Shape and Flow", controlIds: ["naturalWarp", "naturalTurbulence", "naturalAnisotropy"] },
    { id: "rings", label: "Ring Structure", controlIds: ["malachiteSwirl", "malachiteRingTightness", "malachiteRingVariance"] },
    { id: "material", graphStageId: "stone", label: "Material Response", controlIds: ["malachiteContrast"] },
  ]);
  const LICHEN_GROWTH_GROUPS = Object.freeze([
    { id: "palette", graphStageId: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
    { id: "base", graphStageId: "colonyField", label: "Base Structure", controlIds: ["naturalScale", "lichenPatchScale"] },
    { id: "flow", graphStageId: "colonyField", label: "Shape and Flow", controlIds: ["naturalWarp"] },
    { id: "growth", label: "Growth Structure", controlIds: ["lichenBranching", "lichenCoverage"] },
    { id: "edges", label: "Surface Detail", controlIds: ["lichenEdgeRoughness"] },
    { id: "material", graphStageId: "moisture", label: "Material Response", controlIds: ["lichenMoistureTone"] },
  ]);
  const RIVER_DELTA_GROUPS = Object.freeze([
    { id: "palette", graphStageId: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
    { id: "base", graphStageId: "flowField", label: "Base Structure", controlIds: ["naturalScale"] },
    { id: "flow", graphStageId: "flowField", label: "Shape and Flow", controlIds: ["naturalWarp", "naturalTurbulence", "naturalAnisotropy"] },
    { id: "channels", label: "Channel Structure", controlIds: ["deltaChannelWidth", "deltaBranchRate"] },
    { id: "material", graphStageId: "floodplain", label: "Material Response", controlIds: ["deltaSedimentMix", "deltaFloodplainSoftness"] },
    { id: "erosion", label: "Surface Detail", controlIds: ["deltaErosion"] },
  ]);
  const TOPOGRAPHY_GROUPS = Object.freeze([
    { id: "palette", graphStageId: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"], includePaletteEditor: true },
    { id: "base", graphStageId: "terrain", label: "Base Structure", controlIds: ["topoPreset", "topoNoiseType", "scale", "layers"] },
    { id: "flow", graphStageId: "terrain", label: "Shape and Flow", controlIds: ["topoRidge", "topoWarp"] },
    { id: "erosion", label: "Terrain Refinement", controlIds: ["topoErosion"] },
    { id: "contours", label: "Contour Mapping", controlIds: ["topoBandCount", "topoRenderMode"] },
  ]);
  const INSPECTOR_DEFINITIONS = Object.freeze({
    motherofpearl: Object.freeze({
      rootId: "motherOfPearlStageInspector",
      groups: MOTHER_OF_PEARL_GROUPS,
    }),
    bubblefilm: Object.freeze({
      rootId: "bubbleFilmStageInspector",
      groups: BUBBLE_FILM_GROUPS,
    }),
    opalvein: Object.freeze({
      rootId: "opalVeinStageInspector",
      groups: OPAL_VEIN_GROUPS,
    }),
    labradorite: Object.freeze({
      rootId: "labradoriteStageInspector",
      groups: LABRADORITE_GROUPS,
    }),
    marbleink: Object.freeze({
      rootId: "marbleInkStageInspector",
      groups: MARBLE_INK_GROUPS,
    }),
    agateband: Object.freeze({
      rootId: "agateBandsStageInspector",
      groups: AGATE_BANDS_GROUPS,
    }),
    malachiteflow: Object.freeze({
      rootId: "malachiteFlowStageInspector",
      groups: MALACHITE_FLOW_GROUPS,
    }),
    lichengrowth: Object.freeze({
      rootId: "lichenGrowthStageInspector",
      groups: LICHEN_GROWTH_GROUPS,
    }),
    riverdelta: Object.freeze({
      rootId: "riverDeltaStageInspector",
      groups: RIVER_DELTA_GROUPS,
    }),
    topography: Object.freeze({
      rootId: "topographyStageInspector",
      groups: TOPOGRAPHY_GROUPS,
    }),
  });

  function createStageInspector(options) {
    const opts = options || {};
    const origins = new Map();
    const controlStageIds = new Map();
    const sourceSections = new Set();
    const roots = new Map();
    let mountedMode = null;

    function rememberOrigin(element) {
      if (!element || origins.has(element)) return;
      origins.set(element, { parent: element.parentNode, nextSibling: element.nextSibling });
      const section = element.closest?.(".section");
      if (section) sourceSections.add(section);
    }

    function createToggle(group) {
      const label = document.createElement("label");
      label.className = "stage-enable-control";
      label.title = `Disable ${group.label}`;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = true;
      input.className = "stage-enable-toggle";
      input.dataset.stageId = group.id;
      input.setAttribute("aria-label", `Enable ${group.label}`);
      input.addEventListener("change", () => {
        try {
          opts.onSetStageEnabled?.(group.id, input.checked);
          sync();
        } catch (error) {
          input.checked = !input.checked;
          opts.onError?.(error);
        }
      });
      label.appendChild(input);
      return label;
    }

    function ensureRoot(mode) {
      if (roots.has(mode)) return roots.get(mode);
      const definition = INSPECTOR_DEFINITIONS[mode];
      if (!definition) return null;
      const tab = document.getElementById("tabGenerate");
      if (!tab) return null;
      const root = document.createElement("div");
      root.id = definition.rootId;
      root.className = "stage-inspector";
      root.dataset.mode = mode;
      root.hidden = true;
      definition.groups.forEach((group) => {
        const section = document.createElement("section");
        section.className = "section stage-inspector-section";
        section.dataset.stageId = group.id;
        section.dataset.graphStageId = group.graphStageId || group.id;
        section.dataset.sectionId = `${mode}-stage-${group.id}`;
        const heading = document.createElement("h3");
        heading.textContent = group.label;
        section.appendChild(heading);
        if (group.toggleable) section.appendChild(createToggle(group));
        root.appendChild(section);
      });
      const seedSection = document.getElementById("seed")?.closest(".section");
      if (seedSection?.parentNode) seedSection.parentNode.insertBefore(root, seedSection.nextSibling);
      else tab.prepend(root);
      roots.set(mode, root);
      return root;
    }

    function moveControlsIntoInspector(mode) {
      const definition = INSPECTOR_DEFINITIONS[mode];
      const inspector = ensureRoot(mode);
      if (!inspector) return;
      definition.groups.forEach((group) => {
        const section = inspector.querySelector(`[data-stage-id="${group.id}"]`);
        group.controlIds.forEach((controlId) => {
          const row = document.getElementById(controlId)?.closest(".control-row");
          if (!row) return;
          rememberOrigin(row);
          controlStageIds.set(controlId, group.graphStageId || group.id);
          section.appendChild(row);
        });
        if (group.includePaletteEditor) {
          const editor = document.getElementById("nacrePaletteEditor");
          if (editor) {
            rememberOrigin(editor);
            section.appendChild(editor);
          }
        }
      });
      sourceSections.forEach((section) => {
        const hasVisibleContent = Array.from(
          section.querySelectorAll(":scope > .control-row, :scope > .palette-authoring"),
        ).some((element) => !element.hidden);
        if (!hasVisibleContent) {
          section.dataset.stageInspectorEmpty = "true";
          section.hidden = true;
        }
      });
      inspector.hidden = false;
      mountedMode = mode;
    }

    function restoreControls() {
      Array.from(origins.entries()).reverse().forEach(([element, origin]) => {
        if (!origin.parent) return;
        if (origin.nextSibling?.parentNode === origin.parent) origin.parent.insertBefore(element, origin.nextSibling);
        else origin.parent.appendChild(element);
      });
      sourceSections.forEach((section) => delete section.dataset.stageInspectorEmpty);
      if (mountedMode) roots.get(mountedMode).hidden = true;
      controlStageIds.clear();
      mountedMode = null;
    }

    function getGraph() {
      const layer = global.RadenLayers?.getActiveLayer?.(opts.getLayerState?.());
      return layer?.modeId === mountedMode ? layer.graph : null;
    }

    function setGroupEnabled(section, enabled) {
      section.classList.toggle("is-stage-disabled", !enabled);
      section.querySelectorAll(".control-row input, .control-row select").forEach((control) => {
        if (!control.dataset.stageInspectorDisabled) {
          control.dataset.stageInspectorDisabled = control.disabled ? "true" : "false";
        }
        control.disabled = !enabled || control.dataset.stageInspectorDisabled === "true";
      });
      section.querySelectorAll(".control-row button").forEach((button) => {
        if (!button.dataset.stageInspectorDisabled) {
          button.dataset.stageInspectorDisabled = button.disabled ? "true" : "false";
        }
        button.disabled = !enabled || button.dataset.stageInspectorDisabled === "true";
      });
      const toggle = section.querySelector(".stage-enable-toggle");
      if (!toggle) return;
      toggle.checked = enabled;
      toggle.setAttribute("aria-checked", String(enabled));
      toggle.parentElement.title = `${enabled ? "Disable" : "Enable"} ${section.querySelector("h3")?.textContent || "stage"}`;
    }

    function sync() {
      const root = roots.get(mountedMode);
      if (!mountedMode || !root) return;
      const graph = getGraph();
      root.querySelectorAll(".stage-inspector-section").forEach((section) => {
        const node = graph?.nodes?.find(
          (candidate) => candidate.id === section.dataset.graphStageId,
        );
        setGroupEnabled(section, node?.enabled !== false);
      });
    }

    function update(mode) {
      if (mountedMode && mountedMode !== mode) restoreControls();
      if (INSPECTOR_DEFINITIONS[mode]) {
        moveControlsIntoInspector(mode);
        enhance();
        sync();
      } else if (mountedMode) {
        restoreControls();
      }
    }

    function enhance() {
      const root = roots.get(mountedMode);
      root?.querySelectorAll(".stage-inspector-section").forEach((section) => {
        const toggle = section.querySelector(":scope > .stage-enable-control");
        const actions = section.querySelector(".section-heading-actions");
        if (toggle && actions) actions.prepend(toggle);
      });
      sync();
    }

    function isControlEnabled(controlId) {
      if (!mountedMode) return true;
      const stageId = controlStageIds.get(controlId);
      if (!stageId) return true;
      return getGraph()?.nodes?.find((node) => node.id === stageId)?.enabled !== false;
    }

    return Object.freeze({ update, sync, enhance, isControlEnabled });
  }

  global.RadenStageInspector = Object.assign({}, global.RadenStageInspector || {}, {
    MOTHER_OF_PEARL_GROUPS,
    BUBBLE_FILM_GROUPS,
    OPAL_VEIN_GROUPS,
    LABRADORITE_GROUPS,
    MARBLE_INK_GROUPS,
    AGATE_BANDS_GROUPS,
    MALACHITE_FLOW_GROUPS,
    LICHEN_GROWTH_GROUPS,
    RIVER_DELTA_GROUPS,
    TOPOGRAPHY_GROUPS,
    INSPECTOR_DEFINITIONS,
    createStageInspector,
  });
})(window);
