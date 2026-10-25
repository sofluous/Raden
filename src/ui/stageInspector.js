/* Contextual procedural-stage inspector for generated source layers. */
(function registerRadenStageInspector(global) {
  function getInspectorDefinition(mode) {
    return global.RadenModes?.getInspectorDefinition?.(mode) || null;
  }

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
      const definition = getInspectorDefinition(mode);
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
      const definition = getInspectorDefinition(mode);
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
      if (getInspectorDefinition(mode)) {
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
    getInspectorDefinition,
    createStageInspector,
  });
})(window);
