/** Host tools for stateless GeoGebra construction and export. */
import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { isAbsolute, join, relative, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-skill'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { renderGeoGebra, MIN_TEXT_SIZE_PX, type GeoGebraFormat, type GeoGebraRenderResult } from './host/renderer.ts'

export const name = 'geogebra-pic'
export const inject = ['tools', 'skills']

const SKILL_URL = new URL('../skills/geogebra-pic/SKILL.md', import.meta.url)
const SKILL_CONTENT = readFileSync(SKILL_URL, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '')

const FORMAT_SCHEMA = { type: 'string', enum: ['png', 'svg', 'ggb'] } as const
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
  },
} as const

type OutputFile = { path: string; format: GeoGebraFormat; bytes: number }
type ToolOutput = {
  files: OutputFile[]
  objects: string[]
  version: string
  display: { width: number; height: number }
  png?: { width: number; height: number; dpi: number }
  minFontPx?: number
  minLegibleWidth?: number
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

function dimensions(width: number | undefined, height: number | undefined): { width: number; height: number } {
  const resolved = { width: width ?? DEFAULT_WIDTH, height: height ?? DEFAULT_HEIGHT }
  if (!Number.isInteger(resolved.width) || resolved.width < 320 || resolved.width > 2400
    || !Number.isInteger(resolved.height) || resolved.height < 240 || resolved.height > 1800) {
    throw new Error('width must be 320-2400 and height must be 240-1800')
  }
  return resolved
}

function view(args: { x_min?: number; x_max?: number; y_min?: number; y_max?: number }) {
  const value = { xMin: args.x_min ?? -10, xMax: args.x_max ?? 10, yMin: args.y_min ?? -7, yMax: args.y_max ?? 7 }
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
}

/** Shared figure options for both tools; axis tick numbers and the grid are off for embed sizes. */
function figureOptions(args: FigureArgs) {
  const axisStep = axisStepOf(args.axis_step)
  return {
    ...dimensions(args.width, args.height),
    ...view(args),
    pngScale: pngScaleOf(args.png_scale),
    transparent: args.transparent ?? false,
    axisNumbers: args.axis_numbers ?? false,
    grid: args.grid ?? false,
    ...(axisStep === undefined ? {} : { axisStep }),
  }
}

async function saveOutputs(
  rendered: GeoGebraRenderResult,
  outputDir: string,
  basename: string,
  selected: readonly GeoGebraFormat[],
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
    files, objects: [...rendered.objects], version: rendered.version, display: rendered.display,
    ...(rendered.png === undefined ? {} : { png: rendered.png }),
    ...(minFontPx === undefined
      ? {}
      : { minFontPx, minLegibleWidth: Math.floor((rendered.display.width * MIN_TEXT_SIZE_PX) / minFontPx) }),
  }
}

function renderedText(value: ToolOutput): string {
  const lines = [
    `GeoGebra ${value.version} created ${value.objects.length} object(s): ${value.objects.join(', ') || '(none)'}`,
    `Display ${value.display.width} x ${value.display.height} px: author and embed at this width.`,
  ]
  if (value.minFontPx !== undefined && value.minLegibleWidth !== undefined) {
    lines.push(`Smallest text ${value.minFontPx} px: keep the embedded width at or above ${value.minLegibleWidth} px so text stays at least ${MIN_TEXT_SIZE_PX} px.`)
  }
  for (const file of value.files) {
    const detail = file.format === 'png' && value.png !== undefined
      ? `${value.png.width} x ${value.png.height} px @ ${value.png.dpi} dpi, ${file.bytes} bytes`
      : `${file.bytes} bytes`
    lines.push(`${file.format.toUpperCase()}: ${file.path} (${detail})`)
  }
  return lines.join('\n')
}

