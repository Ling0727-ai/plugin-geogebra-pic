---
name: geogebra-pic
description: |
  用 GeoGebra 命令生成数学图形并导出 PNG、SVG、可编辑 GGB。适用于函数图像、解析几何、
  圆锥曲线、欧氏几何、轨迹、滑块与动态构造。Use when the user asks to draw or export a
  mathematical construction with GeoGebra, including ellipse, parabola, hyperbola, conics, graphs,
  geometry diagrams, PNG/SVG, or editable .ggb files.
---

# GeoGebra Pic

Use the model-facing `geogebra_draw` and `geogebra_export` tools. Do not depend on clicking the DSH UI, an existing browser tab, remembered CDP ports, or conversation-local scripts. The tools run an isolated GeoGebra renderer and work in a fresh Session.

## Required workflow

1. Translate the requested construction into an ordered list of GeoGebra commands.
2. Choose the display size and coordinate bounds. The figure is authored at the size it will be embedded at: default `800 × 600`, usually `400–800` px wide.
3. Call `geogebra_draw` with the commands and requested formats.
4. Inspect the returned `objects`, `display`, `png`, `minFontPx`, and `minLegibleWidth`. A successful call must contain the expected named objects.
5. When the files are user deliverables, call `present` with every requested output file.
6. Briefly report the mathematical construction, the display size, and the editable/static distinction.

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
- When a figure needs a scale reference, pass `axis_numbers: true` together with a coarser `axis_step` (for example `2`, `5`, or `10`) so the labels do not collide. Fewer, larger labels beat many small ones.
- Never re-enable tick numbers and then shrink the figure below `minLegibleWidth`; that is the crowding case this default exists to prevent.
- Axis tick marks stay visible even with numbers hidden, so the axes still read as scaled.

## Command construction rules

- Use stable ASCII object labels such as `F_1`, `F_2`, `ellipse`, `focusLine`; Unicode belongs in visible text, not object ids.
- Put one semantic operation in each command string. Commands are executed in order and later commands may reference earlier objects.
- Prefer exact mathematical definitions over sampled polylines.
- Use dependencies when the figure should remain editable: `A=Point(c)` instead of a visually similar unrelated coordinate.
- Add explanatory points, segments, labels, or text only when they clarify the requested property.
- Keep hidden helper values in the construction when they support verification; use GeoGebra commands such as `SetVisibleInView` where appropriate.
- Use `SetColor`, `SetLineThickness`, `SetPointSize`, and `ShowLabel` commands for intentional styling when the standard appearance is not sufficient.

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
- Automatic labels created by `ShowLabel` do not satisfy this contract because their per-object font size is not controllable. In publication or teaching figures, replace important automatic labels with explicit `Text` objects and size them.
- Place text with sufficient clearance from curves, axes, and frame edges. Font size is part of framing: recheck bounds after adding captions.
- A construction with any visible `Text` object but no matching `SetFontSize` directive is incomplete and must not be delivered.

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

## Framing guidance

- Function plots: select bounds from the meaningful domain/range rather than accepting a huge empty view.
- Conics: include vertices, foci, and directrices plus roughly 10–20% margin.
- Geometry: avoid placing labels against the view boundary. Remember that a caption is 16 px tall inside an 800 px wide figure, so reserve room for it in the bounds.
- Typical landscape output is `800 × 600`; use a wider canvas only for long graphs, and a square canvas for symmetric constructions.
- Leave a margin of at least one text tier (about 20 px, i.e. 0.3 units on a 12-unit-wide view) between text and the frame edge or a curve.

## Editing an existing construction

Use `geogebra_export` with a workspace-relative `.ggb` path to regenerate PNG or SVG at the current display size. The exporter is stateless: it reads the GGB file supplied in that call. To change the mathematics, create a new construction with `geogebra_draw` or edit the GGB interactively in the Sidebar.

## Verification

For a mathematical invariant, include helper objects or values in the commands so the returned GGB remains auditable. Examples:

- ellipse: distances to the two foci sum to `2a`;
- parabola: distance to the focus equals distance to the directrix;
- circle: sampled point distance to center equals radius;
- tangent: use the native `Tangent` command rather than a visually approximate line.

Never claim successful drawing solely because files exist. Confirm the returned object list contains the central construction object.
