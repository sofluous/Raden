# Raden

Browser procedural/image-driven texture generator with texture/effect workflows, stage/graph descriptions, history, snapshots, and exports.

Serve this directory over HTTP (for example, with Python 3):

```text
python -m http.server 5500 --bind 127.0.0.1
```

Open `http://127.0.0.1:5500/`; stop with Ctrl+C. External CDN libraries may need network access. No package install/build step is configured.

With Node.js (validated with 24.14.1), from this repository:

```text
node --test tests/*.test.js
```

The current suite has 34 test files covering render/config/stage/graph/data contracts and inline syntax, among other checks. Use `node --check` for changed source modules. No separate build/lint command is configured. Browser visual output, exports, and interaction review require additional checks.

Runtime inputs are `index.html`, `src/`, and `design-system/`; required regression files stay in `tests/`. Optional standalone stencil wireframe is local workspace material under `../_docs/tests/`, absent in a clone and not needed by the app/tests. No hosting configuration is supplied; review runtime delivery inputs independently of Git ignore rules.

See [AGENTS.md](AGENTS.md) for product constraints. Optional full-workspace context is at `../_docs/README.md`; runtime and normal checks are self-contained.
