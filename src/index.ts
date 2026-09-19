/** Host tools for stateless GeoGebra construction and export. */
import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { isAbsolute, join, relative, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-skill'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  renderGeoGebra, MIN_TEXT_SIZE_PX,
  type AxisAnnotations, type GeoGebraFormat, type GeoGebraRenderResult, type LabelReport,
} from './host/renderer.ts'
import { buildChartCommands, type ChartSeries } from './host/chart.ts'

export const name = 'geogebra-pic'
export const inject = ['tools', 'skills']

const SKILL_URL = new URL('../skills/geogebra-pic/SKILL.md', import.meta.url)
const SKILL_CONTENT = readFileSync(SKILL_URL, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '')

const FORMAT_SCHEMA = { type: 'string', enum: ['png', 'svg', 'ggb'] } as const
const LABEL_REPORT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    name: { type: 'string', required: true },
    dx: { type: 'number', required: true },
    dy: { type: 'number', required: true },
    displaced: { type: 'boolean', required: true },
    conflicts: { type: 'integer', required: true },
    conflictsBefore: { type: 'integer', required: true },
  },
} as const
const OUTPUT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    files: {
      type: 'array', required: true,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          path: { type: 'string', required: true },
          format: { type: 'string', required: true, enum: ['png', 'svg', 'ggb'] },
          bytes: { type: 'integer', required: true },
        },
      },
    },
    objects: { type: 'array', required: true, items: { type: 'string' } },
    version: { type: 'string', required: true },
    display: {
      type: 'object', required: true, additionalProperties: false,
      properties: { width: { type: 'integer', required: true }, height: { type: 'integer', required: true } },
    },
    view: {
      type: 'object', required: true, additionalProperties: false,
      properties: {
        xMin: { type: 'number', required: true }, xMax: { type: 'number', required: true },
        yMin: { type: 'number', required: true }, yMax: { type: 'number', required: true },
      },
    },
    png: {
      type: 'object', additionalProperties: false,
      properties: {
        width: { type: 'integer', required: true },
        height: { type: 'integer', required: true },
        dpi: { type: 'integer', required: true },
      },
    },
    minFontPx: { type: 'number' },
    minLegibleWidth: { type: 'integer' },
    labelFontPx: { type: 'integer', required: true },
    labelConflicts: { type: 'integer' },
    labels: { type: 'array', items: LABEL_REPORT_SCHEMA },
  },
} as const

type OutputFile = { path: string; format: GeoGebraFormat; bytes: number }
type ToolOutput = {
  files: OutputFile[]
  objects: string[]
  version: string
  display: { width: number; height: number }
  view: { xMin: number; xMax: number; yMin: number; yMax: number }
  png?: { width: number; height: number; dpi: number }
  minFontPx?: number
  minLegibleWidth?: number
  labelFontPx: number
  labelConflicts?: number
  labels?: LabelReport[]
}

function sessionCwd(exec: { readonly agent?: { readonly session: { readonly header: { readonly cwd?: string } } } }): string {
  const cwd = exec.agent?.session.header.cwd
  if (cwd === undefined) throw new Error('GeoGebra tools require a Session workspace')
  return cwd
}

function safeWorkspacePath(cwd: string, authored: string): string {
  if (authored.trim().length === 0) throw new Error('Path must not be empty')
  const target = resolve(cwd, authored)
  const fromWorkspace = relative(cwd, target)
  if (fromWorkspace.startsWith('..') || isAbsolute(fromWorkspace)) throw new Error('Path must stay inside the Session workspace')
  return target
}

function safeBasename(value: string | undefined): string {
  const basename = value?.trim() || 'geogebra-drawing'
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(basename)) {
    throw new Error('basename must be 1-80 filename-safe characters and start with a letter or number')
  }
  return basename.replace(/\.(?:png|svg|ggb)$/iu, '')
}

function formats(values: readonly string[] | undefined, defaults: readonly GeoGebraFormat[]): GeoGebraFormat[] {
  const selected = values === undefined ? [...defaults] : [...new Set(values)] as GeoGebraFormat[]
  if (selected.length === 0) throw new Error('formats must contain at least one of png, svg, or ggb')
  return selected
}

