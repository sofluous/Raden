/* Raden section/control help helpers (Architecture Phase C)
 * Exposed via window.RadenUiHelp for compatibility with the static app shell.
 */
(function registerRadenUiHelp(global) {
  const DEFAULT_SECTION_COLLAPSE_STORAGE_KEY = "raden.sectionCollapse.v1";

  function buildFallbackHelpText(labelText) {
    const plain = (labelText || "this setting")
      .replace(/[:]/g, "")
      .toLowerCase();
    return `This changes ${plain}. Move it slowly and watch how the image responds.`;
  }

  function getControlHelpText(controlId, labelText, opts) {
    const options = opts || {};
    const controlInfo = options.controlInfo || global.RadenSchema?.CONTROL_INFO || {};
    const layerMatch = String(controlId || "").match(
      /^risoL([1-6])(Angle|Opacity|ToneMin|ToneMax)$/,
    );
    if (layerMatch) {
      const layer = layerMatch[1];
      const field = layerMatch[2];
      if (field === "Angle") {
        return `Layer ${layer} screen angle. Changing this rotates that layer's dot grid and can reduce moire artifacts.`;
      }
      if (field === "Opacity") {
        return `Layer ${layer} ink strength. Lower values print lighter; higher values print denser color.`;
      }
      if (field === "ToneMin") {
        return `Layer ${layer} lower tone bound. Source tones below this value are excluded from this layer.`;
      }
      return `Layer ${layer} upper tone bound. Source tones above this value are excluded from this layer.`;
    }
    return controlInfo[controlId] || buildFallbackHelpText(labelText);
  }

  function getSectionIntro(titleKey, activeMode) {
    if (titleKey.includes("riso layers")) {
      return "Risograph-style separation splits your image into tone-based ink passes. Each layer is a stencil for a tone range: Tone Min/Max chooses what brightness it prints, Angle rotates its screen pattern, and Opacity controls ink strength. Overlap blends neighboring layers for smoother transitions. Layer View lets you inspect all layers, a single layer, or a custom visible set. The current UI is capped to 6 layers for performance and readability, but the concept itself can scale beyond that.";
    }
    if (!titleKey.includes("natural")) return "";
    return activeMode === "agateband"
      ? "Agate Bands builds layered stone bands and mineral seams. These controls shape the band flow, glow through the stone, and the dark edges that separate each layer."
      : activeMode === "malachiteflow"
        ? "Malachite Flow builds swirling green ring structures like polished stone. These controls shape the curl of the rings, how tightly they pack together, and how dramatic the dark-to-bright transitions feel."
        : activeMode === "lichengrowth"
          ? "Lichen Growth builds creeping surface colonies with ragged edges. These controls shape the size of each patch, how much the edges branch outward, and whether the growth feels dry and chalky or darker and damp."
          : activeMode === "icebloom"
            ? "Ice Crystal Bloom builds branching frost patterns with pale icy haze. These controls shape how far the crystal branches travel, how much frost fills the gaps, and how sharp or softened the bloom appears."
            : activeMode === "riverdelta"
              ? "River Delta builds branching water channels, banks, and sediment spread. These controls shape how the water splits, how wide the channels feel, and how soft the surrounding floodplain becomes."
              : activeMode === "bubblefilm"
                ? "Bubble Film builds a thin soap-film sheet made of neighboring cells and dark membrane walls. These controls shape cell size, wall thickness, rainbow sheen, and how much the film starts to tear or collapse."
                : "Natural modes use the same shared scaffold, then shape it into different organic patterns. These controls change the visible structure, color balance, and fine surface detail.";
  }

  function appendHelpIntro(list, sectionTitle) {
    const titleKey = (sectionTitle || "").toLowerCase();
    const activeMode = document.getElementById("modeSelector")?.value || "";
    const introText = getSectionIntro(titleKey, activeMode);
    if (!introText) return;
    const intro = document.createElement("p");
    intro.className = "help-v";
    intro.textContent = introText;
    list.appendChild(intro);
  }

  function openSectionHelpModal(sectionEl, sectionTitle, opts) {
    const options = opts || {};
    const resolveHelp =
      typeof options.getControlHelpText === "function"
        ? options.getControlHelpText
        : (controlId, labelText) => getControlHelpText(controlId, labelText, options);
    const dialog = document.getElementById("controlHelpDialog");
    const list = document.getElementById("sectionHelpList");
    if (!dialog || !list || !sectionEl) return;

    const rows = Array.from(sectionEl.querySelectorAll(".control-row")).filter(
      (row) => !row.hidden,
    );
    list.innerHTML = "";
    appendHelpIntro(list, sectionTitle);

    rows.forEach((row) => {
      const labelEl = row.querySelector(".control-label");
      const inputEl = row.querySelector("input[id], select[id]");
      if (!labelEl || !inputEl || !inputEl.id) return;
      const labelText = (labelEl.textContent || inputEl.id)
        .trim()
        .replace(/[:]/g, "");
      const help = resolveHelp(inputEl.id, labelText);
      const item = document.createElement("div");
      const heading = document.createElement("p");
      heading.className = "help-k";
      heading.textContent = `${labelText} (${inputEl.id})`;
      const body = document.createElement("p");
      body.className = "help-v";
      body.textContent = help;
      item.appendChild(heading);
      item.appendChild(body);
      list.appendChild(item);
    });

    if (!list.childElementCount) {
      const empty = document.createElement("p");
      empty.className = "help-v";
      empty.textContent =
        "No visible properties are available in this section for the current mode.";
      list.appendChild(empty);
    }

    document.getElementById("controlHelpTitle").textContent =
      `${sectionTitle} Help`;
    document.getElementById("controlHelpSubtitle").textContent =
      "Descriptions for the properties in this section.";
    dialog.showModal();
  }

  function resolveStorageKey(storageKey) {
    return storageKey || DEFAULT_SECTION_COLLAPSE_STORAGE_KEY;
  }

  function loadCollapsedSections(storageKey) {
    try {
      const raw = localStorage.getItem(resolveStorageKey(storageKey));
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveCollapsedSections(map, storageKey) {
    try {
      localStorage.setItem(resolveStorageKey(storageKey), JSON.stringify(map));
    } catch {
      // ignore persistence failures in restricted environments
    }
  }

  function getSectionCollapseId(section, title) {
    if (section.dataset.sectionId) return section.dataset.sectionId;
    const slug = (title || "section")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
    section.dataset.sectionId = slug || "section";
    return section.dataset.sectionId;
  }

  function setSectionCollapsed(section, collapseBtn, collapsed) {
    section.classList.toggle("is-collapsed", !!collapsed);
    const heading = section.querySelector(".section-heading");
    if (heading) {
      heading.setAttribute("aria-expanded", collapsed ? "false" : "true");
    }
    collapseBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    collapseBtn.title = collapsed ? "Expand section" : "Collapse section";
  }

  function enhanceSectionHelp(opts) {
    const options = opts || {};
    const storageKey = resolveStorageKey(options.storageKey);
    const collapsedSections = loadCollapsedSections(storageKey);
    document.querySelectorAll("#controls .section").forEach((section) => {
      const h3 = section.querySelector("h3");
      if (!h3) return;

      let headingWrap =
        h3.parentElement && h3.parentElement.classList.contains("section-heading")
          ? h3.parentElement
          : null;

      if (!headingWrap) {
        headingWrap = document.createElement("div");
        headingWrap.className = "section-heading";
        headingWrap.tabIndex = 0;
        headingWrap.setAttribute("role", "button");
        const parent = h3.parentElement;
        parent.insertBefore(headingWrap, h3);
        headingWrap.appendChild(h3);
      }
      headingWrap.tabIndex = 0;
      headingWrap.setAttribute("role", "button");

      let actionsWrap = headingWrap.querySelector(".section-heading-actions");
      if (!actionsWrap) {
        actionsWrap = document.createElement("div");
        actionsWrap.className = "section-heading-actions";
        headingWrap.appendChild(actionsWrap);
      }

      let helpBtn = h3.querySelector(".section-help-btn");
      if (!helpBtn) {
        helpBtn = document.createElement("button");
        helpBtn.type = "button";
        helpBtn.className = "section-icon-btn section-help-btn ds-icon-action";
        helpBtn.innerHTML = '<i class="iconoir-info-circle"></i>';
        h3.appendChild(helpBtn);
      }
      helpBtn.title = `Open help for ${h3.textContent}`;
      helpBtn.setAttribute("aria-label", `Open help for ${h3.textContent}`);
      if (!helpBtn.dataset.bound) {
        helpBtn.addEventListener("click", () => {
          openSectionHelpModal(section, h3.textContent || "Section", options);
        });
        helpBtn.dataset.bound = "1";
      }

      let collapseBtn = actionsWrap.querySelector(".section-collapse-btn");
      if (!collapseBtn) {
        collapseBtn = document.createElement("button");
        collapseBtn.type = "button";
        collapseBtn.className =
          "section-icon-btn section-collapse-btn ds-icon-action";
        collapseBtn.innerHTML =
          '<i class="iconoir-nav-arrow-down section-chevron"></i>';
        actionsWrap.appendChild(collapseBtn);
      }
      collapseBtn.setAttribute(
        "aria-label",
        `Toggle collapse for ${h3.textContent}`,
      );

      const sectionId = getSectionCollapseId(section, h3.textContent || "Section");
      setSectionCollapsed(section, collapseBtn, !!collapsedSections[sectionId]);

      if (!collapseBtn.dataset.bound) {
        collapseBtn.addEventListener("click", () => {
          const collapsed = !section.classList.contains("is-collapsed");
          collapsedSections[sectionId] = collapsed;
          if (!collapsed) {
            delete collapsedSections[sectionId];
          }
          saveCollapsedSections(collapsedSections, storageKey);
          setSectionCollapsed(section, collapseBtn, collapsed);
        });
        collapseBtn.dataset.bound = "1";
      }

      if (!headingWrap.dataset.collapseBound) {
        const toggleHeading = () => {
          const collapsed = !section.classList.contains("is-collapsed");
          collapsedSections[sectionId] = collapsed;
          if (!collapsed) {
            delete collapsedSections[sectionId];
          }
          saveCollapsedSections(collapsedSections, storageKey);
          setSectionCollapsed(section, collapseBtn, collapsed);
        };
        headingWrap.addEventListener("click", (e) => {
          if (
            e.target.closest(
              ".section-heading-actions, .section-collapse-btn, .section-help-btn",
            )
          ) {
            return;
          }
          toggleHeading();
        });
        headingWrap.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          if (
            e.target.closest(
              ".section-heading-actions, .section-collapse-btn, .section-help-btn",
            )
          ) {
            return;
          }
          e.preventDefault();
          toggleHeading();
        });
        headingWrap.dataset.collapseBound = "1";
      }
    });
  }

  global.RadenUiHelp = Object.assign({}, global.RadenUiHelp || {}, {
    DEFAULT_SECTION_COLLAPSE_STORAGE_KEY,
    buildFallbackHelpText,
    getControlHelpText,
    openSectionHelpModal,
    loadCollapsedSections,
    saveCollapsedSections,
    getSectionCollapseId,
    setSectionCollapsed,
    enhanceSectionHelp,
  });
})(window);
