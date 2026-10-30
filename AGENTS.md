# Raden Development

Read [README](README.md) for setup, test commands, and folder ownership.

- Preserve render/config/palette and stage/graph contracts, texture/effect-stack ownership, history, and snapshot compatibility. Descriptive graph state does not replace optimized renderer execution.
- Runtime shell is `index.html`; extracted runtime modules are under `src/`. Required automated checks live in `tests/` and must remain repository-owned.
- From this directory run `node --test tests/*.test.js`; all 34 test files pass at this rollout baseline. Check changed source with `node --check`. No package/build/lint toolchain is configured.
- Follow applicable parent instructions when present. Optional context is `../_docs/README.md`; normal tests/runtime must not depend on it. Local standalone wireframes are not production renderers or regression gates.
- Preserve unrelated changes, including the existing `.gitignore` export rule. Report unrun visual/browser/provider checks and do not stage/reset automatically.