/**
 * Figures are authored at their embedded display size, not at an oversized canvas. A figure that is
 * drawn at 1200 px and then dropped into a document at 600 px halves every label.
 */
const DEFAULT_WIDTH = 800
const DEFAULT_HEIGHT = 600
const DEFAULT_PNG_SCALE = 1
const DEFAULT_VIEW = { xMin: -10, xMax: 10, yMin: -7, yMax: 7 }
/** Distinct colours so a multi-series chart reads without the caller picking colours. */
const SERIES_PALETTE = ['#1f77b4', '#d62728', '#2ca02c', '#ff7f0e', '#9467bd', '#8c564b', '#17becf', '#bcbd22']

interface Bounds { xMin: number; xMax: number; yMin: number; yMax: number }

function dimensions(width: number | undefined, height: number | undefined): { width: number; height: number } {
  const resolved = { width: width ?? DEFAULT_WIDTH, height: height ?? DEFAULT_HEIGHT }
  if (!Number.isInteger(resolved.width) || resolved.width < 320 || resolved.width > 2400
    || !Number.isInteger(resolved.height) || resolved.height < 240 || resolved.height > 1800) {
    throw new Error('width must be 320-2400 and height must be 240-1800')
  }
  return resolved
}

function view(args: { x_min?: number; x_max?: number; y_min?: number; y_max?: number }, fallback: Bounds): Bounds {
  const value = {
    xMin: args.x_min ?? fallback.xMin, xMax: args.x_max ?? fallback.xMax,
    yMin: args.y_min ?? fallback.yMin, yMax: args.y_max ?? fallback.yMax,
  }
  if (!(value.xMin < value.xMax && value.yMin < value.yMax)) throw new Error('Coordinate bounds must satisfy min < max')
  return value
}

function pngScaleOf(value: number | undefined): number {
  const scale = value ?? DEFAULT_PNG_SCALE
  if (!Number.isFinite(scale) || scale < 0.5 || scale > 4) throw new Error('png_scale must be from 0.5 to 4')
  return scale
}

function axisStepOf(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isFinite(value) || value <= 0 || value > 1000) throw new Error('axis_step must be a positive number up to 1000')
  return value
}

function labelFontOf(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isInteger(value) || value < MIN_TEXT_SIZE_PX || value > 48) {
    throw new Error(`label_font_px must be an integer from ${MIN_TEXT_SIZE_PX} to 48`)
  }
  return value
}

function placementOf(value: string | undefined): 'smart' | 'default' | 'off' {
  if (value === undefined) return 'smart'
  if (value !== 'smart' && value !== 'default' && value !== 'off') {
    throw new Error('label_placement must be one of smart, default, or off')
  }
  return value
}

function textOf(value: string | undefined, what: string): string | undefined {
  if (value === undefined) return undefined
  const text = value.trim()
  if (text.length === 0) throw new Error(`${what} must not be empty when given`)
  if (text.length > 400) throw new Error(`${what} must be at most 400 characters`)
  return text
}

function axisAnnotations(x: string | undefined, y: string | undefined): AxisAnnotations | undefined {
  const labelX = textOf(x, 'x_label')
  const labelY = textOf(y, 'y_label')
  const labels: { x?: string; y?: string } = {}
  if (labelX !== undefined) labels.x = labelX
  if (labelY !== undefined) labels.y = labelY
  return Object.keys(labels).length === 0 ? undefined : labels
}

function unitAnnotations(x: string | undefined, y: string | undefined): AxisAnnotations | undefined {
  const unitX = textOf(x, 'x_unit')
  const unitY = textOf(y, 'y_unit')
  const units: { x?: string; y?: string } = {}
  if (unitX !== undefined) units.x = unitX
  if (unitY !== undefined) units.y = unitY
  return Object.keys(units).length === 0 ? undefined : units
}

interface FigureArgs {
  width?: number
  height?: number
  x_min?: number
  x_max?: number
  y_min?: number
  y_max?: number
  png_scale?: number
  transparent?: boolean
  axis_numbers?: boolean
  axis_step?: number
  grid?: boolean
  x_label?: string
  y_label?: string
  x_unit?: string
  y_unit?: string
  label_font_px?: number
  label_placement?: string
  label_leaders?: boolean
  title?: string
  caption?: string
}

