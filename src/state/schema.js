/* Raden control schema (Architecture Phase B)
 * Exposed via window.RadenSchema to keep the static app model and current call sites.
 */
(function registerRadenSchema(global) {
  const RANDOMIZABLE_CONTROL_IDS = [
    "seed",
    "scale",
    "layers",
    "range",
    "blend",
    "intensity",
    "layerLength",
    "ringSpacing",
    "ringJitter",
    "seamThickness",
    "seamContrast",
    "lightAngle",
    "lightCurvature",
    "lightSpread",
    "highlightStrength",
    "scratchDensity",
    "scratchAngle",
    "surfacePolish",
    "boostR",
    "boostG",
    "boostB",
    "gaussianBlur",
    "grainToggle",
    "fxInvert",
    "fxChromatic",
    "fxGlitch",
    "fxScanline",
    "flowMode",
    "nacreBrilliance",
    "nacreChromatic",
    "nacrePalette",
    "textureFamily",
    "opalCellScale",
    "opalVeinDensity",
    "opalFire",
    "opalMatrix",
    "labradoriteScale",
    "labradoriteDirection",
    "labradoriteBanding",
    "labradoriteFlash",
    "labradoriteDarkness",
    "marbleFlowScale",
    "marbleVeinFreq",
    "marbleContrast",
    "marbleInkDrift",
    "marbleLightness",
    "naturalScale",
    "naturalWarp",
    "naturalTurbulence",
    "naturalAnisotropy",
    "agateBandFreq",
    "agateBandJitter",
    "agateVeinDensity",
    "agateTranslucency",
    "agateEdgeDarken",
    "malachiteSwirl",
    "malachiteRingTightness",
    "malachiteRingVariance",
    "malachiteContrast",
    "lichenPatchScale",
    "lichenBranching",
    "lichenEdgeRoughness",
    "lichenCoverage",
    "lichenMoistureTone",
    "iceBranchDepth",
    "iceBranchAngleJitter",
    "iceFrostDensity",
    "iceMeltSoftness",
    "iceHaze",
    "deltaChannelWidth",
    "deltaBranchRate",
    "deltaSedimentMix",
    "deltaFloodplainSoftness",
    "deltaErosion",
    "imageFitMode",
    "imageCropScale",
    "imageRotate",
    "risoLayerCount",
    "risoPalettePreset",
    "risoRenderStyle",
    "risoLayerAngleStep",
    "risoLayerOpacity",
    "risoLayerOverlap",
    "risoColorSplit",
    "risoL1Angle",
    "risoL1Opacity",
    "risoL1ToneMin",
    "risoL1ToneMax",
    "risoL2Angle",
    "risoL2Opacity",
    "risoL2ToneMin",
    "risoL2ToneMax",
    "risoL3Angle",
    "risoL3Opacity",
    "risoL3ToneMin",
    "risoL3ToneMax",
    "risoL4Angle",
    "risoL4Opacity",
    "risoL4ToneMin",
    "risoL4ToneMax",
    "risoL5Angle",
    "risoL5Opacity",
    "risoL5ToneMin",
    "risoL5ToneMax",
    "risoL6Angle",
    "risoL6Opacity",
    "risoL6ToneMin",
    "risoL6ToneMax",
    "ditherMethod",
    "ditherDotShape",
    "ditherDotSize",
    "ditherDotSpread",
    "ditherUniformity",
    "palettePreset",
    "paletteSize",
    "colorDepthBits",
    "pixelBlockSize",
    "ditherBayerSize",
    "scanlineStrength",
    "substrateTone",
    "substrateMix",
    "topoPreset",
    "topoNoiseType",
    "topoBandCount",
    "topoRenderMode",
    "topoRidge",
    "topoWarp",
    "topoErosion",
    "risoDotSize",
    "risoThreshold",
  ];

  const CROSS_MODE_RANDOMIZABLE_IDS = new Set([
    "seed",
    "boostR",
    "boostG",
    "boostB",
    "gaussianBlur",
    "grainToggle",
    "fxInvert",
    "fxChromatic",
    "fxGlitch",
    "fxScanline",
  ]);

  const CONTROL_HELP = {
    resolutionPreset: "Sets the render canvas size. Auto uses your window size. Custom lets you enter pixel dimensions.",
    renderWidth: "Render width in pixels. Final render size is capped to 4096 per side and about 16.7M pixels total.",
    renderHeight: "Render height in pixels. Final render size is capped to 4096 per side and about 16.7M pixels total.",
    canvasViewZoom: "Display-only zoom for previewing detail. Does not change generation or export resolution.",
    canvasPanX: "Display-only horizontal pan for the canvas view.",
    canvasPanY: "Display-only vertical pan for the canvas view.",
    exportCropMode: "Choose the export crop frame. Custom enables draggable/resizable crop handles over the canvas view.",
    exportResizeEnabled: "When enabled, export is resized to the custom width/height below. When disabled, export keeps the crop size.",
    exportWidth: "Target export width in pixels when Resize Export is enabled.",
    exportHeight: "Target export height in pixels when Resize Export is enabled.",
    scale: "Base pattern scale. Lower values create larger formations; higher values create tighter detail.",
    layers: "Detail layers (noise octaves). Higher values add texture complexity but cost more render time.",
    ringSpacing: "Distance/frequency of nacre growth bands. Higher values make denser stripe patterns.",
    substrateTone: "Substrate color under nacre. Use light for pearl-like shells, dark for abalone-like shells.",
    substrateMix: "How much substrate shows through nacre. Higher mix reveals more base material.",
    textureFamily: "Switches nacre structure style. Classic is balanced, Opal adds cellular veins, Labradorite emphasizes directional flashes.",
    lightCurvature: "Bends lighting bands across the shell surface curvature.",
    lightSpread: "Controls how broad or tight light bands appear.",
    opalCellScale: "Controls Opal cell size. Lower values create larger cell structures.",
    opalVeinDensity: "Controls how dense and sharp the vein boundaries are.",
    opalFire: "Controls iridescent fire intensity inside opal cells.",
    opalMatrix: "Controls darkness of the host matrix around opal color pockets.",
    labradoriteScale: "Controls feature size of the labradorite flash pattern.",
    labradoriteDirection: "Rotates directional flash streaks across the surface.",
    labradoriteBanding: "Controls sharpness and spacing of flash bands.",
    labradoriteFlash: "Controls intensity of blue-green labradorescence flashes.",
    labradoriteDarkness: "Controls darkness of the host stone matrix.",
    marbleFlowScale: "Controls scale of flowing marble structures.",
    marbleVeinFreq: "Controls frequency of vein lines through the stone.",
    marbleContrast: "Controls contrast between veins and host stone.",
    marbleInkDrift: "Controls how much ink-like warping distorts veins.",
    marbleLightness: "Controls base stone lightness.",
    topoWarp: "Domain warping amount for terrain. Higher values bend and flow contour structures.",
    topoErosion: "Post-noise smoothing/erosion. Higher values soften terrain and reduce sharp transitions.",
    naturalScale: "Controls the overall feature size for natural-pattern scaffolds.",
    naturalWarp: "Controls how strongly natural structures bend and distort.",
    naturalTurbulence: "Adds extra irregularity to natural forms.",
    naturalAnisotropy: "Stretches structures in a preferred direction.",
    agateBandFreq: "Controls how many stone bands appear across the agate. Higher values create tighter band packing.",
    agateBandJitter: "Adds wobble to the agate bands so they feel less perfectly striped.",
    agateVeinDensity: "Controls how many dark seam lines and mineral veins appear between the bands.",
    agateTranslucency: "Controls how much inner glow shows through the stone bands.",
    agateEdgeDarken: "Darkens the band edges and seams to create stronger stone layering.",
    malachiteSwirl: "Controls how much the malachite rings twist and curl into flowing swirls.",
    malachiteRingTightness: "Controls how tightly the ring bands pack together in the stone.",
    malachiteRingVariance: "Adds uneven spacing so the ring pattern feels more natural and less perfect.",
    malachiteContrast: "Controls the difference between dark and bright green bands.",
    lichenPatchScale: "Controls the size of the lichen colonies. Lower values make broader patches; higher values create smaller clustered growth.",
    lichenBranching: "Controls how much the lichen edge grows outward into branching, creeping shapes.",
    lichenEdgeRoughness: "Adds ragged, broken edges so the colony feels more organic and crusty.",
    lichenCoverage: "Controls how much of the surface the lichen colonies cover.",
    lichenMoistureTone: "Shifts the lichen toward drier pale growth or darker, damper mossy growth.",
    iceBranchDepth: "Controls how far the crystal branches reach before they fade out.",
    iceBranchAngleJitter: "Adds variation to crystal branch direction so the bloom feels less rigid.",
    iceFrostDensity: "Controls how much frosty grain fills the spaces around the crystal branches.",
    iceMeltSoftness: "Softens hard crystal edges so the bloom can feel colder, foggier, or slightly thawed.",
    iceHaze: "Adds a pale icy mist over the bloom to brighten the colder parts of the texture.",
    deltaChannelWidth: "Controls how wide the main water channels appear in the river pattern.",
    deltaBranchRate: "Controls how often the river splits into smaller branches.",
    deltaSedimentMix: "Controls how much sandy or muddy color spreads out from the channels into the surrounding land.",
    deltaFloodplainSoftness: "Softens the transition between water channels, banks, and open floodplain areas.",
    deltaErosion: "Carves the channel network more aggressively for sharper river paths and cut banks.",
    imageFitMode: "Defines how an uploaded image fits inside the render frame.",
    imageCropScale: "Zoom level for the uploaded image framing.",
    imageRotate: "Rotates the uploaded image before processing.",
    risoLayerCount: "Target number of color layers used for risograph separation.",
    risoRenderStyle: "Original V1 restores the first Riso Image separation behavior. Legacy gives playful one-pass dots, and Layered adds per-layer overrides.",
    risoLayerAngleStep: "Angle difference between each ink layer to reduce moire and improve print separation.",
    risoLayerOpacity: "Base opacity applied per simulated ink layer.",
    risoLayerOverlap: "How much neighboring tone bands overlap between layers.",
    risoColorSplit: "How strongly pixel color family influences which layer receives ink.",
    risoLayerViewMode: "Choose how layer visibility is inspected: all layers, one solo layer, or a custom visible set.",
    risoActiveLayer: "When Layer View is set to Solo, this chooses which layer index is shown.",
    risoVisibleL1: "Layer visibility toggles used when Layer View is set to Custom Visible Set.",
    risoVisibleL2: "Layer visibility toggles used when Layer View is set to Custom Visible Set.",
    risoVisibleL3: "Layer visibility toggles used when Layer View is set to Custom Visible Set.",
    risoVisibleL4: "Layer visibility toggles used when Layer View is set to Custom Visible Set.",
    risoVisibleL5: "Layer visibility toggles used when Layer View is set to Custom Visible Set.",
    risoVisibleL6: "Layer visibility toggles used when Layer View is set to Custom Visible Set.",
    ditherMethod: "Dithering algorithm used to convert tones into printable patterns.",
    ditherDotShape: "Shape used for halftone/dither marks.",
    ditherDotSize: "Base size of dither dots.",
    ditherDotSpread: "Controls spacing and spread of dither dots.",
    ditherUniformity: "Controls regular vs organic dither distribution.",
    palettePreset: "Selects a constrained target palette for retro/image stylization.",
    paletteSize: "Maximum number of colors allowed in the reduced palette.",
    colorDepthBits: "Bit-depth cap used for retro palette reduction.",
    pixelBlockSize: "Size of pixel blocks in retro output.",
    ditherBayerSize: "Matrix size for ordered/Bayer dithering patterns.",
    scanlineStrength: "Strength of horizontal scanline effect in retro output.",
  };

  function listRandomizableControlIds() {
    return Array.from(RANDOMIZABLE_CONTROL_IDS);
  }

  function getControlHelpMap() {
    return Object.assign({}, CONTROL_HELP);
  }

  function getControlHelp(id) {
    return CONTROL_HELP[id] || "";
  }

  function isSetLike(value) {
    return !!value && typeof value.has === "function";
  }

  function validateSchema(opts) {
    const options = opts || {};
    const domIds = isSetLike(options.domIds) ? options.domIds : null;
    const activeControlIds =
      isSetLike(options.activeControlIds) ? options.activeControlIds : null;
    const issues = [];
    const seenRandomizable = new Set();
    RANDOMIZABLE_CONTROL_IDS.forEach((id) => {
      if (seenRandomizable.has(id)) issues.push(`Duplicate randomizable control id: ${id}`);
      seenRandomizable.add(id);
      if (domIds && !domIds.has(id)) issues.push(`Randomizable control is missing from DOM: ${id}`);
      if (
        activeControlIds &&
        !activeControlIds.has(id) &&
        !CROSS_MODE_RANDOMIZABLE_IDS.has(id)
      ) {
        issues.push(`Randomizable control is not active for any registered mode: ${id}`);
      }
    });
    Object.entries(CONTROL_HELP).forEach(([id, help]) => {
      if (!help || help.length < 8) issues.push(`Weak control help: ${id}`);
      if (domIds && !domIds.has(id)) issues.push(`Help references missing control id: ${id}`);
    });
    return issues;
  }

  global.RadenSchema = Object.assign({}, global.RadenSchema || {}, {
    listRandomizableControlIds,
    getControlHelpMap,
    getControlHelp,
    validateSchema,
  });
})(window);
