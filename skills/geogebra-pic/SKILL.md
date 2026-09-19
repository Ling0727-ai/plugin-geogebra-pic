---
name: geogebra-pic
description: |
  用 GeoGebra 命令或数值序列生成数学图形与数据图表并导出 PNG、SVG、可编辑 GGB。适用于函数图像、
  解析几何、圆锥曲线、欧氏几何、轨迹、滑块与动态构造，以及折线图、散点图、拟合曲线、带单位与物理量
  的坐标轴标注、图题与图注。Use when the user asks to draw or export a mathematical construction or
  chart with GeoGebra, including ellipse, parabola, hyperbola, conics, graphs, geometry diagrams,
  line charts, scatter plots, fitted curves, labelled axes, figure captions, PNG/SVG, or editable
  .ggb files.
---

# GeoGebra Pic

Use the model-facing `geogebra_draw` and `geogebra_export` tools. Do not depend on clicking the DSH UI, an existing browser tab, remembered CDP ports, or conversation-local scripts. The tools run an isolated GeoGebra renderer and work in a fresh Session.

## Required workflow

1. Translate the request into an ordered list of GeoGebra commands, or into numeric `series` when the figure is a data chart.
2. Choose the display size and coordinate bounds. The figure is authored at the size it will be embedded at: default `800 × 600`, usually `400–800` px wide. In `series` mode the bounds come from the data, so only pass `x_min`…`y_max` to override them.
3. Call `geogebra_draw` with the commands or series, the annotations (`x_label`, `y_label`, `title`, `caption`), and the requested formats.
4. Inspect the returned `objects`, `display`, `view`, `png`, `minFontPx`, `minLegibleWidth`, `labelFontPx`, `labels`, and `labelConflicts`. A successful call must contain the expected named objects, and `labelConflicts` must be `0` for a labelled figure.
5. When the files are user deliverables, call `present` with every requested output file.
6. Briefly report the construction, the display size, and the editable/static distinction.

If `geogebra_draw` is not available, state that the `dsh-plugin-geogebra-pic` bundle must be enabled and DSH restarted. Do not recreate the old Chrome/CDP automation manually.

## Display size and embedding (mandatory)

A finished figure is normally embedded in a note, document, or slide rather than sent at its raw export size, so the canvas is the embedded size, never an oversized canvas that gets scaled down.

- `width` / `height` are the logical display size in CSS px. The PNG and SVG come out at exactly that size, and `SetFontSize` values are absolute pixels at that size.
- Default `800 × 600`. Use `400–800` px wide for notes, Word, PowerPoint, chat, and web pages; go wider only for projection or very long graphs.
- `png_scale` multiplies raster pixels only (`1` = exactly the display pixels, `2` = HiDPI). DPI metadata is written as `96 × png_scale`, so a document inserts the PNG at the logical display size either way. The old failure mode — a 1200 px canvas scaled to 600 px on insertion — halves every label.
- `minLegibleWidth` is the narrowest width at which the smallest text still reaches `12` px. Never embed the figure narrower than that, and do not let a downstream template scale it down further.
- The SVG carries a `viewBox` so it scales losslessly, but its text scales with it; the same width rule applies.
- Prefer several small figures at 400–800 px over one dense figure that must be shrunk.

## Output choices

- `ggb`: always include when the user may want to continue editing, drag points, change parameters, or recompile the construction.
- `svg`: use for vector editing, LaTeX/HTML workflows, publication, or lossless scaling.
- `png`: use for quick preview, Word, PowerPoint, chat, or raster-only destinations.
- Default to all three when the user says only “画图” and the output format is not constrained.

## Axes and grid

- Axis tick numbers are **off by default** (`axis_numbers: false`): GeoGebra's default tick labels crowd a 400–800 px figure. The background grid is off by default as well (`grid: false`).
- When a figure needs a scale reference, pass `axis_numbers: true` together with a coarser `axis_step` (for example `2`, `5`, or `10`) so the labels do not collide. Fewer, larger labels beat many small ones. A data chart normally wants `axis_numbers: true` with a step of `1`, `2`, or `5`.
- Never re-enable tick numbers and then shrink the figure below `minLegibleWidth`; that is the crowding case this default exists to prevent.
- Axis tick marks stay visible even with numbers hidden, so the axes still read as scaled.

