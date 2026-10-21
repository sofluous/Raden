/* Reusable chunked CPU pixel rendering.
 * Scheduling is injected so the loop stays independent of the app shell.
 */
(function registerRadenPixelLoop(global) {
  function clampByte(value) {
    return Math.max(0, Math.min(255, Number(value) || 0));
  }

  function writeRgb(buffer, index, color) {
    buffer[index] = clampByte(color.r);
    buffer[index + 1] = clampByte(color.g);
    buffer[index + 2] = clampByte(color.b);
    buffer[index + 3] = 255;
  }

  function createPixelLoop(options) {
    const width = Math.max(1, Math.floor(options.width));
    const height = Math.max(1, Math.floor(options.height));
    const rowsPerFrame = Math.max(1, Math.floor(options.rowsPerFrame));
    const buffer = options.buffer;
    if (!buffer || buffer.length < width * height * 4) {
      throw new RangeError("Pixel loop requires a complete RGBA buffer.");
    }
    if (typeof options.renderPixel !== "function") {
      throw new TypeError("Pixel loop requires renderPixel().");
    }
    if (typeof options.requestFrame !== "function") {
      throw new TypeError("Pixel loop requires requestFrame().");
    }

    const isCurrent =
      typeof options.isCurrent === "function" ? options.isCurrent : () => true;
    const clearTask =
      typeof options.clearTask === "function" ? options.clearTask : () => {};
    const setTask =
      typeof options.setTask === "function" ? options.setTask : () => {};
    const onProgress =
      typeof options.onProgress === "function" ? options.onProgress : () => {};
    const onComplete =
      typeof options.onComplete === "function" ? options.onComplete : () => {};
    let row = 0;
    let finished = false;

    function stop() {
      if (finished) return;
      finished = true;
      clearTask();
    }

    function step() {
      if (finished || !isCurrent()) {
        stop();
        return;
      }
      const endRow = Math.min(row + rowsPerFrame, height);
      for (; row < endRow; row++) {
        for (let x = 0; x < width; x++) {
          const index = (row * width + x) * 4;
          writeRgb(buffer, index, options.renderPixel(x, row, index));
        }
      }
      if (!isCurrent()) {
        stop();
        return;
      }
      onProgress((row / height) * 100, row, height);
      if (row < height) {
        options.requestFrame(step);
        return;
      }
      finished = true;
      clearTask();
      onComplete();
    }

    function start() {
      if (finished) return;
      setTask(step);
      options.requestFrame(step);
    }

    return {
      start,
      step,
      stop,
      getState: () => ({ row, finished }),
    };
  }

  global.RadenPixelLoop = Object.assign({}, global.RadenPixelLoop || {}, {
    createPixelLoop,
    writeRgb,
  });
})(window);
