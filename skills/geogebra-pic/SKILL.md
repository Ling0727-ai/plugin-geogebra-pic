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
2. Choose coordinate bounds that frame the important geometry with modest margins.
3. Call `geogebra_draw` with the commands and requested formats.
4. Inspect the returned `objects` and file list. A successful call must contain the expected named objects.
5. When the files are user deliverables, call `present` with every requested output file.
6. Briefly report the mathematical construction and the editable/static distinction.

If `geogebra_draw` is not available, state that the `dsh-plugin-geogebra-pic` bundle must be enabled and DSH restarted. Do not recreate the old Chrome/CDP automation manually.

## Output choices

- `ggb`: always include when the user may want to continue editing, drag points, change parameters, or recompile the construction.
- `svg`: use for vector editing, LaTeX/HTML workflows, publication, or lossless scaling.
- `png`: use for quick preview, Word, PowerPoint, chat, or raster-only destinations.
- Default to all three when the user says only “画图” and the output format is not constrained.

## Command construction rules

- Use stable ASCII object labels such as `F_1`, `F_2`, `ellipse`, `focusLine`; Unicode belongs in visible text, not object ids.
- Put one semantic operation in each command string. Commands are executed in order and later commands may reference earlier objects.
- Prefer exact mathematical definitions over sampled polylines.
- Use dependencies when the figure should remain editable: `A=Point(c)` instead of a visually similar unrelated coordinate.
- Add explanatory points, segments, labels, or text only when they clarify the requested property.
- Keep hidden helper values in the construction when they support verification; use GeoGebra commands such as `SetVisibleInView` where appropriate.
- Use `SetColor`, `SetLineThickness`, `SetPointSize`, and `ShowLabel` commands for intentional styling when the standard appearance is not sufficient.

## Typography contract (mandatory)

Every visible GeoGebra `Text` object MUST be followed by exactly one `SetFontSize(label, pixels)` plugin directive. The renderer intercepts this directive, calls GeoGebra Apps API `setFont(label, pixels, false, false)`, verifies the persisted `sizeM`, and applies it to PNG, SVG, and GGB. Do not rely on GeoGebra's default text size.

Use this hierarchy for the default `1200 × 800` canvas:

| Visible role | Required size |
|---|---:|
| Figure title | `28` px |
| Main formula, theorem, or highlighted conclusion | `24` px |
| Caption, explanatory sentence, or property statement | `20` px |
| Important point/line/conic annotation | `18` px |
| Secondary annotation | `16` px minimum |

Hard rules:

- Never use a visible text size below `16` px. `SetFontSize` accepts integer or decimal sizes from `10` to `48`, but `10–15` are reserved for exceptional non-deliverable debug figures.
- For a canvas wider than 1600 px or a dense figure intended for projection, increase every tier by 2–4 px.
- Automatic labels created by `ShowLabel` do not satisfy this contract because their per-object font size is not controllable. In publication or teaching figures, replace important automatic labels with explicit `Text` objects and size them.
- Place text with sufficient clearance from curves, axes, and frame edges. Font size is part of framing: recheck bounds after adding captions.
- A construction with any visible `Text` object but no matching `SetFontSize` directive is incomplete and must not be delivered.

Canonical example:

```text
title=Text("抛物线的焦点—准线定义",(-6,6))
formula=Text("x^{2}=8y",(-6,5),false,true)
caption=Text("点 P 到焦点与准线的距离相等",(-6,4))
SetFontSize(title,28)
SetFontSize(formula,24)
SetFontSize(caption,20)
```

## GeoGebra LaTeX contract (mandatory)

GeoGebra does not accept arbitrary document LaTeX. It renders a math-oriented subset through text objects. Distinguish three layers: the tool's JSON string, GeoGebra command strings, and the LaTeX content stored in a GeoGebra text object.

### Preferred forms

1. **Formula from an existing GeoGebra object: prefer `FormulaText`.** This avoids manual escaping and remains dynamic.

```text
eq: x^2=8y
formula=FormulaText(eq)
SetCoords(formula,-5,4)
SetFontSize(formula,24)
```

2. **Static math that needs no backslash command: use the four-argument `Text` overload.** The arguments are object/string, position, substitute variables, render as LaTeX.

```text
formula=Text("x^{2}=8y",(-5,4),false,true)
SetFontSize(formula,24)
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
SetFontSize(caption,20)
SetVisibleInView(slash,1,false)
SetVisibleInView(latexCaption,1,false)
```

Fraction example:

```text
slash=UnicodeToText({92})
latexFraction=slash+"frac{1}{2}"
fraction=Text(latexFraction,(-5,2),false,true)
SetFontSize(fraction,24)
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
- Geometry: avoid placing labels against the view boundary.
- Typical landscape output is `1200 × 800`; use a larger width for long graphs and a square canvas for symmetric constructions.

## Editing an existing construction

Use `geogebra_export` with a workspace-relative `.ggb` path to regenerate PNG or SVG. The exporter is stateless: it reads the GGB file supplied in that call. To change the mathematics, create a new construction with `geogebra_draw` or edit the GGB interactively in the Sidebar.

## Verification

For a mathematical invariant, include helper objects or values in the commands so the returned GGB remains auditable. Examples:

- ellipse: distances to the two foci sum to `2a`;
- parabola: distance to the focus equals distance to the directrix;
- circle: sampled point distance to center equals radius;
- tangent: use the native `Tangent` command rather than a visually approximate line.

Never claim successful drawing solely because files exist. Confirm the returned object list contains the central construction object.
