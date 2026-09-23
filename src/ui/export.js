/* Raden export/crop helpers (Architecture Phase D)
 * Exposed via window.RadenUiExport for compatibility with the static app shell.
 */
(function registerRadenUiExport(global) {
  let cropRect = null;
  let cropModeActive = "full";
  let cropDragState = null;
  let callbacks = {};

  function configure(opts) {
    callbacks = Object.assign({}, callbacks, opts || {});
  }

  function getExportSourceCanvas() {
    if (typeof callbacks.getExportSourceCanvas === "function") {
      return callbacks.getExportSourceCanvas();
    }
    return document.getElementById("canvas");
  }

  function getViewportCanvas() {
    return callbacks.canvas || document.getElementById("canvas");
  }

  function getViewWindowState(width, height) {
    if (typeof callbacks.getViewWindowState === "function") {
      return callbacks.getViewWindowState(width, height);
    }
    return { dx: 0, dy: 0, drawW: width, drawH: height };
  }

  function getCropAspect(mode) {
    if (mode === "square") return 1;
    if (mode === "portrait") return 4 / 5;
    if (mode === "landscape") return 16 / 9;
    return null;
  }

  function clampCropRect(rect, srcW, srcH, aspect = null) {
    const minSize = 24;
    let sw = Math.max(minSize, Math.min(srcW, rect.sw));
    let sh = Math.max(minSize, Math.min(srcH, rect.sh));
    if (aspect) {
      if (sw / sh > aspect) {
        sw = Math.max(minSize, Math.min(srcW, Math.round(sh * aspect)));
      } else {
        sh = Math.max(minSize, Math.min(srcH, Math.round(sw / aspect)));
      }
    }
    const sx = Math.max(0, Math.min(srcW - sw, rect.sx));
    const sy = Math.max(0, Math.min(srcH - sh, rect.sy));
    return { sx, sy, sw, sh };
  }

  function createDefaultCropRect(mode, srcW, srcH) {
    if (mode === "full") return { sx: 0, sy: 0, sw: srcW, sh: srcH };
    const aspect = getCropAspect(mode);
    if (aspect) {
      let sw = srcW;
      let sh = Math.round(sw / aspect);
      if (sh > srcH) {
        sh = srcH;
        sw = Math.round(sh * aspect);
      }
      return {
        sx: Math.floor((srcW - sw) / 2),
        sy: Math.floor((srcH - sh) / 2),
        sw,
        sh,
      };
    }
    const sw = Math.max(24, Math.floor(srcW * 0.8));
    const sh = Math.max(24, Math.floor(srcH * 0.8));
    return {
      sx: Math.floor((srcW - sw) / 2),
      sy: Math.floor((srcH - sh) / 2),
      sw,
      sh,
    };
  }

  function resetCropState(mode) {
    cropRect = null;
    cropModeActive = mode || document.getElementById("exportCropMode")?.value || "full";
  }

  function getExportCropRect() {
    const cropMode = document.getElementById("exportCropMode")?.value || "full";
    const source = getExportSourceCanvas();
    const srcW = Math.max(1, source?.width || 1);
    const srcH = Math.max(1, source?.height || 1);
    if (cropMode === "full") {
      cropRect = null;
      cropModeActive = cropMode;
      return { sx: 0, sy: 0, sw: srcW, sh: srcH };
    }
    if (
      !cropRect ||
      cropModeActive !== cropMode ||
      cropRect.sw > srcW ||
      cropRect.sh > srcH
    ) {
      cropRect = createDefaultCropRect(cropMode, srcW, srcH);
      cropModeActive = cropMode;
    }
    cropRect = clampCropRect(cropRect, srcW, srcH, getCropAspect(cropMode));
    return cropRect;
  }

  function getExportTargetSize(exportCropRect) {
    const resizeEnabled =
      !!document.getElementById("exportResizeEnabled")?.checked;
    if (resizeEnabled) {
      const w =
        parseInt(document.getElementById("exportWidth").value, 10) ||
        exportCropRect.sw;
      const h =
        parseInt(document.getElementById("exportHeight").value, 10) ||
        exportCropRect.sh;
      return { width: Math.max(1, w), height: Math.max(1, h) };
    }
    return {
      width: Math.max(1, exportCropRect.sw),
      height: Math.max(1, exportCropRect.sh),
    };
  }

  function syncExportSizeUi() {
    const resizeEnabled =
      !!document.getElementById("exportResizeEnabled")?.checked;
    const exportWidth = document.getElementById("exportWidth");
    const exportHeight = document.getElementById("exportHeight");
    if (!exportWidth || !exportHeight) return;
    const exportCropRect = getExportCropRect();
    exportWidth.disabled = !resizeEnabled;
    exportHeight.disabled = !resizeEnabled;
    if (!resizeEnabled) {
      exportWidth.value = String(exportCropRect.sw);
      exportHeight.value = String(exportCropRect.sh);
    }
    updateExportCropOverlay();
  }

  function updateExportCropOverlay() {
    const overlay = document.getElementById("exportCropOverlay");
    const frame = document.getElementById("exportCropFrame");
    const exportTab = document.getElementById("tabExport");
    if (!overlay || !frame) return;
    const mode = document.getElementById("exportCropMode")?.value || "full";
    const shouldShow = exportTab && !exportTab.hidden && mode !== "full";
    overlay.hidden = !shouldShow;
    if (!shouldShow) return;
    const exportCropRect = getExportCropRect();
    const source = getExportSourceCanvas();
    const srcW = Math.max(1, source?.width || 1);
    const srcH = Math.max(1, source?.height || 1);
    const canvas = getViewportCanvas();
    const rect = canvas.getBoundingClientRect();
    const state = getViewWindowState(rect.width, rect.height);
    const left = state.dx + (exportCropRect.sx / srcW) * state.drawW;
    const top = state.dy + (exportCropRect.sy / srcH) * state.drawH;
    const width = (exportCropRect.sw / srcW) * state.drawW;
    const height = (exportCropRect.sh / srcH) * state.drawH;
    frame.style.left = `${Math.round(left)}px`;
    frame.style.top = `${Math.round(top)}px`;
    frame.style.width = `${Math.max(8, Math.round(width))}px`;
    frame.style.height = `${Math.max(8, Math.round(height))}px`;
  }

  function initCropOverlayInteractions() {
    const overlay = document.getElementById("exportCropOverlay");
    const frame = document.getElementById("exportCropFrame");
    if (!overlay || !frame || frame.dataset.exportCropBound) return;

    const beginDrag = (e, handle) => {
      if (overlay.hidden) return;
      const mode = document.getElementById("exportCropMode")?.value || "full";
      if (mode === "full") return;
      const rect = getExportCropRect();
      cropDragState = {
        handle,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startRect: { ...rect },
      };
      e.preventDefault();
      e.stopPropagation();
    };

    frame.addEventListener("pointerdown", (e) => {
      if (e.target?.dataset?.handle) return;
      beginDrag(e, "move");
    });
    frame.querySelectorAll(".crop-handle").forEach((el) => {
      el.addEventListener("pointerdown", (e) => {
        beginDrag(e, e.currentTarget.dataset.handle || "br");
      });
    });

    window.addEventListener("pointermove", (e) => {
      if (!cropDragState) return;
      const source = getExportSourceCanvas();
      const srcW = Math.max(1, source?.width || 1);
      const srcH = Math.max(1, source?.height || 1);
      const mode = document.getElementById("exportCropMode")?.value || "full";
      const aspect = getCropAspect(mode);
      const canvas = getViewportCanvas();
      const rect = canvas.getBoundingClientRect();
      const state = getViewWindowState(rect.width, rect.height);
      const sourcePerPixelX = srcW / Math.max(1, state.drawW);
      const sourcePerPixelY = srcH / Math.max(1, state.drawH);
      const dx = (e.clientX - cropDragState.startClientX) * sourcePerPixelX;
      const dy = (e.clientY - cropDragState.startClientY) * sourcePerPixelY;
      const start = cropDragState.startRect;
      let next = { ...start };

      if (cropDragState.handle === "move") {
        next.sx = start.sx + dx;
        next.sy = start.sy + dy;
      } else if (cropDragState.handle === "tl") {
        next.sx = start.sx + dx;
        next.sy = start.sy + dy;
        next.sw = start.sw - dx;
        next.sh = start.sh - dy;
      } else if (cropDragState.handle === "tr") {
        next.sy = start.sy + dy;
        next.sw = start.sw + dx;
        next.sh = start.sh - dy;
      } else if (cropDragState.handle === "bl") {
        next.sx = start.sx + dx;
        next.sw = start.sw - dx;
        next.sh = start.sh + dy;
      } else {
        next.sw = start.sw + dx;
        next.sh = start.sh + dy;
      }

      if (aspect && cropDragState.handle !== "move") {
        let sw = Math.max(24, next.sw);
        let sh = Math.max(24, next.sh);
        if (sw / sh > aspect) {
          sh = sw / aspect;
        } else {
          sw = sh * aspect;
        }
        if (cropDragState.handle === "tl") {
          next.sx = start.sx + (start.sw - sw);
          next.sy = start.sy + (start.sh - sh);
        } else if (cropDragState.handle === "tr") {
          next.sx = start.sx;
          next.sy = start.sy + (start.sh - sh);
        } else if (cropDragState.handle === "bl") {
          next.sx = start.sx + (start.sw - sw);
          next.sy = start.sy;
        } else {
          next.sx = start.sx;
          next.sy = start.sy;
        }
        next.sw = sw;
        next.sh = sh;
      }

      cropRect = clampCropRect(next, srcW, srcH, aspect);
      updateExportCropOverlay();
      syncExportSizeUi();
    });

    window.addEventListener("pointerup", () => {
      if (!cropDragState) return;
      cropDragState = null;
    });
    frame.dataset.exportCropBound = "1";
  }

  function buildExportCanvas() {
    const source = getExportSourceCanvas();
    const exportCropRect = getExportCropRect();
    const { width: outW, height: outH } = getExportTargetSize(exportCropRect);
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const outCtx = out.getContext("2d");
    outCtx.drawImage(
      source,
      exportCropRect.sx,
      exportCropRect.sy,
      exportCropRect.sw,
      exportCropRect.sh,
      0,
      0,
      outW,
      outH,
    );
    return out;
  }

  function exportWithOptions() {
    const mode = document.getElementById("modeSelector").value;
    const fileType = document.getElementById("exportFileType").value;
    const quality =
      parseFloat(document.getElementById("exportQuality").value) || 0.92;
    const exportCanvas = buildExportCanvas();
    const mime =
      fileType === "jpeg"
        ? "image/jpeg"
        : fileType === "webp"
          ? "image/webp"
          : "image/png";
    const ext = fileType === "jpeg" ? "jpg" : fileType;
    const dataUrl =
      mime === "image/png"
        ? exportCanvas.toDataURL(mime)
        : exportCanvas.toDataURL(mime, quality);
    const link = document.createElement("a");
    link.download = `${mode}_output.${ext}`;
    link.href = dataUrl;
    link.click();
  }

  global.RadenUiExport = Object.assign({}, global.RadenUiExport || {}, {
    configure,
    getCropAspect,
    clampCropRect,
    createDefaultCropRect,
    resetCropState,
    getExportCropRect,
    getExportTargetSize,
    syncExportSizeUi,
    updateExportCropOverlay,
    initCropOverlayInteractions,
    buildExportCanvas,
    exportWithOptions,
  });
})(window);