## Axis annotation: quantities and units

This is what makes a chart a physics/maths figure rather than a picture. Always annotate a chart's axes.

- `x_label` / `y_label` draw the axis name **at the axis end** — the correct place for a quantity with its unit: `"t / s"`, `"v / (m·s⁻¹)"`, `"x / m"`, `"F / N"`, `"1/T / K⁻¹"`. Prefer this over `x_unit`/`y_unit`.
- `x_unit` / `y_unit` set GeoGebra's per-tick unit suffix, which is appended to **every** tick number (`2 s`, `4 s`, …). It is available, but the quantity-style axis label reads better and is the convention for a figure. Do not set both for the same axis unless the request explicitly asks for a unit on each tick.
- Axis labels are plain text, not LaTeX: write `m·s⁻¹` with real Unicode superscripts, or use `m/s` when the destination font may lack them.

## Figure title and caption

- `title` creates a centred title at **24 px**; `caption` creates a centred caption at **16 px** below the axes. The renderer measures the text and centres it exactly, and the caption is placed inside the frame.
- In `series` mode the view automatically reserves a band above the data for a title and below it for a caption, so neither overlaps the plot. In `commands` mode you own the bounds: leave roughly one text tier (20 px, i.e. `0.3` units on a 12-unit-wide view) of empty space at the top and bottom.
- Use `caption` for “图 1 …” style captions. Use an explicit `Text` object only when the caption must sit somewhere other than the bottom centre.
- Chinese in a title or caption is fine: it is created as a plain text object, not as a LaTeX formula.

## Labels and automatic placement

GeoGebra puts a point or segment label at a fixed offset from its object, so labels routinely sit on top of a curve, an axis, or another label. `geogebra_draw` fixes this by default.

- `label_placement` (default `smart`) measures every automatic label in the rendered figure, then moves it clear of the drawn geometry, the axis numbers, the frame edges, and the other labels. Offsets are applied as the object's `<labelOffset>` construction property, so labels stay dynamic and the `.ggb` stays editable.
- `label_leaders` (default `true`) draws a thin grey leader line from the object to a label that had to move more than ~14 px away. This is what removes the ambiguity when several points sit close together or exactly on top of each other.
- `label_placement: "default"` keeps GeoGebra's own placement; `"off"` hides all automatic labels, which is what you want when the figure carries hand-placed `Text` labels instead.
- `label_font_px` sets the font size of automatic labels **and** axis tick numbers (`12`–`48`). GeoGebra snaps the value to its own ladder, and the effective size comes back as `labelFontPx`. Default is GeoGebra's `16`. Use `18`–`20` for a chart whose tick numbers must survive being embedded small.
- The returned `labels` array reports each label's `dx`/`dy`, whether it was `displaced` (leader drawn), and `conflicts` before and after. `labelConflicts` is the total left. Treat a non-zero `labelConflicts` as a real defect: widen the view, coarsen the ticks, or reduce the number of labelled objects.
- To name a specific object, use `ShowLabel(name, true)`; automatic labels default to the object name. For a value label use the command `SetLabelMode(name, 1)` (name and value), `2` (value only), or `3` (caption, set with `SetCaption(name, "…")`); `0` is the name.
- Dense figures: prefer fewer labelled points, or label a subset (`ShowLabel` only the points that matter). The engine separates coincident labels, but a figure with twenty labelled points in a 200 px region is unreadable however it is placed.

## Charts: line, scatter, and fitted curves

Pass `series` instead of `commands` to draw a data chart. The tool builds the GeoGebra objects, picks distinct colours, and computes the view bounds from the data.

