/* Raden render pipeline helpers (Architecture Phase E)
 * Exposed via window.RadenRenderPipeline for compatibility with the static app shell.
 */
(function registerRadenRenderPipeline(global) {
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
    },
  );
})(window);
