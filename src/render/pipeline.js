/* Raden render pipeline helpers (Architecture Phase E)
 * Exposed via window.RadenRenderPipeline for compatibility with the static app shell.
 */
(function registerRadenRenderPipeline(global) {
  function renderMode(modeId, options) {
    options = options || {};
    const runtime = options.getRuntime?.(modeId) || null;
    const registeredHandler = options.registeredHandlers?.[modeId];
    if (runtime && typeof registeredHandler === "function") {
      return registeredHandler(runtime, options.force, options.renderOptions);
    }
    return options.renderLegacy?.(
      modeId,
      options.force,
      options.renderOptions,
    );
  }

  function finalizeCanvasRender(options) {
    const config = options.config;
    const targetContext = options.targetContext;
    options.offscreenContext.putImageData(options.imageData, 0, 0);
    options.targetCanvas.width = config.width;
    options.targetCanvas.height = config.height;

    (options.drawPasses || []).forEach((pass) => {
      targetContext.globalAlpha = pass.alpha;
      targetContext.filter = pass.filter || "none";
      targetContext.drawImage(options.offscreenCanvas, 0, 0);
    });
    targetContext.globalAlpha = 1;
    targetContext.filter = "none";
    options.commit?.(config);

    if (config.preview) {
      options.setStatus?.("idle", options.previewMessage || "Preview ready");
      return;
    }

    options.setStatus?.("complete", options.completeMessage || "Complete");
    options.markApplied?.();
    const schedule = options.schedule || global.setTimeout;
    schedule(() => {
      options.setStatus?.("idle", options.idleMessage || "Idle");
      options.onReady?.();
    }, Number(options.completeDelayMs) || 500);
  }

  function createRenderPipeline() {
    let animationFrameId = null;
    let currentRunId = 0;
    let currentTask = null;

    function cancelFrame() {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }

    function nextRunId() {
      currentRunId += 1;
      return currentRunId;
    }

    function isCurrentRun(runId) {
      return runId === currentRunId;
    }

    function clearTask() {
      currentTask = null;
      animationFrameId = null;
    }

    function setTask(task) {
      currentTask = typeof task === "function" ? task : null;
      return currentTask;
    }

    function requestFrame(task) {
      setTask(task);
      animationFrameId = requestAnimationFrame(task);
      return animationFrameId;
    }

    function getState() {
      return {
        animationFrameId,
        currentRunId,
        hasTask: !!currentTask,
      };
    }

    return {
      cancelFrame,
      nextRunId,
      isCurrentRun,
      clearTask,
      setTask,
      requestFrame,
      getState,
    };
  }

  global.RadenRenderPipeline = Object.assign(
    {},
    global.RadenRenderPipeline || {},
    {
      createRenderPipeline,
      finalizeCanvasRender,
      renderMode,
    },
  );
})(window);