```json
"series": [
  { "name": "run 1", "points": [[0,0],[1,2.1],[2,3.9],[3,6.2],[4,7.8]], "fit": "linear" },
  { "name": "run 2", "points": [[0,0.2],[1,1.1],[2,1.9],[3,3.2],[4,4.1]], "style": "points", "fit": "poly2" }
]
```

- `points` is a list of `[x, y]` pairs, at least two. Numbers may be any finite value.
- `style`: `"line"` (polyline only), `"points"` (markers only), `"line+points"` (default: the 折线图 look).
- `fit`: `"linear"` (`FitLine`), `"poly2"`, `"poly3"`, `"poly4"` (`FitPoly`), `"exp"`, `"log"`, `"pow"`, `"sin"`. `exp`/`pow` need positive `y`, `log` needs positive `x`; the tool rejects a violating series instead of drawing nothing.
- `color`: `"#rrggbb"`; omit it and the tool assigns a distinct palette colour per series.
- Objects are named `L_i` (data list, hidden), `line_i` (polyline), `pts_i` (markers), `fit_i` (fitted curve). A `linear` fit is a GeoGebra `line` and extends across the whole view; every other model is a `function`.
- Bounds come from the data plus `8 %` padding, so do not pass `x_min`…`y_max` unless the request fixes them. A perfectly flat or vertical series still yields a valid view.
- Add a `fit` only when the request asks for a trend/fit (拟合); a plain 折线图 is `style: "line+points"` without `fit`.
- For a fully custom chart, write the commands yourself: `L_1={(0,1),(1,3)}`, `Polyline(L_1)`, `FitLine(L_1)`.

## Command construction rules

- Use stable ASCII object labels such as `F_1`, `F_2`, `ellipse`, `focusLine`; Unicode belongs in visible text, not object ids.
- Put one semantic operation in each command string. Commands are executed in order and later commands may reference earlier objects.
- Prefer exact mathematical definitions over sampled polylines.
- Use dependencies when the figure should remain editable: `A=Point(c)` instead of a visually similar unrelated coordinate.
- Add explanatory points, segments, labels, or text only when they clarify the requested property.
- Keep hidden helper values in the construction when they support verification; use GeoGebra commands such as `SetVisibleInView` where appropriate.
- Use `SetColor`, `SetLineThickness`, `SetPointSize`, and `ShowLabel` for intentional styling. A command that only changes state is fine: the renderer accepts style commands, and it still rejects a command that neither creates an object nor changes the construction.

### GeoGebra traps this renderer does not hide

- **`SetColor` takes 0–1, not 0–255.** `SetColor(s, 0.12, 0.47, 0.71)` is blue; `SetColor(s, 31, 119, 180)` clamps every channel to 1 and paints the object **white**. Divide byte values by 255.
- **A lowercase label assigned a coordinate pair becomes a vector, not a point.** `p=(1,2)` creates a vector; `P=(1,2)` creates a point. Start every point name with a capital letter, and use `Point(c)` / `Midpoint(s)` when the object must be a point.
- `SetLabelMode`, `SetCaption`, `ShowLabel`, `SetLineThickness`, `SetPointSize`, `SetVisibleInView` and friends create no object; that is expected, not a failure.
- A label offset cannot be set with a command. Use `label_placement` (the renderer writes `<labelOffset>` for you) rather than trying to fake a label with `Text`.

## Typography contract (mandatory)

Every visible GeoGebra `Text` object MUST be followed by exactly one `SetFontSize(label, pixels)` plugin directive. The renderer intercepts this directive, calls GeoGebra Apps API `setFont(label, pixels, false, false)`, verifies the persisted size, and applies it to PNG, SVG, and GGB. Do not rely on GeoGebra's default text size.

Sizes are absolute pixels **at the display size**, so they are exactly what the reader sees when the figure is embedded at that width:

| Visible role | Required size |
|---|---:|
| Figure title | `24` px |
| Main formula, theorem, or highlighted conclusion | `20` px |
| Caption, explanatory sentence, or property statement | `16` px |
| Important point/line/conic annotation | `14` px |
| Secondary annotation | `12` px minimum |

Hard rules:

