/* Raden preview/final scheduler (M1 Batch 4 extraction)
 * Exposed via window.RadenCoreScheduler with createScheduler.
 */
(function registerRadenCoreScheduler(global) {
  function createScheduler(opts) {
    const options = opts || {};
    const heavyControlIds = new Set(options.heavyControlIds || []);
    const uiOnlyControlIds = new Set(options.uiOnlyControlIds || []);
    const getPerformanceProfile =
      typeof options.getPerformanceProfile === "function"
        ? options.getPerformanceProfile
        : () => ({ previewDebounceMs: 60, finalDebounceMs: 110 });
    const startGeneration =
      typeof options.startGeneration === "function"
        ? options.startGeneration
        : () => {};

    let previewDebounceId = null;
    let finalDebounceId = null;

    function isHeavyControl(el) {
      return !!el && heavyControlIds.has(el.id);
    }

    function isUiOnlyControl(el) {
      return !!el && uiOnlyControlIds.has(el.id);
    }

    function schedulePreviewRender(triggerEl) {
      if (!triggerEl || isHeavyControl(triggerEl)) return;
      const perf = getPerformanceProfile() || {};
      if (finalDebounceId) {
        clearTimeout(finalDebounceId);
        finalDebounceId = null;
      }
      if (previewDebounceId) {
        clearTimeout(previewDebounceId);
      }
      previewDebounceId = setTimeout(() => {
        startGeneration(true, { preview: true });
      }, Number(perf.previewDebounceMs) || 60);
    }

    function scheduleFinalRender() {
      const perf = getPerformanceProfile() || {};
      if (previewDebounceId) {
        clearTimeout(previewDebounceId);
        previewDebounceId = null;
      }
      if (finalDebounceId) {
        clearTimeout(finalDebounceId);
      }
      finalDebounceId = setTimeout(() => {
        startGeneration(true, { preview: false });
      }, Number(perf.finalDebounceMs) || 110);
    }

    return {
      isHeavyControl,
      isUiOnlyControl,
      schedulePreviewRender,
      scheduleFinalRender,
    };
  }

  global.RadenCoreScheduler = Object.assign({}, global.RadenCoreScheduler || {}, {
    createScheduler,
  });
})(window);
