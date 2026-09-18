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