- Never use a visible text size below `12` px; the renderer rejects smaller sizes. `SetFontSize` accepts `12` to `48`.
- `16` px is GeoGebra's own default, which is why `16` px captions need no extra styling to survive; larger tiers are what carry the hierarchy.
- For a display width above `900` px or a dense figure intended for projection, increase every tier by 4–6 px.
- Do not size text for a large canvas and then embed it smaller. If the figure must be embedded at 400 px, author it at 400 px; the reported `minLegibleWidth` is the hard floor.
- Automatic labels are 16 px by default; raise them with `label_font_px` rather than replacing them with `Text` objects. Replace an automatic label with an explicit `Text` object only when it must be moved somewhere the engine cannot reach or must carry a formula.
- Place text with sufficient clearance from curves, axes, and frame edges. Font size is part of framing: recheck bounds after adding captions.
- A construction with any visible `Text` object but no matching `SetFontSize` directive is incomplete and must not be delivered. `title` and `caption` are the exception: the renderer creates and sizes those itself.

Canonical example (display size `800 × 600`):

```text
title=Text("抛物线的焦点—准线定义",(-6,6))
formula=Text("x^{2}=8y",(-6,5),false,true)
caption=Text("点 P 到焦点与准线的距离相等",(-6,4))
SetFontSize(title,24)
SetFontSize(formula,20)
SetFontSize(caption,16)
```

## GeoGebra LaTeX contract (mandatory)

GeoGebra does not accept arbitrary document LaTeX. It renders a math-oriented subset through text objects. Distinguish three layers: the tool's JSON string, GeoGebra command strings, and the LaTeX content stored in a GeoGebra text object.

### Preferred forms

1. **Formula from an existing GeoGebra object: prefer `FormulaText`.** This avoids manual escaping and remains dynamic.

```text
eq: x^2=8y
formula=FormulaText(eq)
SetCoords(formula,-5,4)
SetFontSize(formula,20)
```

2. **Static math that needs no backslash command: use the four-argument `Text` overload.** The arguments are object/string, position, substitute variables, render as LaTeX.

```text
formula=Text("x^{2}=8y",(-5,4),false,true)
SetFontSize(formula,20)
```

3. **Dynamic object value at a position:** use substitution `true` and LaTeX `true`.

```text
d=Distance(P,F)
dynamicValue=Text(d,(-5,3),true,true)
SetFontSize(dynamicValue,20)
```

4. **LaTeX requiring `\\frac`, `\\sqrt`, `\\text`, `\\mathrm`, `\\quad`, Greek commands, or similar:** never type the backslash directly inside a quoted GeoGebra string. The GeoGebra command parser may consume it. Construct a literal backslash with `UnicodeToText({92})`, concatenate the LaTeX source, and hide the helper text objects.

```text
slash=UnicodeToText({92})
latexCaption=slash+"text{焦点 }F"+slash+"quad x^{2}=8y"
caption=Text(latexCaption,(-5,3),false,true)
SetFontSize(caption,16)
SetVisibleInView(slash,1,false)
SetVisibleInView(latexCaption,1,false)
```

Fraction example:

```text
slash=UnicodeToText({92})
latexFraction=slash+"frac{1}{2}"
fraction=Text(latexFraction,(-5,2),false,true)
SetFontSize(fraction,20)
SetVisibleInView(slash,1,false)
SetVisibleInView(latexFraction,1,false)
```

### LaTeX restrictions

- Do not wrap content in `$...$`, `$$...$$`, `\\(...\\)`, or `\\[...\\]`; GeoGebra's LaTeX flag already selects math rendering.
- Do not use document commands such as `\\documentclass`, packages, preambles, `figure`, `tikzpicture`, or external macros.
- Avoid unsupported environments and custom command definitions. Prefer `FormulaText` or simple constructs: superscripts/subscripts, `\\frac`, `\\sqrt`, `\\text`, `\\mathrm`, `\\mathbf`, Greek letters, relations, and spacing commands.
- Plain Chinese inside a LaTeX formula must be inside `\\text{...}`, constructed through the `slash` helper above. Raw Chinese outside `\\text` may render inconsistently.
- Do not write direct command strings such as `Text("\\frac{1}{2}",...)`; real GeoGebra testing shows the parser can render this as the literal text `frac12`.
- After rendering, visually inspect at least the PNG or SVG. Reject output that displays literal tokens such as `text`, `frac`, `quad`, `mathrm`, braces, or missing backslashes.

