/* Raden control UI helpers (Architecture Phase C)
 * Exposed via window.RadenUiControls for compatibility with the static app shell.
 */
(function registerRadenUiControls(global) {
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
    document.querySelectorAll('#controls input[type="range"][id]').forEach((range) => {
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
      .querySelectorAll("#controls input, #controls select")
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
      .querySelectorAll("#controls input, #controls select")
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
  });
})(window);