export function apply(ctx: Context): void {
  ctx.skills.register({
    name: 'geogebra-pic',
    description: 'Use GeoGebra commands to create mathematical constructions and export PNG, SVG, or editable GGB files. Use for functions, geometry, conics, loci, and dynamic constructions.',
    whenToUse: 'When the user asks to draw, construct, verify, or export a mathematical figure with GeoGebra.',
    source: 'bundled',
    path: fileURLToPath(SKILL_URL),
    resourceBase: { kind: 'directory', path: fileURLToPath(new URL('../skills/geogebra-pic/', import.meta.url)) },
    content: SKILL_CONTENT,
  })
  ctx.tools.register(defineTool({
    name: 'geogebra_draw',
    description: 'Create a GeoGebra construction from GeoGebra commands and export PNG, SVG, and/or an editable .ggb file. Use this for function plots, Euclidean geometry, conics, analytic geometry, sliders, loci, and publication-ready mathematical figures. Outputs are written inside the current Session workspace. Commands execute in one construction and may reference objects created by earlier commands. The figure is authored at its embedded display size (default 800 x 600 px), so width is the size it is meant to be shown at; PNG DPI metadata matches the raster multiplier so documents insert it at that size. Axis tick numbers and the background grid are off by default because they crowd a 400-800 px figure. For every visible Text object, include the plugin directive SetFontSize(label, pixels) with an explicit 12-48 px size; it is applied through the GeoGebra Apps API and persisted in every export.',
    parameters: {
      commands: { type: 'array', required: true, items: { type: 'string' }, description: 'Ordered GeoGebra commands, for example ["F_1=(-3,0)", "F_2=(3,0)", "c=Ellipse(F_1,F_2,5)"].' },
      basename: { type: 'string', description: 'Output filename without extension; defaults to geogebra-drawing.' },
      output_dir: { type: 'string', description: 'Workspace-relative output directory; defaults to the workspace root.' },
      formats: { type: 'array', items: FORMAT_SCHEMA, description: 'Any of png, svg, ggb; defaults to all three.' },
      width: { type: 'integer', description: 'Logical display width in CSS px from 320 to 2400; defaults to 800. This is the width the figure is authored for and embedded at, so 400-800 is the usual range for notes, documents, and slides.' },
      height: { type: 'integer', description: 'Logical display height in CSS px from 240 to 1800; defaults to 600.' },
      x_min: { type: 'number', description: 'Visible x-axis minimum; defaults to -10.' },
      x_max: { type: 'number', description: 'Visible x-axis maximum; defaults to 10.' },
      y_min: { type: 'number', description: 'Visible y-axis minimum; defaults to -7.' },
      y_max: { type: 'number', description: 'Visible y-axis maximum; defaults to 7.' },
      png_scale: { type: 'number', description: 'Raster multiplier from 0.5 to 4; defaults to 1. PNG pixels are width x scale while the embedded size stays the display size, because DPI metadata is written as 96 x scale. Use 2 only for HiDPI destinations.' },
      transparent: { type: 'boolean', description: 'Use a transparent PNG background; defaults to false.' },
      axis_numbers: { type: 'boolean', description: 'Show axis tick numbers; defaults to false because the default tick labels crowd a 400-800 px figure.' },
      axis_step: { type: 'number', description: 'Distance between axis ticks, for example 5 or 10. Use a coarser interval whenever axis_numbers is enabled.' },
      grid: { type: 'boolean', description: 'Show the background grid; defaults to false for clean embedded figures.' },
      chrome_path: { type: 'string', description: 'Optional Chrome/Chromium/Edge executable path when automatic discovery fails.' },
    },
    output: { schema: OUTPUT_SCHEMA, render: (_args, value) => [{ type: 'text', text: renderedText(value) }] },
    timeoutMs: 120_000,
    async execute(args, exec) {
      if (args.commands.length === 0 || args.commands.some(command => command.trim().length === 0)) throw new Error('commands must contain at least one non-empty command')
      const cwd = sessionCwd(exec)
      const outputDir = safeWorkspacePath(cwd, args.output_dir?.trim() || '.')
      const selected = formats(args.formats, ['png', 'svg', 'ggb'])
      const rendered = await renderGeoGebra({
        commands: args.commands, formats: selected, ...figureOptions(args), signal: exec.signal,
        ...(args.chrome_path?.trim() ? { chromePath: args.chrome_path.trim() } : {}),
      })
      return saveOutputs(rendered, outputDir, safeBasename(args.basename), selected)
    },
    presentCall: args => ({ card: 'generic', title: 'Draw with GeoGebra', kind: 'other', rawInput: args }),
  }))

  ctx.tools.register(defineTool({
    name: 'geogebra_export',
    description: 'Open an existing editable .ggb construction from the current Session workspace and export it to PNG, SVG, and/or another .ggb file. Use geogebra_draw when starting from commands.',
    parameters: {
      input_file: { type: 'string', required: true, description: 'Workspace-relative path to an existing .ggb file.' },
      basename: { type: 'string', description: 'Output filename without extension; defaults to the input filename.' },
      output_dir: { type: 'string', description: 'Workspace-relative output directory; defaults to the input file directory.' },
      formats: { type: 'array', items: FORMAT_SCHEMA, description: 'Any of png, svg, ggb; defaults to png and svg.' },
      width: { type: 'integer', description: 'Logical display width in CSS px from 320 to 2400; defaults to 800. This is the width the figure is embedded at.' },
      height: { type: 'integer', description: 'Logical display height in CSS px from 240 to 1800; defaults to 600.' },
      x_min: { type: 'number' }, x_max: { type: 'number' }, y_min: { type: 'number' }, y_max: { type: 'number' },
      png_scale: { type: 'number', description: 'Raster multiplier from 0.5 to 4; defaults to 1. DPI metadata is written as 96 x scale so the embedded size stays the display size.' },
      transparent: { type: 'boolean', description: 'Use a transparent PNG background; defaults to false.' },
      axis_numbers: { type: 'boolean', description: 'Show axis tick numbers; defaults to false because they crowd a 400-800 px figure.' },
      axis_step: { type: 'number', description: 'Distance between axis ticks; use a coarser interval whenever axis_numbers is enabled.' },
      grid: { type: 'boolean', description: 'Show the background grid; defaults to false.' },
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
      const rendered = await renderGeoGebra({
        ggbBase64: input.toString('base64'), formats: selected, ...figureOptions(args), signal: exec.signal,
        ...(args.chrome_path?.trim() ? { chromePath: args.chrome_path.trim() } : {}),
      })
      return saveOutputs(rendered, outputDir, safeBasename(args.basename ?? inputName), selected)
    },
    presentCall: args => ({ card: 'generic', title: 'Export GeoGebra construction', kind: 'read', rawInput: args }),
  }))
}
