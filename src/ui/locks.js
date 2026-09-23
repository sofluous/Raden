/* Raden randomization lock helpers (Architecture Phase C)
 * Exposed via window.RadenUiLocks for compatibility with the static app shell.
 */
(function registerRadenUiLocks(global) {
  let lockedControlIds = new Set();
  let storageKey = "";
  let persistence = null;

  function configure(opts) {
    const options = opts || {};
    storageKey = options.storageKey || storageKey;
    persistence = options.persistence || global.RadenPersistence || persistence;
  }

  function isControlLocked(id) {
    return lockedControlIds.has(id);
  }

  function saveLocks() {
    if (persistence && typeof persistence.saveLocks === "function") {
      persistence.saveLocks({
        storageKey,
        lockedControlIds,
      });
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(lockedControlIds)));
    } catch (err) {
      console.warn("Unable to persist locks", err);
    }
  }

  function loadLocks() {
    persistence = persistence || global.RadenPersistence;
    if (persistence && typeof persistence.loadLocks === "function") {
      lockedControlIds = new Set(
        persistence.loadLocks({
          storageKey,
        }),
      );
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      lockedControlIds = new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      lockedControlIds = new Set();
    }
  }

  function updateControlLockButton(btn, locked, preview = false) {
    if (!btn) return;
    btn.classList.toggle("is-locked", !!locked);
    btn.classList.toggle("is-preview", !!preview);
    btn.classList.toggle("is-faint", !locked && !preview);
    btn.setAttribute("aria-pressed", locked ? "true" : "false");
    btn.title = locked
      ? "Unlock randomize for this control"
      : "Lock this control from randomize";
    const icon = locked && preview ? "iconoir-lock-slash" : "iconoir-lock";
    btn.innerHTML = `<i class="${icon}"></i>`;
  }

  function setControlLock(id, locked) {
    if (locked) {
      lockedControlIds.add(id);
    } else {
      lockedControlIds.delete(id);
    }
    saveLocks();
    const btn = document.querySelector(
      `.control-lock-btn[data-lock-for="${id}"]`,
    );
    if (btn) {
      updateControlLockButton(btn, locked, false);
    }
  }

  function enhanceLockControls(opts) {
    const options = opts || {};
    const randomizableControlIds = options.randomizableControlIds || [];
    const randomizable = new Set(randomizableControlIds);
    document.querySelectorAll(".control-row").forEach((row) => {
      const label = row.querySelector(".control-label");
      const icons = row.querySelector(".control-icons");
      const control = row.querySelector("input[id], select[id]");
      if (!label || !control || !control.id) return;
      label.dataset.controlId = control.id;

      if (
        randomizable.has(control.id) &&
        icons &&
        !icons.querySelector(`[data-lock-for="${control.id}"]`)
      ) {
        const lockBtn = document.createElement("button");
        lockBtn.type = "button";
        lockBtn.className = "icon-btn icon-only control-lock-btn ds-icon-action";
        lockBtn.dataset.lockFor = control.id;
        lockBtn.setAttribute("aria-pressed", "false");
        lockBtn.innerHTML = '<i class="iconoir-lock"></i>';
        lockBtn.addEventListener("mouseenter", () => {
          updateControlLockButton(lockBtn, isControlLocked(control.id), true);
        });
        lockBtn.addEventListener("mouseleave", () => {
          updateControlLockButton(lockBtn, isControlLocked(control.id), false);
        });
        lockBtn.addEventListener("focus", () => {
          updateControlLockButton(lockBtn, isControlLocked(control.id), true);
        });
        lockBtn.addEventListener("blur", () => {
          updateControlLockButton(lockBtn, isControlLocked(control.id), false);
        });
        lockBtn.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setControlLock(control.id, !isControlLocked(control.id));
          updateControlLockButton(lockBtn, isControlLocked(control.id), true);
        });
        lockBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        lockBtn.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          e.stopPropagation();
          setControlLock(control.id, !isControlLocked(control.id));
          updateControlLockButton(lockBtn, isControlLocked(control.id), true);
        });
        icons.appendChild(lockBtn);
        setControlLock(control.id, isControlLocked(control.id));
      }
    });
  }

  global.RadenUiLocks = Object.assign({}, global.RadenUiLocks || {}, {
    configure,
    isControlLocked,
    saveLocks,
    loadLocks,
    setControlLock,
    updateControlLockButton,
    enhanceLockControls,
  });
})(window);
