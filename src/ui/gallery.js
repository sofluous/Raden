/* Raden gallery helpers (Architecture Phase D)
 * Exposed via window.RadenUiGallery for compatibility with the static app shell.
 */
(function registerRadenUiGallery(global) {
  let galleryItems = [];
  let selectedGalleryItemId = null;
  let storageKey = "";
  let persistence = null;
  let callbacks = {};

  function configure(opts) {
    const options = opts || {};
    storageKey = options.storageKey || storageKey;
    persistence = options.persistence || global.RadenPersistence || persistence;
    callbacks = Object.assign({}, callbacks, options.callbacks || {});
  }

  function getItems() {
    return galleryItems.slice();
  }

  function getSelectedId() {
    return selectedGalleryItemId;
  }

  function saveGallery() {
    persistence = persistence || global.RadenPersistence;
    if (persistence && typeof persistence.saveGallery === "function") {
      persistence.saveGallery({
        storageKey,
        items: galleryItems,
      });
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(galleryItems));
  }

  function loadGallery() {
    persistence = persistence || global.RadenPersistence;
    if (persistence && typeof persistence.loadGallery === "function") {
      galleryItems = persistence.loadGallery({
        storageKey,
      }).map((item) => global.RadenLayers?.normalizeGalleryItem?.(item) || item);
      return galleryItems;
    }
    const raw = localStorage.getItem(storageKey);
    galleryItems = (raw ? JSON.parse(raw) : []).map(
      (item) => global.RadenLayers?.normalizeGalleryItem?.(item) || item,
    );
    return galleryItems;
  }

  function selectGalleryItem(id) {
    selectedGalleryItemId = selectedGalleryItemId === id ? null : id;
    renderGallery();
  }

  function deleteGalleryItem(id) {
    galleryItems = galleryItems.filter((item) => item.id !== id);
    if (selectedGalleryItemId === id) selectedGalleryItemId = null;
    saveGallery();
    renderGallery();
  }

  function recallGalleryItem(item) {
    const legacySettings =
      item.legacySettings ||
      item.settings ||
      global.RadenLayers?.getLegacySettingsFromLayerState?.(item.state);
    if (typeof callbacks.applyControlState === "function") {
      callbacks.applyControlState(legacySettings);
    }
    if (typeof callbacks.setLayerState === "function" && item.state) {
      callbacks.setLayerState(item.state);
    }
    if (typeof callbacks.setActiveTab === "function") {
      callbacks.setActiveTab("generate");
    }
    if (typeof callbacks.scheduleFinalRender === "function") {
      callbacks.scheduleFinalRender();
    }
  }

  function renderGallery() {
    const grid = document.getElementById("galleryGrid");
    if (!grid) return;
    grid.innerHTML = "";
    galleryItems.forEach((item) => {
      const tile = document.createElement("div");
      tile.className = "gallery-tile";
      if (selectedGalleryItemId === item.id) tile.classList.add("is-selected");
      tile.dataset.id = item.id;
      tile.tabIndex = 0;
      tile.setAttribute("role", "button");
      tile.setAttribute(
        "aria-pressed",
        selectedGalleryItemId === item.id ? "true" : "false",
      );
      tile.setAttribute("aria-label", `Select snapshot ${item.label}`);
      const img = document.createElement("img");
      img.src = item.thumbnail;
      img.alt = item.label;

      const meta = document.createElement("div");
      meta.className = "snapshot-meta";
      const name = document.createElement("div");
      name.className = "snapshot-name";
      name.textContent = item.label;
      const sub = document.createElement("div");
      sub.className = "snapshot-sub";
      const seedVal = (item.legacySettings || item.settings)?.seed;
      sub.textContent = `seed ${seedVal === undefined || seedVal === null || seedVal === "" ? "-" : String(seedVal)}`;
      meta.appendChild(name);
      meta.appendChild(sub);

      const actions = document.createElement("div");
      actions.className = "gallery-actions";
      const delBtn = document.createElement("button");
      delBtn.className = "ds-btn ds-btn-sm btn";
      delBtn.title = "Delete snapshot";
      delBtn.setAttribute("aria-label", `Delete snapshot ${item.label}`);
      delBtn.innerHTML = '<i class="iconoir-trash"></i><span>Delete</span>';
      delBtn.onclick = () => {
        deleteGalleryItem(item.id);
      };

      const recallBtn = document.createElement("button");
      recallBtn.className = "ds-btn ds-btn-sm ds-btn-primary btn";
      recallBtn.title = "Recall snapshot";
      recallBtn.setAttribute("aria-label", `Recall snapshot ${item.label}`);
      recallBtn.innerHTML = '<i class="iconoir-refresh"></i><span>Recall</span>';
      recallBtn.onclick = () => {
        recallGalleryItem(item);
      };

      actions.appendChild(delBtn);
      actions.appendChild(recallBtn);
      tile.appendChild(img);
      tile.appendChild(meta);
      tile.appendChild(actions);
      tile.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        selectGalleryItem(item.id);
      });
      tile.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        selectGalleryItem(item.id);
      });
      grid.appendChild(tile);
    });
  }

  function createSnapshotThumbnail(sourceCanvas) {
    const tiny = document.createElement("canvas");
    tiny.width = 220;
    tiny.height = 220;
    const tctx = tiny.getContext("2d");
    tctx.drawImage(sourceCanvas, 0, 0, tiny.width, tiny.height);
    return tiny.toDataURL("image/jpeg", 0.7);
  }

  function saveSnapshot(opts) {
    const options = opts || {};
    const buildSnapshotCanvas =
      options.buildSnapshotCanvas || callbacks.buildSnapshotCanvas;
    const getControlState = options.getControlState || callbacks.getControlState;
    const getLayerState = options.getLayerState || callbacks.getLayerState;
    const setStatus = options.setStatus || callbacks.setStatus;
    if (
      typeof buildSnapshotCanvas !== "function" ||
      typeof getControlState !== "function"
    ) {
      return null;
    }
    const mode = document.getElementById("modeSelector").value;
    const legacySettings = getControlState();
    const layerState =
      typeof getLayerState === "function"
        ? getLayerState({ legacySettings, modeId: mode })
        : global.RadenLayers?.buildLayerStateFromFlatState?.(legacySettings, {
            modeId: mode,
          });
    const id = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const item = {
      id,
      version: global.RadenLayers?.LAYER_STATE_VERSION || 2,
      label: `${mode} ${new Date().toLocaleString()}`,
      thumbnail: createSnapshotThumbnail(buildSnapshotCanvas()),
      state: layerState,
      legacySettings,
      settings: legacySettings,
    };
    galleryItems.unshift(item);
    galleryItems = galleryItems.slice(0, 60);
    saveGallery();
    renderGallery();
    if (typeof setStatus === "function") {
      setStatus("complete", "Snapshot saved");
    }
    return item;
  }

  function clearGallery() {
    galleryItems = [];
    selectedGalleryItemId = null;
    saveGallery();
    renderGallery();
  }

  global.RadenUiGallery = Object.assign({}, global.RadenUiGallery || {}, {
    configure,
    getItems,
    getSelectedId,
    saveGallery,
    loadGallery,
    renderGallery,
    saveSnapshot,
    clearGallery,
    deleteGalleryItem,
    selectGalleryItem,
  });
})(window);
