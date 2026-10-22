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

  function runPixelRenderer(options) {
    const renderer = options.renderer;
    const config = renderer?.config;
    if (!renderer || typeof renderer.renderPixel !== "function" || !config) {
      throw new TypeError("Pixel renderer orchestration requires a renderer contract.");
    }
    const pixelLoopFactory =
      options.createPixelLoop || global.RadenPixelLoop?.createPixelLoop;
    if (typeof pixelLoopFactory !== "function") {
      throw new TypeError("Pixel renderer orchestration requires a pixel loop.");
    }
    if (typeof options.mapPoint !== "function") {
      throw new TypeError("Pixel renderer orchestration requires mapPoint().");
    }

    const parsedProgressStart = Number(options.progressStart);
    const parsedProgressSpan = Number(options.progressSpan);
    const progressStart = Number.isFinite(parsedProgressStart)
      ? parsedProgressStart
      : 0;
    const progressSpan = Number.isFinite(parsedProgressSpan)
      ? parsedProgressSpan
      : 100;
    const isCurrent =
      typeof options.isCurrent === "function" ? options.isCurrent : () => true;
    options.setStatus?.("rendering", config.preview ? "Preview..." : "Rendering...");
    options.onBusy?.(config);
    options.setProgress?.(progressStart);

    function startWork() {
      if (!isCurrent()) {
        options.clearTask?.();
        return;
      }
      options.offscreenCanvas.width = config.width;
      options.offscreenCanvas.height = config.height;
      const imageData = options.offscreenContext.createImageData(
        config.width,
        config.height,
      );
      const pixelLoop = pixelLoopFactory({
        width: config.width,
        height: config.height,
        rowsPerFrame: options.rowsPerFrame,
        buffer: imageData.data,
        isCurrent,
        setTask: options.setTask,
        clearTask: options.clearTask,
        requestFrame: options.requestFrame,
        onProgress: (percent) =>
          options.setProgress?.(progressStart + percent * (progressSpan / 100)),
        renderPixel: (x, y) => renderer.renderPixel(options.mapPoint(x, y)),
        onComplete: () => {
          options.setProgress?.(options.finalizeProgress ?? 100);
          finalizeCanvasRender({
            config,
            imageData,
            offscreenCanvas: options.offscreenCanvas,
            offscreenContext: options.offscreenContext,
            targetCanvas: options.targetCanvas,
            targetContext: options.targetContext,
            drawPasses: options.drawPasses,
            commit: options.commit,
            setStatus: options.setStatus,
            completeMessage: options.completeMessage,
            completeDelayMs: options.completeDelayMs,
            onReady: options.onReady,
            markApplied: options.markApplied,
            schedule: options.schedule,
          });
          options.onComplete?.(config);
          options.setProgress?.(100);
        },
      });
      pixelLoop.start();
    }

    options.setTask?.(startWork);
    options.requestFrame(startWork);
    return { startWork };
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
      runPixelRenderer,
      renderMode,
    },
  );
})(window);
