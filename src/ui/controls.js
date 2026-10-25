/* Raden control UI helpers (Architecture Phase C)
 * Exposed via window.RadenUiControls for compatibility with the static app shell.
 */
(function registerRadenUiControls(global) {
  const CONTROL_SELECTOR =
    "#controls input, #controls select, #canvasControlOverlay input, #canvasControlOverlay select";
  const RANGE_SELECTOR =
    '#controls input[type="range"][id], #canvasControlOverlay input[type="range"][id]';

  function formatRangeReadout(range) {
    const raw = Number(range.value);
    if (!Number.isFinite(raw)) return range.value || "";
    const stepRaw = range.getAttribute("step");
    if (!stepRaw || stepRaw === "any") return String(raw);
    const step = Number(stepRaw);
    if (!Number.isFinite(step) || step <= 0) return String(raw);
    const decimals = Math.min(
      4,
      Math.max(0, (String(stepRaw).split(".")[1] || "").length),
    );
    return raw.toFixed(decimals);
  }

  function updateRangeReadout(range) {
    if (!range || range.type !== "range") return;
    const readout = document.getElementById(`${range.id}Readout`);
    if (!readout) return;
    readout.value = formatRangeReadout(range);
    readout.textContent = readout.value;
  }

  function syncRangeReadouts(scope) {
    const root = scope || document;
    root.querySelectorAll?.('input[type="range"][id]').forEach(updateRangeReadout);
  }

  function enhanceRangeReadouts() {
    document.querySelectorAll(RANGE_SELECTOR).forEach((range) => {
      const inputWrap = range.closest(".control-input");
      if (!inputWrap || inputWrap.querySelector(`#${range.id}Readout`)) {
        updateRangeReadout(range);
        return;
      }
      inputWrap.classList.add("has-range-readout");
      const readout = document.createElement("output");
      readout.id = `${range.id}Readout`;
      readout.className = "range-readout";
      readout.setAttribute("for", range.id);
      readout.setAttribute("aria-label", `${range.id} value`);
      inputWrap.appendChild(readout);
      range.addEventListener("input", () => updateRangeReadout(range));
      updateRangeReadout(range);
    });
  }

  function markControlPending(el) {
    if (!el) return;
    updateRangeReadout(el);
    el.classList.add("pending-change");
    const controlRow = el.closest(".control-row");
    if (!controlRow) return;
    const label = controlRow.querySelector(".control-label");
    if (label) label.classList.add("pending-dot");
  }

  function getPendingCount() {
    return document.querySelectorAll(".pending-change").length;
  }

  function updatePendingStatus(opts) {
    const options = opts || {};
    const statusEl = options.statusEl || null;
    const setStatus =
      typeof options.setStatus === "function" ? options.setStatus : null;
    const pendingCount = getPendingCount();

    if (!statusEl || !setStatus || statusEl.dataset.state !== "idle") {
      return pendingCount;
    }
    if (pendingCount > 0) {
      setStatus(
        "idle",
        `Idle: ${pendingCount} change${pendingCount > 1 ? "s" : ""} not applied`,
      );
    } else {
      setStatus("idle", "Idle");
    }
    return pendingCount;
  }

  function clearPendingIndicators(opts) {
    const options = opts || {};
    document
      .querySelectorAll(CONTROL_SELECTOR)
      .forEach((el) => {
        el.classList.remove("pending-change");
        if (el.dataset.live !== "true") {
          el.dataset.applied =
            el.type === "checkbox" ? String(el.checked) : el.value;
        }

        const controlRow = el.closest(".control-row");
        if (controlRow) {
          const label = controlRow.querySelector(".control-label");
          if (label) label.classList.remove("pending-dot");
        }
      });
    return updatePendingStatus(options);
  }

  function getControlState() {
    const state = {};
    document
      .querySelectorAll(CONTROL_SELECTOR)
      .forEach((el) => {
        if (!el.id) return;
        if (el.type === "file") return;
        state[el.id] = el.type === "checkbox" ? el.checked : el.value;
      });
    return state;
  }

  function applyControlState(state, opts) {
    const options = opts || {};
    Object.entries(state || {}).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === "file") return;
      if (el.type === "checkbox") {
        el.checked = !!value;
      } else {
        el.value = String(value);
      }
      updateRangeReadout(el);
    });

    if (typeof options.afterApply === "function") {
      options.afterApply();
    }
    syncRangeReadouts();
  }

  function mountControlRowInSectionHeader(controlId, className) {
    const control = document.getElementById(controlId);
    const row = control?.closest(".control-row");
    const section = row?.closest(".section");
    const actions = section?.querySelector(".section-heading-actions");
    if (!row || !actions) return false;
    row.classList.add("section-header-control-row");
    if (className) row.classList.add(className);
    actions.prepend(row);
    const hasBodyContent = !!section.querySelector(
      ":scope > .control-row, :scope > .palette-authoring",
    );
    section.classList.toggle("is-header-only", !hasBodyContent);
    return true;
  }

  function getModeOptionModels(modes) {
    return Array.from(modes || []).map((mode) => ({
      value: String(mode.id),
      label: mode.status === "deferred"
        ? `${mode.label} (Deferred)`
        : String(mode.label),
    }));
  }

  function syncModeSelector(select, modes, preferredModeId) {
    if (!select) return null;
    const currentValue = select.value;
    const options = getModeOptionModels(modes);
    const optionElements = options.map((item) => {
      const option = select.ownerDocument.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      return option;
    });
    select.replaceChildren(...optionElements);
    const available = new Set(options.map((item) => item.value));
    const candidates = [currentValue, preferredModeId, options[0]?.value];
    const nextValue = candidates.find((value) => value && available.has(value)) || "";
    select.value = nextValue;
    return nextValue;
  }

  function createRandomizedControlValues(definition, random) {
    const nextRandom = typeof random === "function" ? random : Math.random;
    return Array.from(definition?.controls || [], (rule) => {
      const unit = Math.max(0, Math.min(0.9999999999999999, Number(nextRandom())));
      if (rule.type === "choice") {
        return {
          controlId: rule.controlId,
          value: rule.values[Math.floor(unit * rule.values.length)],
        };
      }
      const raw = rule.min + unit * (rule.max - rule.min);
      return {
        controlId: rule.controlId,
        value: rule.type === "integer" ? Math.floor(raw) : raw,
        decimals: rule.decimals,
      };
    });
  }

  global.RadenUiControls = Object.assign({}, global.RadenUiControls || {}, {
    formatRangeReadout,
    updateRangeReadout,
    syncRangeReadouts,
    enhanceRangeReadouts,
    markControlPending,
    getPendingCount,
    updatePendingStatus,
    clearPendingIndicators,
    getControlState,
    applyControlState,
    mountControlRowInSectionHeader,
    getModeOptionModels,
    syncModeSelector,
    createRandomizedControlValues,
  });
})(window);
