/* Compact authored palette editor for source-layer palettes. */
(function registerRadenPaletteUi(global) {
  function getAdjacentIndex(currentIndex, itemCount, direction) {
    if (itemCount <= 0) return 0;
    return (currentIndex + Math.sign(direction) + itemCount) % itemCount;
  }

  function createPaletteEditor(options) {
    const root = options.root;
    const presetSelect = options.presetSelect;
    if (!root || !presetSelect || !global.RadenPalettes) return null;
    let selectedIndex = 0;
    let editing = false;

    const getModeId = () => options.getModeId?.() || options.modeId;

    function currentState() {
      return (
        options.getPalette?.() ||
        global.RadenPalettes.createPaletteState(getModeId(), presetSelect.value)
      );
    }

    function commit(next, label, phase) {
      options.onPaletteChange?.(next, { label, phase });
    }

    function render() {
      options.beforeRender?.({ modeId: getModeId(), presetSelect });
      const state = currentState();
      if (!state) return;
      const customOption = presetSelect.querySelector('option[value="custom"]');
      if (customOption) {
        customOption.hidden = state.source !== "custom";
        customOption.disabled = state.source !== "custom";
      }
      if (state.source === "custom") presetSelect.value = "custom";
      selectedIndex = Math.max(0, Math.min(selectedIndex, state.stops.length - 1));
      const selected = state.stops[selectedIndex];
      const paletteLocked = !!options.isPaletteLocked?.();
      root.innerHTML = `
        <div class="palette-toolbar ds-toolbar-compact">
          <button type="button" class="ds-icon-action" data-action="previous" title="Previous color" aria-label="Previous color"><i class="iconoir-nav-arrow-left"></i></button>
          <div class="palette-swatches" role="listbox" aria-label="Palette colors"></div>
          <button type="button" class="ds-icon-action" data-action="next" title="Next color" aria-label="Next color"><i class="iconoir-nav-arrow-right"></i></button>
          <button type="button" class="ds-icon-action" data-action="randomize" title="${paletteLocked ? "Palette randomization is locked" : "Randomize palette"}" aria-label="Randomize palette" ${paletteLocked ? "disabled" : ""}><i class="iconoir-dice-three"></i></button>
        </div>
        <div class="palette-color-controls">
          ${["h", "s", "l"].map((key) => `<label><span>${key.toUpperCase()}</span><input data-channel="${key}" data-live="true" type="range" aria-label="${key === "h" ? "Hue" : key === "s" ? "Saturation" : "Lightness"}" min="0" max="${key === "h" ? 360 : 100}" step="1" value="${selected.color[key]}"><output>${Math.round(selected.color[key])}</output></label>`).join("")}
        </div>`;
      const swatches = root.querySelector(".palette-swatches");
      state.stops.forEach((stop, index) => {
        const item = document.createElement("div");
        item.className = `palette-swatch${index === selectedIndex ? " is-selected" : ""}`;
        item.innerHTML = `<button type="button" class="palette-swatch-color" role="option" aria-selected="${index === selectedIndex}" aria-label="Edit color ${index + 1}" style="--swatch:${global.RadenPalettes.hslToHex(stop.color)}"></button>`;
        item.querySelector(".palette-swatch-color").addEventListener("click", () => {
          selectedIndex = index;
          render();
        });
        swatches.appendChild(item);
      });
      root.querySelectorAll("[data-channel]").forEach((input) => {
        input.addEventListener("pointerdown", () => {
          if (!editing) options.onEditStart?.();
          editing = true;
        });
        input.addEventListener("input", () => {
          const next = global.RadenPalettes.normalizePaletteState(state, { modeId: getModeId() });
          next.source = "custom";
          next.presetId = null;
          next.stops[selectedIndex].color[input.dataset.channel] = Number(input.value);
          if (customOption) {
            customOption.hidden = false;
            customOption.disabled = false;
            presetSelect.value = "custom";
          }
          input.nextElementSibling.value = input.value;
          root.querySelectorAll(".palette-swatch-color")[selectedIndex].style.setProperty("--swatch", global.RadenPalettes.hslToHex(next.stops[selectedIndex].color));
          commit(next, "Edit palette color", "input");
        });
        input.addEventListener("change", () => {
          editing = false;
          options.onEditCommit?.("Edit palette color");
          render();
        });
      });
      root.querySelector('[data-action="previous"]').onclick = () => {
        selectedIndex = getAdjacentIndex(selectedIndex, state.stops.length, -1);
        render();
      };
      root.querySelector('[data-action="next"]').onclick = () => {
        selectedIndex = getAdjacentIndex(selectedIndex, state.stops.length, 1);
        render();
      };
      root.querySelector('[data-action="randomize"]').onclick = () => {
        if (options.isPaletteLocked?.()) return;
        const next = global.RadenPalettes.randomizePaletteState(state, {
          modeId: getModeId(),
        });
        commit(next, "Randomize palette", "action");
        render();
      };
    }

    presetSelect.addEventListener("change", () => {
      if (presetSelect.value === "custom") return;
      selectedIndex = 0;
      options.onPresetChange?.();
      render();
    });
    document.addEventListener("raden:control-lock-change", (event) => {
      if (event.detail?.id === (options.lockControlId || presetSelect.id)) render();
    });
    render();
    return { render };
  }

  global.RadenUiPalettes = Object.assign({}, global.RadenUiPalettes || {}, {
    createPaletteEditor,
    getAdjacentIndex,
  });
})(window);