/**
 * Shared figure options for both tools. Axis tick numbers and the grid are off for embed sizes;
 * labels are placed by the collision-aware engine unless the caller opts out.
 */
function figureOptions(args: FigureArgs, fallback: Bounds) {
  const axisStep = axisStepOf(args.axis_step)
  const axisLabels = axisAnnotations(args.x_label, args.y_label)
  const axisUnits = unitAnnotations(args.x_unit, args.y_unit)
  const labelFontPx = labelFontOf(args.label_font_px)
  const title = textOf(args.title, 'title')
  const caption = textOf(args.caption, 'caption')
  return {
    ...dimensions(args.width, args.height),
    ...view(args, fallback),
    pngScale: pngScaleOf(args.png_scale),
    transparent: args.transparent ?? false,
    axisNumbers: args.axis_numbers ?? false,
    grid: args.grid ?? false,
    labelPlacement: placementOf(args.label_placement),
    labelLeaders: args.label_leaders ?? true,
    ...(axisStep === undefined ? {} : { axisStep }),
    ...(axisLabels === undefined ? {} : { axisLabels }),
    ...(axisUnits === undefined ? {} : { axisUnits }),
    ...(labelFontPx === undefined ? {} : { labelFontPx }),
    ...(title === undefined ? {} : { title: { text: title } }),
    ...(caption === undefined ? {} : { caption: { text: caption } }),
  }
}

/**
 * Turn chart series into commands plus bounds, reserving room for a title and caption so neither
 * sits on the data. Colours default to a distinct palette so several series stay readable.
 */
function chartPlan(args: FigureArgs & { series?: readonly ChartSeries[] }): { commands: readonly string[]; bounds: Bounds } {
  const series = args.series ?? []
  if (series.length === 0) throw new Error('series must contain at least one series object')
  const coloured: ChartSeries[] = series.map((entry, index) => entry.color === undefined
    ? { ...entry, color: SERIES_PALETTE[index % SERIES_PALETTE.length] ?? '#1f77b4' }
    : entry)
  const caption = textOf(args.caption, 'caption')
  const title = textOf(args.title, 'title')
  const provisional = buildChartCommands({ series: coloured })
  const span = provisional.yMax - provisional.yMin
  const captionSpace = caption === undefined ? 0 : span * 0.12
  const titleSpace = title === undefined ? 0 : span * 0.06
  const built = buildChartCommands({ series: coloured, captionSpace })
  return {
    commands: built.commands,
    bounds: { xMin: built.xMin, xMax: built.xMax, yMin: built.yMin, yMax: built.yMax + titleSpace },
  }
}

async function saveOutputs(
  rendered: GeoGebraRenderResult,
  outputDir: string,
  basename: string,
  selected: readonly GeoGebraFormat[],
  bounds: Bounds,
): Promise<ToolOutput> {
  await mkdir(outputDir, { recursive: true })
  const files: OutputFile[] = []
  for (const format of selected) {
    const output = rendered.outputs[format]
    if (output === undefined) throw new Error(`GeoGebra did not return ${format} output`)
    const path = join(outputDir, `${basename}.${format}`)
    const data = format === 'svg' ? output : Buffer.from(output, 'base64')
    await writeFile(path, data)
    files.push({ path, format, bytes: typeof data === 'string' ? Buffer.byteLength(data) : data.length })
  }
  const minFontPx = rendered.minFontPx
  return {
    files, objects: [...rendered.objects], version: rendered.version, display: rendered.display, view: bounds,
    labelFontPx: rendered.labelFontPx,
    ...(rendered.png === undefined ? {} : { png: rendered.png }),
    ...(rendered.labelConflicts === undefined ? {} : { labelConflicts: rendered.labelConflicts }),
    ...(rendered.labels === undefined ? {} : { labels: [...rendered.labels] }),
    ...(minFontPx === undefined
      ? {}
      : { minFontPx, minLegibleWidth: Math.floor((rendered.display.width * MIN_TEXT_SIZE_PX) / minFontPx) }),
  }
}

