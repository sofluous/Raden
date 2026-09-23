/* Raden panel tab helpers (Architecture Phase C)
 * Exposed via window.RadenUiTabs for compatibility with the static app shell.
 */
(function registerRadenUiTabs(global) {
  const TAB_IDS = {
    generate: "tabGenerate",
    post: "tabPost",
    export: "tabExport",
    gallery: "tabGallery",
    settings: "tabSettings",
  };

  function getTabMap() {
    return Object.fromEntries(
      Object.entries(TAB_IDS).map(([key, id]) => [key, document.getElementById(id)]),
    );
  }

  function updateActionBar(tabName) {
    const actionButtons = {
      textureRandomizeBtn: tabName === "generate",
      postRandomizeBtn: tabName === "post",
      saveResultBtn: tabName === "generate" || tabName === "post",
      exportActionBtn: tabName === "export",
      clearGalleryActionBtn: tabName === "gallery",
      runQaActionBtn: tabName === "settings",
    };
    Object.entries(actionButtons).forEach(([id, visible]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = !visible;
      el.style.marginLeft = "";
    });
    const clearGalleryBtn = document.getElementById("clearGalleryActionBtn");
    if (clearGalleryBtn && tabName === "gallery") {
      clearGalleryBtn.style.marginLeft = "auto";
    }
  }

  function setActiveTab(tabName, opts) {
    const options = opts || {};
    const tabMap = getTabMap();
    const nextTab = Object.prototype.hasOwnProperty.call(tabMap, tabName)
      ? tabName
      : "generate";
    Object.entries(tabMap).forEach(([key, el]) => {
      if (!el) return;
      el.hidden = key !== nextTab;
    });
    document.querySelectorAll(".panel-tab-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.tab === nextTab);
    });
    const settingsTabBtn = document.getElementById("tabBtnSettings");
    if (settingsTabBtn) {
      settingsTabBtn.classList.toggle("is-active", nextTab === "settings");
    }
    updateActionBar(nextTab);
    if (typeof options.afterTabChange === "function") {
      options.afterTabChange(nextTab);
    }
  }

  function mountDeferredPanelSections() {
    const postTab = document.getElementById("tabPost");
    if (!postTab) return;
    ["postProcessingSection", "experimentalSection"].forEach((id) => {
      const section = document.getElementById(id);
      if (section) postTab.appendChild(section);
    });
  }

  function bindPanelTabs(opts) {
    const options = opts || {};
    const activate =
      typeof options.setActiveTab === "function"
        ? options.setActiveTab
        : (tabName) => setActiveTab(tabName, options);

    document.querySelectorAll(".panel-tab-btn").forEach((btn) => {
      if (btn.dataset.tabBound) return;
      btn.addEventListener("click", () => {
        activate(btn.dataset.tab);
      });
      btn.dataset.tabBound = "1";
    });

    const settingsBtn = document.getElementById("tabBtnSettings");
    if (settingsBtn && !settingsBtn.dataset.settingsTabBound) {
      settingsBtn.addEventListener("click", () => {
        activate("settings");
      });
      settingsBtn.dataset.settingsTabBound = "1";
    }
  }

  global.RadenUiTabs = Object.assign({}, global.RadenUiTabs || {}, {
    TAB_IDS,
    setActiveTab,
    updateActionBar,
    mountDeferredPanelSections,
    bindPanelTabs,
  });
})(window);
