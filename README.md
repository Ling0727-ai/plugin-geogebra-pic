# GeoGebra Pic for DSH

A GeoGebra drawing workspace embedded in the DeepSeek Harness right Sidebar.

## Features

- Native GeoGebra geometry toolbar and interactive canvas
- GeoGebra command input with reusable construction examples
- Object list with visibility and delete controls
- Grid and coordinate-axis toggles
- Undo, redo, fullscreen, and clear actions
- `.ggb` import and editable `.ggb` export plus high-resolution PNG and SVG export
- Browser-local autosave for each DSH Sidebar tab
- Chinese and English UI copy
- Responsive layout for docked, floating, and fullscreen Sidebar modes
- Model-facing `geogebra_draw` and `geogebra_export` tools that work without an open UI tab
- Bundled `geogebra-pic` Skill, automatically discoverable and loadable in fresh Sessions
- Deterministic `SetFontSize(textLabel, pixels)` directives persisted across PNG, SVG, and GGB exports
- GeoGebra-specific LaTeX guidance covering `FormulaText`, `Text(..., LaTeX=true)`, backslash construction, and unsupported document LaTeX

## Agent usage

The Host plugin registers two tools:

- `geogebra_draw` executes ordered GeoGebra commands and writes PNG, SVG, and/or editable GGB outputs inside the Session workspace.
- `geogebra_export` opens an existing workspace-relative GGB file and regenerates PNG, SVG, or GGB output.

The bundle also registers the `geogebra-pic` Skill directly with the DSH Skill Registry. No user-level skill symlink or conversation memory is required. A fresh Session can ask, for example:

```text
加载 geogebra-pic skill，用 geogebra_draw 画一条焦点为 (-3,0)、(3,0)，长半轴为 5 的椭圆，导出 PNG、SVG 和 GGB。
```

The model should load the Skill, call `geogebra_draw`, inspect the returned object names, and present the generated files. Every visible `Text` object must have an explicit `SetFontSize(label, pixels)` directive; the plugin interprets sizes as CSS pixels from 10–48 and persists them through the GeoGebra Apps API. For LaTeX, follow the bundled Skill rather than inserting arbitrary document LaTeX into `Text` commands.

## Build

```sh
pnpm install
pnpm run typecheck
pnpm run lint:struct
pnpm run build
```

The build emits `lib/index.js` and `lib/client.js`. The project build script uses the adjacent DeepSeek Harness checkout at `../../deepseek-harness` for its client-bundle preset.

## Install

From the DeepSeek Harness checkout:

```sh
pnpm dsh plugin --profile web add ../dsh-plugin/geogebra-pic
```

Restart `dsh web`, then open **几何画板** from the conversation header or the right Sidebar guide.

## Runtime dependency

The browser loads GeoGebra's official deployment script from `https://www.geogebra.org/apps/deployggb.js`. Drawing requires network access to that origin. Construction data is stored locally in the browser and is not uploaded by this plugin.

## GeoGebra API

The integration follows the official [GeoGebra Apps API](https://geogebra.github.io/docs/reference/en/GeoGebra_Apps_API/) and uses `appletOnLoad` to access the applet API.