## Reliable patterns

### Function graph

```text
f(x)=sin(x)
```

### Ellipse from two foci and semimajor axis

```text
F_1=(-3,0)
F_2=(3,0)
ellipse=Ellipse(F_1,F_2,5)
A=Point(ellipse)
s_1=Segment(A,F_1)
s_2=Segment(A,F_2)
```

### Parabola from focus and directrix

```text
F=(0,2)
directrix: y=-2
parabola=Parabola(F,directrix)
```

### Hyperbola from foci and semimajor axis

```text
F_1=(-4,0)
F_2=(4,0)
hyperbola=Hyperbola(F_1,F_2,3)
```

### Triangle with circumcircle

```text
A=(-3,-1)
B=(3,-1)
C=(1,3)
triangle=Polygon(A,B,C)
circumcircle=Circumcircle(A,B,C)
```

### Line chart with a fitted line and labelled axes

Use `series` (no commands needed) plus the annotations:

```text
series: [
  { points: [[0,0],[1,2.1],[2,3.9],[3,6.2],[4,7.8]], style: "line+points", fit: "linear" }
]
x_label: "t / s"
y_label: "v / (m·s⁻¹)"
title: "匀加速直线运动"
caption: "图 1 速度随时间的变化，拟合直线的斜率为加速度"
axis_numbers: true
axis_step: 1
```

### Labelled points on a curve

```text
f(x)=x^2/4
A=(1,0.25)
B=(-2,1)
ShowLabel(A,true)
ShowLabel(B,true)
label_font_px: 18
```

`label_placement` defaults to `smart`, so these labels are moved clear of the parabola automatically; check that the returned `labelConflicts` is `0`.

## Framing guidance

- Function plots: select bounds from the meaningful domain/range rather than accepting a huge empty view.
- Conics: include vertices, foci, and directrices plus roughly 10–20% margin.
- Geometry: avoid placing labels against the view boundary. Remember that a caption is 16 px tall inside an 800 px wide figure, so reserve room for it in the bounds.
- Charts: let `series` compute the bounds; override only to fix the origin or to show a specific interval. Leave the tick step coarse enough that the numbers do not touch.
- Typical landscape output is `800 × 600`; use a wider canvas only for long graphs, and a square canvas for symmetric constructions.
- Leave a margin of at least one text tier (about 20 px, i.e. 0.3 units on a 12-unit-wide view) between text and the frame edge or a curve.

## Editing an existing construction

Use `geogebra_export` with a workspace-relative `.ggb` path to regenerate PNG or SVG at the current display size. The exporter is stateless: it reads the GGB file supplied in that call. It applies the same `x_label`/`y_label`/`x_unit`/`y_unit`, `label_font_px`, `label_placement`, and `title`/`caption` options as `geogebra_draw`. To change the mathematics, create a new construction with `geogebra_draw` or edit the GGB interactively in the Sidebar.

## Verification

For a mathematical invariant, include helper objects or values in the commands so the returned GGB remains auditable. Examples:

- ellipse: distances to the two foci sum to `2a`;
- parabola: distance to the focus equals distance to the directrix;
- circle: sampled point distance to center equals radius;
- tangent: use the native `Tangent` command rather than a visually approximate line.

For a labelled or charted figure, also verify:

- `labelConflicts` is `0`, and inspect the PNG/SVG for labels that still touch a curve or an axis number;
- the axis labels carry both quantity and unit, and the tick numbers are readable at the embedded width;
- a chart's `view` actually contains the data range, and a fitted curve matches the requested model.

Never claim successful drawing solely because files exist. Confirm the returned object list contains the central construction object.
