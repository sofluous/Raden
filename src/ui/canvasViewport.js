/* Canvas viewport geometry helpers.
 * Exposed via window.RadenCanvasViewport for the current static app shell.
 */
(function registerRadenCanvasViewport(global) {
  function getWorkspaceGutter(viewportWidth, viewportHeight) {
    const shortestSide = Math.max(1, Math.min(viewportWidth, viewportHeight));
    return Math.max(24, Math.min(160, shortestSide * 0.12));
  }

  function getFitScale(width, height, viewportWidth, viewportHeight) {
    const gutter = getWorkspaceGutter(viewportWidth, viewportHeight);
    const availableWidth = Math.max(1, viewportWidth - gutter * 2);
    const availableHeight = Math.max(1, viewportHeight - gutter * 2);
    return Math.min(1, availableWidth / width, availableHeight / height);
  }

  function zoomPanAroundWorkspacePoint(pan, pointer, viewportRect, zoomRatio) {
    const viewportCenterX = viewportRect.left + viewportRect.width * 0.5;
    const viewportCenterY = viewportRect.top + viewportRect.height * 0.5;
    const cursorX = pointer.x - viewportCenterX;
    const cursorY = pointer.y - viewportCenterY;
    const ratio = Math.max(0.0001, Number(zoomRatio) || 1);
    return {
      x: cursorX - (cursorX - (Number(pan?.x) || 0)) * ratio,
      y: cursorY - (cursorY - (Number(pan?.y) || 0)) * ratio,
    };
  }

  global.RadenCanvasViewport = Object.assign(
    {},
    global.RadenCanvasViewport || {},
    {
      getWorkspaceGutter,
      getFitScale,
      zoomPanAroundWorkspacePoint,
    },
  );
})(window);
