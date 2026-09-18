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