function renderedText(value: ToolOutput): string {
  const lines = [
    `GeoGebra ${value.version} created ${value.objects.length} object(s): ${value.objects.join(', ') || '(none)'}`,
    `Display ${value.display.width} x ${value.display.height} px: author and embed at this width.`,
    `View x [${value.view.xMin}, ${value.view.xMax}], y [${value.view.yMin}, ${value.view.yMax}].`,
  ]
  if (value.minFontPx !== undefined && value.minLegibleWidth !== undefined) {
    lines.push(`Smallest text ${value.minFontPx} px: keep the embedded width at or above ${value.minLegibleWidth} px so text stays at least ${MIN_TEXT_SIZE_PX} px.`)
  }
  lines.push(`Automatic labels and tick numbers render at ${value.labelFontPx} px.`)
  if (value.labels !== undefined && value.labels.length > 0) {
    const moved = value.labels.filter(label => label.dx !== 0 || label.dy !== 0)
    const displaced = value.labels.filter(label => label.displaced)
    const before = value.labels.reduce((total, label) => total + label.conflictsBefore, 0)
    lines.push(`Label placement: ${value.labels.length} label(s) checked, ${moved.length} moved, ${displaced.length} with a leader line, ${before} -> ${value.labelConflicts ?? 0} obstacle conflicts.`)
    const crowded = moved.filter(label => label.conflicts > 0)
    if (crowded.length > 0) {
      lines.push(`Still touching geometry: ${crowded.map(label => `${label.name}(${label.conflicts})`).join(', ')}. Widen the view or move nearby objects.`)
    }
  }
  for (const file of value.files) {
    const detail = file.format === 'png' && value.png !== undefined
      ? `${value.png.width} x ${value.png.height} px @ ${value.png.dpi} dpi, ${file.bytes} bytes`
      : `${file.bytes} bytes`
    lines.push(`${file.format.toUpperCase()}: ${file.path} (${detail})`)
  }
  return lines.join('\n')
}

const FIGURE_PARAMETERS = {
  width: { type: 'integer', description: 'Logical display width in CSS px from 320 to 2400; defaults to 800. This is the width the figure is authored for and embedded at, so 400-800 is the usual range for notes, documents, and slides.' },
  height: { type: 'integer', description: 'Logical display height in CSS px from 240 to 1800; defaults to 600.' },
  x_min: { type: 'number', description: 'Visible x-axis minimum. Omit to use the default -10, or the data range in series mode.' },
  x_max: { type: 'number', description: 'Visible x-axis maximum. Omit to use the default 10, or the data range in series mode.' },
  y_min: { type: 'number', description: 'Visible y-axis minimum. Omit to use the default -7, or the data range in series mode.' },
  y_max: { type: 'number', description: 'Visible y-axis maximum. Omit to use the default 7, or the data range in series mode.' },
  png_scale: { type: 'number', description: 'Raster multiplier from 0.5 to 4; defaults to 1. PNG pixels are width x scale while the embedded size stays the display size, because DPI metadata is written as 96 x scale. Use 2 only for HiDPI destinations.' },
  transparent: { type: 'boolean', description: 'Use a transparent PNG background; defaults to false.' },
  axis_numbers: { type: 'boolean', description: 'Show axis tick numbers; defaults to false because the default tick labels crowd a 400-800 px figure. Enable together with a coarser axis_step for chart figures.' },
  axis_step: { type: 'number', description: 'Distance between axis ticks, for example 5 or 10. Use a coarser interval whenever axis_numbers is enabled.' },
  grid: { type: 'boolean', description: 'Show the background grid; defaults to false for clean embedded figures.' },
  x_label: { type: 'string', description: 'Label drawn at the end of the x-axis, using the physical-quantity convention such as "t / s" or "x / m". This is how units belong on a chart axis; prefer it over x_unit.' },
  y_label: { type: 'string', description: 'Label drawn at the top of the y-axis, for example "v / (m·s⁻¹)" or "F / N".' },
  x_unit: { type: 'string', description: 'Per-tick unit suffix for the x-axis, for example "s". GeoGebra appends it to every tick number ("2 s"), so use x_label unless the figure really needs a unit on each tick.' },
  y_unit: { type: 'string', description: 'Per-tick unit suffix for the y-axis; see x_unit.' },
  label_font_px: { type: 'integer', description: `Font size in px for automatic object labels and axis tick numbers, ${MIN_TEXT_SIZE_PX}-48; GeoGebra snaps it to its own ladder and the effective size is reported back. Defaults to GeoGebra's 16 px.` },
  label_placement: { type: 'string', enum: ['smart', 'default', 'off'], description: 'smart (default) measures every automatic label and moves it clear of curves, axes, other labels, and the frame, drawing a thin leader line when a label has to move far; default keeps GeoGebra\'s own placement; off hides automatic labels entirely so the figure can use authored Text labels.' },
  label_leaders: { type: 'boolean', description: 'Draw a thin leader line for a label that the engine had to move away from its object; defaults to true. Set false for a cleaner look when labels stay close.' },
  title: { type: 'string', description: 'Figure title, created, centred, and sized by the renderer at 24 px.' },
  caption: { type: 'string', description: 'Figure caption, created, centred, and sized by the renderer at 16 px below the axes. In series mode the view reserves a band under the data so the caption never sits on it.' },
} as const

