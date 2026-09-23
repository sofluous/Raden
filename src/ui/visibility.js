/* Raden UI visibility helpers (Architecture Phase C)
 * Exposed via window.RadenUiVisibility for compatibility with the static app shell.
 */
(function registerRadenUiVisibility(global) {
  function getRowControlIds(row) {
    return Array.from(
      row.querySelectorAll("input[id], select[id], textarea[id]"),
    )
      .map((el) => el.id)
      .filter(Boolean);
  }

  function createVisibilityController(opts) {
    const options = opts || {};
    const activeControlMap = options.activeControlMap || {};
    const modeScopedControlIds = options.modeScopedControlIds || new Set();
    const uiOnlyControlIds = options.uiOnlyControlIds || [];
    const naturalSharedControlVisibility =
      options.naturalSharedControlVisibility || {};
    const applyModeControlAttributeOverrides =
      typeof options.applyModeControlAttributeOverrides === "function"
        ? options.applyModeControlAttributeOverrides
        : () => {};
    const updateRisoEngineVisibility =
      typeof options.updateRisoEngineVisibility === "function"
        ? options.updateRisoEngineVisibility
        : () => {};

    function getActiveControls(mode) {
      return activeControlMap[mode] || null;
    }

    function updateNaturalSharedControlVisibility(mode) {
      const allowedControls = naturalSharedControlVisibility[mode] || null;
      document
        .querySelectorAll("#naturalGeometrySection .control-row[data-control-id]")
        .forEach((row) => {
          const controlId = row.dataset.controlId;
          if (!allowedControls || !controlId) return;
          row.hidden = !allowedControls.has(controlId);
        });
    }

    function applyStrictModeControlVisibility(mode) {
      const activeControls = getActiveControls(mode);
      if (!activeControls) return;
      document.querySelectorAll("#controls .control-row").forEach((row) => {
        if (row.hidden) return;
        const parentSection = row.closest(".section");
        const isScopedRow =
          !!row.dataset.mode ||
          !!row.dataset.family ||
          !!row.dataset.controlId ||
          !!parentSection?.dataset.mode ||
          !!parentSection?.dataset.family;
        if (!isScopedRow) return;
        const rowControlIds = getRowControlIds(row).filter(
          (id) => !uiOnlyControlIds.includes(id) && modeScopedControlIds.has(id),
        );
        if (!rowControlIds.length) return;
        row.hidden = rowControlIds.every((id) => !activeControls.has(id));
      });
    }

    function enforceNaturalModeControlVisibility(mode) {
      const activeControls = getActiveControls(mode);
      if (!activeControls) return;
      ["naturalGeometrySection", "naturalColorSection", "naturalDetailSection"].forEach(
        (sectionId) => {
          document
            .querySelectorAll(`#${sectionId} .control-row`)
            .forEach((row) => {
              const explicitModes = row.dataset.mode
                ? row.dataset.mode.split(",").map((s) => s.trim())
                : null;
              const rowControlIds = getRowControlIds(row).filter((id) =>
                modeScopedControlIds.has(id),
              );
              if (explicitModes) {
                const modeMatch = explicitModes.includes(mode);
                if (!modeMatch) {
                  row.hidden = true;
                  return;
                }
                if (!rowControlIds.length) {
                  row.hidden = false;
                  return;
                }
                row.hidden = rowControlIds.every((id) => !activeControls.has(id));
                return;
              }
              const controlId = row.dataset.controlId;
              if (controlId) {
                row.hidden = !activeControls.has(controlId);
                return;
              }
              if (!rowControlIds.length) return;
              row.hidden = rowControlIds.every((id) => !activeControls.has(id));
            });
        },
      );
    }

    function isControlRelevantForMode(mode, controlId) {
      const activeControls = getActiveControls(mode);
      if (!activeControls) return true;
      if (!modeScopedControlIds.has(controlId)) return true;
      return activeControls.has(controlId);
    }

    function updateVisibleSections(mode) {
      const textureFamily =
        document.getElementById("textureFamily")?.value || "classic";
      document.querySelectorAll("#controls .section").forEach((section) => {
        const modes = section.dataset.mode
          ? section.dataset.mode.split(",").map((s) => s.trim())
          : ["all"];
        const familyMatch =
          !section.dataset.family ||
          mode !== "motherofpearl" ||
          section.dataset.family === textureFamily;
        const shouldShow =
          (modes.includes("all") || modes.includes(mode)) && familyMatch;
        section.hidden = !shouldShow;
      });

      document.querySelectorAll("#controls .control-row").forEach((row) => {
        const parentSection = row.closest(".section");
        const effectiveModeSource =
          row.dataset.mode || parentSection?.dataset.mode || "all";
        const modes = effectiveModeSource.split(",").map((s) => s.trim());
        const effectiveFamily =
          row.dataset.family || parentSection?.dataset.family || "";
        const familyMatch =
          !effectiveFamily ||
          mode !== "motherofpearl" ||
          effectiveFamily === textureFamily;
        const shouldShow =
          (modes.includes("all") || modes.includes(mode)) && familyMatch;
        row.hidden = !shouldShow;
      });

      applyModeControlAttributeOverrides(mode);
      updateNaturalSharedControlVisibility(mode);
      applyStrictModeControlVisibility(mode);
      enforceNaturalModeControlVisibility(mode);
      updateRisoEngineVisibility();
    }

    return {
      updateVisibleSections,
      isControlRelevantForMode,
    };
  }

  global.RadenUiVisibility = Object.assign({}, global.RadenUiVisibility || {}, {
    createVisibilityController,
    getRowControlIds,
  });
})(window);
