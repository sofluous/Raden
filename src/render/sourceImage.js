/* Raden source image helpers (Architecture Phase D)
 * Exposed via window.RadenSourceImage for compatibility with the static app shell.
 */
(function registerRadenSourceImage(global) {
  let uploadedImage = null;
  let uploadedImageName = "";
  let callbacks = {};

  function configure(opts) {
    callbacks = Object.assign({}, callbacks, opts || {});
  }

  function getUploadedImage() {
    return uploadedImage;
  }

  function getUploadedImageName() {
    return uploadedImageName;
  }

  function clearUploadedImage() {
    uploadedImage = null;
    uploadedImageName = "";
  }

  function setUploadedImage(image, name) {
    uploadedImage = image || null;
    uploadedImageName = image ? name || "uploaded image" : "";
  }

  function buildImageSourceCanvas(config, opts) {
    const options = opts || {};
    const fallbackCanvas =
      options.fallbackCanvas || callbacks.fallbackCanvas || document.getElementById("canvas");
    const sourceImage =
      options.sourceImage ||
      uploadedImage ||
      (fallbackCanvas?.width > 0 && fallbackCanvas?.height > 0
        ? fallbackCanvas
        : null);
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = config.width;
    srcCanvas.height = config.height;
    const sctx = srcCanvas.getContext("2d");
    sctx.fillStyle = "#f2efe8";
    sctx.fillRect(0, 0, srcCanvas.width, srcCanvas.height);

    if (!sourceImage) {
      return srcCanvas;
    }

    const fit = config.imageFitMode || "contain";
    const zoom = Math.max(0.1, config.imageCropScale || 1);
    const rotate = ((config.imageRotate || 0) * Math.PI) / 180;
    const sw = sourceImage.width;
    const sh = sourceImage.height;
    let dw = srcCanvas.width;
    let dh = srcCanvas.height;

    if (fit === "contain") {
      const scale = Math.min(srcCanvas.width / sw, srcCanvas.height / sh);
      dw = sw * scale;
      dh = sh * scale;
    } else if (fit === "cover") {
      const scale = Math.max(srcCanvas.width / sw, srcCanvas.height / sh);
      dw = sw * scale;
      dh = sh * scale;
    } else if (fit === "center") {
      dw = sw;
      dh = sh;
    } else if (fit === "stretch") {
      dw = srcCanvas.width;
      dh = srcCanvas.height;
    }

    dw *= zoom;
    dh *= zoom;

    sctx.save();
    sctx.translate(srcCanvas.width / 2, srcCanvas.height / 2);
    sctx.rotate(rotate);
    sctx.drawImage(sourceImage, -dw / 2, -dh / 2, dw, dh);
    sctx.restore();
    return srcCanvas;
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("No file provided"));
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Unable to decode image"));
      };
      img.src = url;
    });
  }

  async function handleImageUploadChange(event, opts) {
    const options = Object.assign({}, callbacks, opts || {});
    const file = event.target.files && event.target.files[0];
    if (!file) {
      clearUploadedImage();
      options.setStatus?.("idle", "Image source cleared");
      options.scheduleFinalRender?.();
      return null;
    }
    try {
      const img = await loadImageFromFile(file);
      setUploadedImage(img, file.name || "uploaded image");
      options.setStatus?.("complete", `Image loaded: ${uploadedImageName}`);
      options.scheduleFinalRender?.();
      return img;
    } catch (err) {
      console.error(err);
      options.setStatus?.("error", "Unable to load image");
      return null;
    }
  }

  function bindImageUpload(opts) {
    const options = Object.assign({}, callbacks, opts || {});
    const input = document.getElementById("imageUpload");
    if (!input || input.dataset.sourceImageBound) return;
    input.addEventListener("change", (event) => {
      handleImageUploadChange(event, options);
    });
    input.dataset.sourceImageBound = "1";
  }

  global.RadenSourceImage = Object.assign({}, global.RadenSourceImage || {}, {
    configure,
    getUploadedImage,
    getUploadedImageName,
    clearUploadedImage,
    setUploadedImage,
    buildImageSourceCanvas,
    loadImageFromFile,
    handleImageUploadChange,
    bindImageUpload,
  });
})(window);
