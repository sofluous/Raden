/* Shared render coordinate transforms. */
(function registerRadenRenderCoordinates(global) {
  function getCropSpacePoint(config, x, y) {
    const width = Math.max(1, config.width || 1);
    const height = Math.max(1, config.height || 1);
    const basis = Math.max(1, Math.min(width, height));
    const cx = (x - width * 0.5) / basis;
    const cy = (y - height * 0.5) / basis;
    return {
      cx,
      cy,
      ux: cx + 0.5,
      uy: cy + 0.5,
    };
  }

  global.RadenRenderCoordinates = Object.assign(
    {},
    global.RadenRenderCoordinates || {},
    { getCropSpacePoint },
  );
})(window);