const SERIES_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    name: { type: 'string' },
    points: { type: 'array', required: true, items: { type: 'array', items: { type: 'number' } } },
    style: { type: 'string', enum: ['line', 'points', 'line+points'] },
    color: { type: 'string' },
    fit: { type: 'string', enum: ['linear', 'poly2', 'poly3', 'poly4', 'exp', 'log', 'pow', 'sin'] },
  },
} as const

export function apply(ctx: Context): void {
  ctx.skills.register({
    name: 'geogebra-pic',
    description: 'Use GeoGebra commands to create mathematical constructions and export PNG, SVG, or editable GGB files. Use for functions, geometry, conics, loci, line charts, fitted curves, and dynamic constructions, including axis labels with units and figure captions.',
    whenToUse: 'When the user asks to draw, construct, verify, or export a mathematical figure or chart with GeoGebra.',
    source: 'bundled',
    path: fileURLToPath(SKILL_URL),
    resourceBase: { kind: 'directory', path: fileURLToPath(new URL('../skills/geogebra-pic/', import.meta.url)) },
    content: SKILL_CONTENT,
  })
  ctx.tools.register(defineTool({
    name: 'geogebra_draw',
    description: 'Create a GeoGebra construction from GeoGebra commands, or from numeric chart series, and export PNG, SVG, and/or an editable .ggb file. Use this for function plots, Euclidean geometry, conics, analytic geometry, sliders, loci, line charts, scatter plots, fitted curves, and publication-ready mathematical figures. Outputs are written inside the current Session workspace. Commands execute in one construction and may reference objects created by earlier commands. The figure is authored at its embedded display size (default 800 x 600 px), so width is the size it is meant to be shown at; PNG DPI metadata matches the raster multiplier so documents insert it at that size. Axis tick numbers and the background grid are off by default because they crowd a 400-800 px figure; give a chart an axis_label with the quantity and unit (for example "t / s") rather than a unit suffix on every tick. Automatic point/segment labels are placed by a collision-aware engine by default, so they avoid curves, axes, and each other. For every visible Text object, include the plugin directive SetFontSize(label, pixels) with an explicit 12-48 px size; it is applied through the GeoGebra Apps API and persisted in every export.',
    parameters: {
      commands: { type: 'array', items: { type: 'string' }, description: 'Ordered GeoGebra commands, for example ["F_1=(-3,0)", "F_2=(3,0)", "c=Ellipse(F_1,F_2,5)"]. Provide either commands or series, not both.' },
      series: { type: 'array', items: SERIES_SCHEMA, description: 'Numeric chart series instead of commands: each entry is { points: [[x,y],...], style?: "line"|"points"|"line+points", color?: "#rrggbb", fit?: "linear"|"poly2"|"poly3"|"poly4"|"exp"|"log"|"pow"|"sin" }. Objects are named L_i, line_i, pts_i, fit_i; the view bounds come from the data unless x_min/x_max/y_min/y_max are given. Provide either series or commands, not both.' },
      basename: { type: 'string', description: 'Output filename without extension; defaults to geogebra-drawing.' },
      output_dir: { type: 'string', description: 'Workspace-relative output directory; defaults to the workspace root.' },
      formats: { type: 'array', items: FORMAT_SCHEMA, description: 'Any of png, svg, ggb; defaults to all three.' },
      ...FIGURE_PARAMETERS,
      chrome_path: { type: 'string', description: 'Optional Chrome/Chromium/Edge executable path when automatic discovery fails.' },
    },
    output: { schema: OUTPUT_SCHEMA, render: (_args, value) => [{ type: 'text', text: renderedText(value) }] },
    timeoutMs: 120_000,
    async execute(args, exec) {
      const cwd = sessionCwd(exec)
      const outputDir = safeWorkspacePath(cwd, args.output_dir?.trim() || '.')
      const selected = formats(args.formats, ['png', 'svg', 'ggb'])
      const chart = args.series === undefined ? undefined : chartPlan(args)
      if (chart === undefined && args.commands === undefined) {
        throw new Error('Provide either commands or series')
      }
      if (chart !== undefined && args.commands !== undefined) {
        throw new Error('Provide either commands or series, not both')
      }
      const commands = chart?.commands ?? args.commands ?? []
      if (commands.length === 0 || commands.some(command => command.trim().length === 0)) {
        throw new Error('commands must contain at least one non-empty command')
      }
      const options = figureOptions(args, chart?.bounds ?? DEFAULT_VIEW)
      const rendered = await renderGeoGebra({
        commands, formats: selected, ...options, signal: exec.signal,
        ...(args.chrome_path?.trim() ? { chromePath: args.chrome_path.trim() } : {}),
      })
      return saveOutputs(rendered, outputDir, safeBasename(args.basename), selected, {
        xMin: options.xMin, xMax: options.xMax, yMin: options.yMin, yMax: options.yMax,
      })
    },
    presentCall: args => ({ card: 'generic', title: args.series === undefined ? 'Draw with GeoGebra' : 'Draw chart with GeoGebra', kind: 'other', rawInput: args }),
  }))

  ctx.tools.register(defineTool({
    name: 'geogebra_export',
    description: 'Open an existing editable .ggb construction from the current Session workspace and export it to PNG, SVG, and/or another .ggb file. Use geogebra_draw when starting from commands. Axis labels, label font size, and collision-aware label placement can be applied while exporting.',
    parameters: {
      input_file: { type: 'string', required: true, description: 'Workspace-relative path to an existing .ggb file.' },
      basename: { type: 'string', description: 'Output filename without extension; defaults to the input filename.' },
      output_dir: { type: 'string', description: 'Workspace-relative output directory; defaults to the input file directory.' },
      formats: { type: 'array', items: FORMAT_SCHEMA, description: 'Any of png, svg, ggb; defaults to png and svg.' },
      ...FIGURE_PARAMETERS,
      chrome_path: { type: 'string', description: 'Optional Chrome/Chromium/Edge executable path.' },
    },
    output: { schema: OUTPUT_SCHEMA, render: (_args, value) => [{ type: 'text', text: renderedText(value) }] },
    timeoutMs: 120_000,
    async execute(args, exec) {
      const cwd = sessionCwd(exec)
      const inputPath = safeWorkspacePath(cwd, args.input_file)
      if (!inputPath.toLowerCase().endsWith('.ggb')) throw new Error('input_file must end with .ggb')
      const input = await readFile(inputPath)
      const inputName = args.input_file.replaceAll('\\', '/').split('/').at(-1)?.replace(/\.ggb$/iu, '')
      const defaultDir = args.input_file.replaceAll('\\', '/').split('/').slice(0, -1).join('/') || '.'
      const outputDir = safeWorkspacePath(cwd, args.output_dir?.trim() || defaultDir)
      const selected = formats(args.formats, ['png', 'svg'])
      const options = figureOptions(args, DEFAULT_VIEW)
      const rendered = await renderGeoGebra({
        ggbBase64: input.toString('base64'), formats: selected, ...options, signal: exec.signal,
        ...(args.chrome_path?.trim() ? { chromePath: args.chrome_path.trim() } : {}),
      })
      return saveOutputs(rendered, outputDir, safeBasename(args.basename ?? inputName), selected, {
        xMin: options.xMin, xMax: options.xMax, yMin: options.yMin, yMax: options.yMax,
      })
    },
    presentCall: args => ({ card: 'generic', title: 'Export GeoGebra construction', kind: 'read', rawInput: args }),
  }))
}
