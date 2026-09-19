import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn, type ChildProcess } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import {
  clusterSvgTexts,
  parseSvgObstaclePoints,
  parseSvgTextNodes,
  placeLabels,
  type LabelRequest,
  type Point as LabelPoint,
} from './labels.ts'

export type GeoGebraFormat = 'png' | 'svg' | 'ggb'

/** Axis labels: the physical-quantity convention, e.g. `t / s` and `v / (m·s⁻¹)`. */
export interface AxisAnnotations {
  readonly x?: string
  readonly y?: string
}

/** A figure title or caption the renderer creates, centres, and sizes itself. */
export interface TextAnnotation {
  readonly text: string
  readonly fontPx?: number
}

export interface GeoGebraRenderRequest {
  readonly commands?: readonly string[]
  readonly ggbBase64?: string
  readonly formats: readonly GeoGebraFormat[]
  readonly width: number
  readonly height: number
  readonly xMin: number
  readonly xMax: number
  readonly yMin: number
  readonly yMax: number
  readonly pngScale: number
  readonly transparent: boolean
  /** Axis tick numbers. Off by default: at 400-800 px the default labels crowd the axes. */
  readonly axisNumbers: boolean
  /** Distance between axis ticks; a coarser interval keeps re-enabled tick numbers readable. */
  readonly axisStep?: number
  readonly grid: boolean
  /** Axis name/quantity labels drawn at the axis ends. */
  readonly axisLabels?: AxisAnnotations
  /** Per-tick unit suffixes. GeoGebra appends the unit to every tick number, so prefer axisLabels. */
  readonly axisUnits?: AxisAnnotations
  /** Automatic label and tick font size. GeoGebra snaps it to its own ladder; the result is reported. */
  readonly labelFontPx?: number
  /** `smart` runs collision-aware label placement; `default` keeps GeoGebra's own placement. */
  readonly labelPlacement?: 'smart' | 'default' | 'off'
  /** Draw a thin leader line when a label had to move away from the object it names. */
  readonly labelLeaders?: boolean
  /** Figure title, centred above the axes. */
  readonly title?: TextAnnotation
  /** Figure caption, centred below the axes. */
  readonly caption?: TextAnnotation
  readonly signal: AbortSignal
  readonly chromePath?: string
}

/** Per-label outcome of the placement engine, so a caller can audit crowded figures. */
export interface LabelReport {
  readonly name: string
  readonly dx: number
  readonly dy: number
  readonly displaced: boolean
  /** Obstacle conflicts left at the chosen position. */
  readonly conflicts: number
  /** Obstacle conflicts at GeoGebra's default position. */
  readonly conflictsBefore: number
}

export interface GeoGebraRenderResult {
  readonly objects: readonly string[]
  readonly version: string
  /** Logical display size in CSS pixels: the size the figure is authored for and embedded at. */
  readonly display: { readonly width: number; readonly height: number }
  /** Pixel size and DPI metadata of the exported PNG, when PNG was requested. */
  readonly png?: { readonly width: number; readonly height: number; readonly dpi: number }
  /** Smallest explicit text size in the construction, when any SetFontSize directive was used. */
  readonly minFontPx?: number
  /** Effective automatic-label font size after GeoGebra's own snapping. */
  readonly labelFontPx: number
  /** Labels the placement engine moved, when it ran. */
  readonly labels?: readonly LabelReport[]
  /** Obstacle conflicts that remain after placement. */
  readonly labelConflicts?: number
  readonly outputs: Partial<Record<GeoGebraFormat, string>>
}

interface FontSizeDirective {
  readonly label: string
  readonly pixels: number
}

const FONT_SIZE_DIRECTIVE = /^\s*SetFontSize\(\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*(\d+(?:\.\d+)?)\s*\)\s*$/u
/** Absolute floor for text that must survive embedding at 400-800 px. */
export const MIN_TEXT_SIZE_PX = 12
const MAX_TEXT_SIZE_PX = 48
/** Typography tiers from the plugin contract, applied to renderer-created title and caption. */
const TITLE_FONT_PX = 24
const CAPTION_FONT_PX = 16
/** GeoGebra's own default label/tick size, reported when no label font was requested. */
const DEFAULT_LABEL_FONT_PX = 16
/**
 * GeoGebra's applet frame draws a 1 px border on every side, and the exported graphics view is the
 * frame's inner box. The viewport is therefore enlarged by this amount so the export matches the
 * requested display size exactly.
 */
const FRAME_BORDER_PX = 1
/** Embedded images are placed by their DPI metadata, so DPI must track the raster multiplier. */
const BASE_DPI = 96

function pngMetadata(base64: string): { width: number; height: number; dpi: number } {
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length < 24 || buffer.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('GeoGebra PNG output is not a valid PNG')
  }
  let offset = 8
  let dpi = BASE_DPI
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    if (type === 'pHYs' && offset + 17 <= buffer.length && buffer.readUInt8(offset + 16) === 1) {
      dpi = Math.round(buffer.readUInt32BE(offset + 8) * 0.0254)
    }
    if (type === 'IEND') break
    offset += 12 + length
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), dpi }
}

/** A viewBox makes the SVG scale losslessly when a consumer embeds it at another width. */
function withViewBox(svg: string, width: number, height: number): string {
  if (/<svg\b[^>]*\bviewBox=/u.test(svg)) return svg
  return svg.replace(/<svg\b([^>]*)>/u, (_match, attributes: string) => `<svg${attributes} viewBox="0 0 ${width} ${height}">`)
}

function splitFontSizeDirectives(commands: readonly string[] | undefined): {
  readonly commands: readonly string[] | undefined
  readonly fontSizes: readonly FontSizeDirective[]
} {
  if (commands === undefined) return { commands: undefined, fontSizes: [] }
  const executable: string[] = []
  const fontSizes: FontSizeDirective[] = []
  for (const command of commands) {
    const match = FONT_SIZE_DIRECTIVE.exec(command)
    if (match === null) {
      executable.push(command)
      continue
    }
    const label = match[1]
    const pixels = Number(match[2])
    if (label === undefined || !Number.isFinite(pixels) || pixels < MIN_TEXT_SIZE_PX || pixels > MAX_TEXT_SIZE_PX) {
      throw new Error(`SetFontSize requires a text label and a pixel size from ${MIN_TEXT_SIZE_PX} to ${MAX_TEXT_SIZE_PX}`)
    }
    fontSizes.push({ label, pixels })
  }
  return { commands: executable, fontSizes }
}

function textElementPattern(label: string): RegExp {
  return new RegExp(`(<element\\s+type="text"\\s+label="${label}"[^>]*>)([\\s\\S]*?)(</element>)`, 'u')
}

function persistGgbFontSizes(base64: string, directives: readonly FontSizeDirective[]): string {
  if (directives.length === 0) return base64
  const archive = unzipSync(Buffer.from(base64, 'base64'))
  const xmlBytes = archive['geogebra.xml']
  if (xmlBytes === undefined) throw new Error('GeoGebra GGB output is missing geogebra.xml')
  let xml = strFromU8(xmlBytes)
  // sizeM is a multiple of the GUI font size, which label_font_px may have moved away from 16.
  const guiMatch = /<font size="(\d+)"\/>/u.exec(xml)
  const guiFont = guiMatch?.[1] === undefined ? DEFAULT_LABEL_FONT_PX : Number(guiMatch[1])
  for (const directive of directives) {
    const elementPattern = textElementPattern(directive.label)
    const match = elementPattern.exec(xml)
    if (match === null || match[1] === undefined || match[2] === undefined || match[3] === undefined) {
      throw new Error(`SetFontSize target is not a persisted text object: ${directive.label}`)
    }
    // GeoGebra already stores a non-default size at full precision; only a size equal to the GUI
    // font is omitted and has to be written here.
    const existing = /<font\b[^>]*sizeM="([\d.]+)"[^>]*\/>/u.exec(match[2])
    if (existing !== null && Math.abs(Number(existing[1]) * guiFont - directive.pixels) < 0.51) continue
    const multiplier = Math.round((directive.pixels / guiFont) * 10000) / 10000
    const font = `<font serif="false" sizeM="${multiplier}" size="0" style="0"/>`
    const body = existing === null
      ? `${match[2]}\t${font}\n`
      : match[2].replace(/<font\b[^>]*\/>/u, font)
    xml = xml.replace(elementPattern, `${match[1]}${body}${match[3]}`)
  }
  archive['geogebra.xml'] = strToU8(xml)
  return Buffer.from(zipSync(archive, { level: 6 })).toString('base64')
}

/** The GUI font size governs every automatic label and axis tick number in the construction. */
function patchGgbLabelFont(base64: string, pixels: number): string {
  const archive = unzipSync(Buffer.from(base64, 'base64'))
  const xmlBytes = archive['geogebra.xml']
  if (xmlBytes === undefined) throw new Error('GeoGebra GGB output is missing geogebra.xml')
  const xml = strFromU8(xmlBytes)
  const patched = /<font size="\d+"\/>/u.test(xml)
    ? xml.replace(/<font size="\d+"\/>/u, `<font size="${Math.round(pixels)}"/>`)
    : xml
  if (patched === xml) throw new Error('GeoGebra GGB output has no GUI font element to patch')
  archive['geogebra.xml'] = strToU8(patched)
  return Buffer.from(zipSync(archive, { level: 6 })).toString('base64')
}

function html(width: number, height: number): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>html,body,#app{width:100%;height:100%;margin:0;overflow:hidden}</style>
<script src="https://www.geogebra.org/apps/deployggb.js"></script></head>
<body><div id="app"></div><script>
window.__ggbError = null;
window.addEventListener('error', event => { window.__ggbError = event.message || 'page error'; });
function boot() {
  if (typeof GGBApplet !== 'function') { setTimeout(boot, 50); return; }
  const applet = new GGBApplet({ appName:'classic', width:${width}, height:${height}, perspective:'G', showToolBar:false,
    showMenuBar:false, showAlgebraInput:false, showResetIcon:false, showZoomButtons:false,
    enableRightClick:false, language:'en', appletOnLoad(api) { window.ggbApplet = api; window.__ggbReady = true; } }, true);
  applet.inject('app');
}
boot();
</script></body></html>`
}

/**
 * Page-side runtime shared by every evaluation step. It lives on `window.__dsh` so the host can
 * drive the applet in several steps: build, measure, place labels, export.
 *
 * `String.raw` keeps the regular expressions below readable — they are meant for the page, so a
 * single backslash is what the browser must receive.
 */
const PAGE_RUNTIME = String.raw`
window.__dsh = (() => {
  const app = () => window.ggbApplet;
  const STYLE_COMMAND = /^(Set|Show|Hide|Start|Stop|Play|Pause|Zoom|Pan|Select|Delete|Rename|Update|Copy|Run|Redo|Undo)/;
  const decode = value => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const stripExpression = xml => xml.replace(/^<expression[^>]*\/>\s*/u, '').replace(/\s+$/u, '');
  return {
    /**
     * Run the model's commands one at a time.
     *
     * evalCommandGetLabels returns null both for a failed command and for a style command that
     * creates no object, so a command that produced no label is accepted when it still changed the
     * construction. Style commands are also accepted when they are a no-op, which is what makes
     * ShowLabel(A, true) work on an object whose label is already visible.
     */
    run(commands) {
      const api = app();
      const failures = [];
      for (const raw of commands) {
        const command = String(raw).trim();
        if (command.length === 0) continue;
        const isStyle = STYLE_COMMAND.test(command);
        const beforeXml = isStyle ? null : api.getXML();
        let created = null;
        try { created = api.evalCommandGetLabels(command); } catch (error) { failures.push({ command, reason: String((error && error.message) || error) }); continue; }
        if (created !== null && created !== '') continue;
        if (isStyle) continue;
        if (api.getXML() !== beforeXml) continue;
        failures.push({ command, reason: 'GeoGebra did not accept this command' });
      }
      return failures;
    },
    applyFonts(directives) {
      const api = app();
      // sizeM is a multiple of the GUI font size, so the expected value moves with label_font_px.
      const guiMatch = /<font size="(\d+)"\/>/u.exec(api.getXML());
      const gui = guiMatch ? Number(guiMatch[1]) : 16;
      for (const directive of directives) {
        if (api.getObjectType(directive.label) !== 'text') throw new Error('SetFontSize target is not a text object: ' + directive.label);
        api.setFont(directive.label, directive.pixels, false, false);
        // GeoGebra omits <font> entirely when the size equals the GUI font, and stores the
        // multiplier at full precision otherwise, so compare effective pixels rather than text.
        const font = /<font\b[^>]*sizeM="([\d.]+)"[^>]*\/>/u.exec(api.getXML(directive.label));
        const effective = font === null ? gui : Number(font[1]) * gui;
        if (Math.abs(effective - directive.pixels) >= 0.51) {
          throw new Error('SetFontSize did not persist for ' + directive.label + ' (got ' + effective + ' px, wanted ' + directive.pixels + ' px)');
        }
      }
      return directives.length;
    },
    /** Current font of every text object, so a GUI-font change cannot silently resize them. */
    snapshotTextFonts() {
      const api = app();
      const guiMatch = /<font size="(\d+)"\/>/u.exec(api.getXML());
      const gui = guiMatch ? Number(guiMatch[1]) : 16;
      const list = [];
      for (const name of api.getAllObjectNames()) {
        if (api.getObjectType(name) !== 'text') continue;
        const match = /<font[^>]*sizeM="([\d.]+)"/u.exec(api.getXML(name));
        list.push({ label: name, pixels: match ? Math.round(Number(match[1]) * gui) : gui });
      }
      return list;
    },
    applyView(input) {
      const api = app();
      api.setCoordSystem(input.xMin, input.xMax, input.yMin, input.yMax);
      api.setGraphicsOptions(1, { grid: input.grid, axes: { x: { showNumbers: input.axisNumbers }, y: { showNumbers: input.axisNumbers } } });
      if (typeof input.axisStep === 'number') api.setAxisSteps(1, input.axisStep, input.axisStep);
      if (input.axisLabels) api.setAxisLabels(1, input.axisLabels.x || '', input.axisLabels.y || '', '');
      if (input.axisUnits) api.setAxisUnits(1, input.axisUnits.x || '', input.axisUnits.y || '', '');
      return true;
    },
    effectiveLabelFont(fallback) {
      const match = /<font size="(\d+)"\/>/u.exec(app().getXML());
      return match ? Number(match[1]) : fallback;
    },
    /** Screen position of every object that carries a visible automatic label. */
    scanLabels() {
      const api = app();
      const view = JSON.parse(api.getViewProperties(1));
      const toPx = (x, y) => ({ x: (x - view.xMin) / view.invXscale, y: view.height - (y - view.yMin) / view.invYscale });
      const coordinates = name => {
        const type = api.getObjectType(name);
        if (type === 'point') return [{ x: api.getXcoord(name), y: api.getYcoord(name) }];
        const match = /^[A-Za-z_][A-Za-z0-9_]*\((.*)\)$/u.exec(api.getCommandString(name));
        if (match === null) return [];
        return match[1].split(',').map(part => part.trim())
          .filter(part => /^[A-Za-z_][A-Za-z0-9_]*$/u.test(part))
          .filter(part => api.getObjectType(part) === 'point')
          .map(part => ({ x: api.getXcoord(part), y: api.getYcoord(part) }));
      };
      const anchorOf = (name, type) => {
        const points = coordinates(name);
        if (points.length === 0) return null;
        if (type === 'point') return points[0];
        if (type === 'polygon') {
          return {
            x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
            y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
          };
        }
        if (points.length < 2) return null;
        return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
      };
      const labels = [];
      for (const name of api.getAllObjectNames()) {
        const type = api.getObjectType(name);
        if (type === 'text') continue;
        if (!api.getVisible(name) || !api.getLabelVisible(name)) continue;
        const xml = api.getXML(name);
        const mode = Number((/<labelMode val="(\d+)"\/>/u.exec(xml) || [])[1] || 0);
        const caption = /<caption val="([^"]*)"\/>/u.exec(xml);
        let text = name;
        if (mode === 3 && caption !== null) text = decode(caption[1]);
        else if (mode === 2) text = api.getValueString(name);
        else if (mode === 1) text = name + ' = ' + api.getValueString(name);
        const anchor = anchorOf(name, type);
        if (anchor === null) continue;
        const screen = toPx(anchor.x, anchor.y);
        labels.push({ name, type, text, anchorX: screen.x, anchorY: screen.y, userX: anchor.x, userY: anchor.y });
      }
      return { labels, view };
    },
    /**
     * Create the figure title and caption as sized, horizontally centred text objects. The width is
     * measured in the page, so the centring is exact rather than an estimate.
     */
    addAnnotations(items) {
      const api = app();
      if (items.length === 0) return [];
      const view = JSON.parse(api.getViewProperties(1));
      const context = document.createElement('canvas').getContext('2d');
      const taken = new Set(api.getAllObjectNames());
      const created = [];
      for (const item of items) {
        context.font = item.fontPx + 'px geogebra-sans-serif, sans-serif';
        const textWidth = context.measureText(item.text).width;
        const x = view.xMin + ((view.width - textWidth) / 2) * view.invXscale;
        const y = item.role === 'title'
          ? view.yMin + (view.height - item.marginPx) * view.invYscale
          : view.yMin + item.marginPx * view.invYscale;
        let label = item.role === 'title' ? 'dshTitle' : 'dshCaption';
        while (taken.has(label)) label += '_';
        taken.add(label);
        api.evalCommand(label + '=Text(' + JSON.stringify(item.text) + ',(' + x + ',' + y + '))');
        api.setFont(label, item.fontPx, false, false);
        created.push({ label, pixels: item.fontPx });
      }
      return created;
    },
    measure(items) {
      const context = document.createElement('canvas').getContext('2d');
      return items.map(item => {
        context.font = item.size + 'px geogebra-sans-serif, sans-serif';
        return context.measureText(item.text).width;
      });
    },
    /** Apply pixel label offsets through the construction property and draw leader lines. */
    applyLabels(payload) {
      const api = app();
      const view = payload.view;
      const toUser = (x, y) => ({ x: view.xMin + x * view.invXscale, y: view.yMin + (view.height - y) * view.invYscale });
      let applied = 0;
      for (const item of payload.offsets) {
        if (item.dx === 0 && item.dy === 0) continue;
        const xml = stripExpression(api.getXML(item.name));
        if (xml.length === 0) continue;
        const offset = '<labelOffset x="' + item.dx + '" y="' + item.dy + '"/>';
        const patched = /<labelOffset\b/u.test(xml)
          ? xml.replace(/<labelOffset[^>]*\/>/u, offset)
          : xml.replace(/<show[^>]*\/>/u, match => match + '\n\t' + offset);
        api.evalXML(patched);
        applied += 1;
      }
      let leaders = 0;
      for (const leader of payload.leaders) {
        const from = toUser(leader.fromX, leader.fromY);
        const to = toUser(leader.toX, leader.toY);
        // A two-point Polyline is the whole leader: no helper points, so nothing to hide and no
        // stray objects in the saved construction.
        api.evalCommand(leader.segmentName + '=Polyline({(' + from.x + ',' + from.y + '),(' + to.x + ',' + to.y + ')})');
        api.evalCommand('SetLineThickness(' + leader.segmentName + ',1)');
        api.evalCommand('SetColor(' + leader.segmentName + ',0.55,0.55,0.55)');
        leaders += 1;
      }
      return { applied, leaders };
    },
    hideAutomaticLabels() {
      const api = app();
      let hidden = 0;
      for (const name of api.getAllObjectNames()) {
        if (api.getObjectType(name) === 'text') continue;
        if (!api.getLabelVisible(name)) continue;
        api.evalCommand('ShowLabel(' + name + ',false)');
        hidden += 1;
      }
      return hidden;
    },
  };
})()
`

function chromeCandidates(): string[] {
  if (process.platform === 'win32') return [
    process.env.GEOGEBRA_CHROME_PATH,
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter((value): value is string => value !== undefined)
  if (process.platform === 'darwin') return [
    process.env.GEOGEBRA_CHROME_PATH,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ].filter((value): value is string => value !== undefined)
  return [
    process.env.GEOGEBRA_CHROME_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter((value): value is string => value !== undefined)
}

function findChrome(explicit?: string): string {
  if (explicit !== undefined && existsSync(explicit)) return explicit
  const found = chromeCandidates().find(existsSync)
  if (found === undefined) throw new Error('GeoGebra rendering requires Chrome, Chromium, or Edge. Set GEOGEBRA_CHROME_PATH.')
  return found
}

function abortError(): Error {
  const error = new Error('GeoGebra rendering was cancelled')
  error.name = 'AbortError'
  return error
}

async function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw abortError()
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(abortError()) }, { once: true })
  })
}

async function debuggerAddress(profile: string, signal: AbortSignal): Promise<{ port: string; browserPath: string }> {
  const activePort = join(profile, 'DevToolsActivePort')
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (existsSync(activePort)) {
      const [port, browserPath] = (await readFile(activePort, 'utf8')).trim().split(/\r?\n/u)
      if (port !== undefined && browserPath !== undefined) return { port, browserPath }
    }
    await delay(50, signal)
  }
  throw new Error('Chrome DevTools endpoint did not become ready')
}

interface RpcWaiter { resolve(value: unknown): void; reject(error: Error): void }

class CdpClient {
  private nextId = 0
  private readonly pending = new Map<number, RpcWaiter>()
  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: { message?: string } }
      if (message.id === undefined) return
      const waiter = this.pending.get(message.id)
      if (waiter === undefined) return
      this.pending.delete(message.id)
      if (message.error !== undefined) waiter.reject(new Error(message.error.message ?? 'Chrome DevTools error'))
      else waiter.resolve(message.result)
    })
  }

  static async connect(url: string, signal: AbortSignal): Promise<CdpClient> {
    if (signal.aborted) throw abortError()
    const socket = new WebSocket(url)
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => { resolve() }, { once: true })
      socket.addEventListener('error', () => { reject(new Error('Could not connect to Chrome DevTools')) }, { once: true })
      signal.addEventListener('abort', () => { socket.close(); reject(abortError()) }, { once: true })
    })
    return new CdpClient(socket)
  }

  call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = ++this.nextId
    this.socket.send(JSON.stringify({ id, method, params }))
    return new Promise<T>((resolve, reject) => { this.pending.set(id, { resolve: value => { resolve(value as T) }, reject }) })
  }

  async evaluate<T>(expression: string): Promise<T> {
    const response = await this.call<{
      result: { value?: T }
      exceptionDetails?: { text?: string; exception?: { description?: string } }
    }>('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true,
    })
    if (response.exceptionDetails !== undefined) {
      // The description carries the actual page error; text is often just "Uncaught".
      const description = response.exceptionDetails.exception?.description ?? response.exceptionDetails.text
      throw new Error(description ?? 'GeoGebra evaluation failed')
    }
    return response.result.value as T
  }

  close(): void { this.socket.close() }
}

function terminate(processHandle: ChildProcess): void {
  if (processHandle.exitCode !== null) return
  try { processHandle.kill() } catch { /* process already exited */ }
}

interface ScanLabel {
  readonly name: string
  readonly type: string
  readonly text: string
  readonly anchorX: number
  readonly anchorY: number
  readonly userX: number
  readonly userY: number
}

interface ScanResult {
  readonly labels: readonly ScanLabel[]
  readonly view: { readonly xMin: number; readonly yMin: number; readonly invXscale: number; readonly invYscale: number; readonly width: number; readonly height: number }
}

/**
 * Decide the pixel offset of every automatic label.
 *
 * GeoGebra's placement is measured from the exported SVG (so no assumption about its defaults is
 * needed), the drawn geometry becomes the obstacle set, and the result is applied as a
 * `<labelOffset>` construction property, which keeps the labels dynamic and the figure editable.
 */
async function planLabels(
  cdp: CdpClient,
  scan: ScanResult,
  labels: readonly LabelRequest[],
  width: number,
  height: number,
): Promise<{ reports: LabelReport[]; offsets: Array<{ name: string; dx: number; dy: number }>; leaders: Array<{ segmentName: string; fromX: number; fromY: number; toX: number; toY: number }>; conflicts: number }> {
  const svg = await cdp.evaluate<string>('new Promise(resolve => window.ggbApplet.exportSVG(resolve))')
  const textNodes = parseSvgTextNodes(svg)
  const measured = await cdp.evaluate<number[]>(
    `window.__dsh.measure(${JSON.stringify(textNodes.map(node => ({ text: node.content, size: node.size })))})`,
  )
  const clusters = clusterSvgTexts(textNodes, measured)
  const obstacles: LabelPoint[] = parseSvgObstaclePoints(svg)
  const layout = placeLabels({ labels, clusters, obstacles, reservedBoxes: [], frame: { width, height } })

  const byName = new Map(layout.placements.map(placement => [placement.name, placement]))
  const offsets = layout.placements
    .filter(placement => placement.dx !== 0 || placement.dy !== 0)
    .map(placement => ({ name: placement.name, dx: placement.dx, dy: placement.dy }))

  const leaderInput = layout.placements.filter(placement => placement.displaced)
  const taken = new Set(scan.labels.map(label => label.name))
  const leaders: Array<{ segmentName: string; fromX: number; fromY: number; toX: number; toY: number }> = []
  leaderInput.forEach((placement, index) => {
    const request = labels.find(label => label.name === placement.name)
    if (request === undefined) return
    let segmentName = `dshLead_${index + 1}`
    while (taken.has(segmentName)) segmentName += '_'
    taken.add(segmentName)
    const distance = Math.hypot(placement.leader.x - request.anchorX, placement.leader.y - request.anchorY)
    const stub = Math.min(7, distance / 2)
    const ratio = distance === 0 ? 0 : stub / distance
    leaders.push({
      segmentName,
      fromX: request.anchorX + (placement.leader.x - request.anchorX) * ratio,
      fromY: request.anchorY + (placement.leader.y - request.anchorY) * ratio,
      toX: placement.leader.x,
      toY: placement.leader.y,
    })
  })

  const reports: LabelReport[] = scan.labels.map(label => {
    const placement = byName.get(label.name)
    return {
      name: label.name,
      dx: placement?.dx ?? 0,
      dy: placement?.dy ?? 0,
      displaced: placement?.displaced ?? false,
      conflicts: placement?.conflicts ?? 0,
      conflictsBefore: placement?.conflictsBefore ?? 0,
    }
  })
  return { reports, offsets, leaders, conflicts: layout.conflicts }
}

export async function renderGeoGebra(request: GeoGebraRenderRequest): Promise<GeoGebraRenderResult> {
  if ((request.commands === undefined) === (request.ggbBase64 === undefined)) {
    throw new Error('Provide exactly one of commands or ggbBase64')
  }
  // Validate directives before booting the browser so bad input fails fast and offline.
  const prepared = splitFontSizeDirectives(request.commands)
  const labelPlacement = request.labelPlacement ?? 'smart'
  const labelLeaders = request.labelLeaders ?? true
  const root = await mkdtemp(join(tmpdir(), 'dsh-geogebra-'))
  const profile = join(root, 'profile')
  const htmlPath = join(root, 'index.html')
  // The applet is told to fill a frame whose inner box is exactly the requested display size.
  const viewportWidth = request.width + FRAME_BORDER_PX * 2
  const viewportHeight = request.height + FRAME_BORDER_PX * 2
  await writeFile(htmlPath, html(viewportWidth, viewportHeight), 'utf8')
  const chrome = findChrome(request.chromePath)
  const child = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${viewportWidth},${viewportHeight}`,
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true })
  const cancel = (): void => { terminate(child) }
  request.signal.addEventListener('abort', cancel, { once: true })
  let cdp: CdpClient | undefined
  try {
    const { port } = await debuggerAddress(profile, request.signal)
    const targets = await fetch(`http://127.0.0.1:${port}/json`, { signal: request.signal }).then(response => response.json()) as Array<{ type: string; webSocketDebuggerUrl: string }>
    const page = targets.find(target => target.type === 'page')
    if (page === undefined) throw new Error('Chrome did not expose a page target')
    cdp = await CdpClient.connect(page.webSocketDebuggerUrl, request.signal)
    await cdp.call('Runtime.enable')
    // Pin the CSS viewport before the applet boots: --window-size alone yields a smaller viewport
    // (window chrome and display scaling), which silently changes the exported figure size.
    await cdp.call('Page.enable')
    await cdp.call('Emulation.setDeviceMetricsOverride', {
      width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1, mobile: false,
    })
    await cdp.call('Page.navigate', { url: new URL(`file:///${htmlPath.replaceAll('\\', '/')}`).href })
    // The applet script is fetched from geogebra.org on every render, so allow a slow CDN.
    for (let attempt = 0; attempt < 600; attempt += 1) {
      const state = await cdp.evaluate<{ ready: boolean; error: string | null }>('({ ready: window.__ggbReady === true, error: window.__ggbError })')
        .catch(() => ({ ready: false, error: null }))
      if (typeof state.error === 'string' && state.error.length > 0) throw new Error(`GeoGebra page failed: ${state.error}`)
      if (state.ready) break
      if (attempt === 599) throw new Error('GeoGebra applet did not become ready')
      await delay(100, request.signal)
    }
    await cdp.evaluate(`${PAGE_RUNTIME}\ntrue`)
    const dpi = Math.round(BASE_DPI * request.pngScale)
    const view = {
      xMin: request.xMin, xMax: request.xMax, yMin: request.yMin, yMax: request.yMax,
      pngScale: request.pngScale, grid: request.grid, axisNumbers: request.axisNumbers,
      ...(request.axisStep === undefined ? {} : { axisStep: request.axisStep }),
      ...(request.axisLabels === undefined ? {} : { axisLabels: request.axisLabels }),
      ...(request.axisUnits === undefined ? {} : { axisUnits: request.axisUnits }),
    }

    // Step 1: build the construction and validate every command.
    if (request.ggbBase64 !== undefined) {
      await cdp.evaluate(`new Promise(resolve => window.ggbApplet.setBase64(${JSON.stringify(request.ggbBase64)}, resolve))`)
    } else {
      const failures = await cdp.evaluate<Array<{ command: string; reason: string }>>(`window.__dsh.run(${JSON.stringify(prepared.commands ?? [])})`)
      if (failures.length > 0) {
        throw new Error(`GeoGebra rejected ${failures.length} command(s): ${failures.map(failure => `${failure.command} (${failure.reason})`).join('; ')}`)
      }
    }
    await cdp.evaluate(`window.__dsh.applyFonts(${JSON.stringify(prepared.fontSizes)})`)
    await cdp.evaluate(`window.__dsh.applyView(${JSON.stringify(view)})`)

    // Figure title and caption: created before the label engine so labels keep clear of them.
    // The margin keeps the glyph box inside the frame: ascent above the baseline for the title,
    // descent below it for the caption.
    const annotationItems = [
      ...(request.title === undefined
        ? []
        : [{
          role: 'title', text: request.title.text, fontPx: request.title.fontPx ?? TITLE_FONT_PX,
          marginPx: Math.round((request.title.fontPx ?? TITLE_FONT_PX) * 0.9) + 4,
        }]),
      ...(request.caption === undefined
        ? []
        : [{
          role: 'caption', text: request.caption.text, fontPx: request.caption.fontPx ?? CAPTION_FONT_PX,
          marginPx: Math.round((request.caption.fontPx ?? CAPTION_FONT_PX) * 0.5) + 4,
        }]),
    ]
    const annotationFonts = await cdp.evaluate<FontSizeDirective[]>(`window.__dsh.addAnnotations(${JSON.stringify(annotationItems)})`)
    const textFontSizes = [...prepared.fontSizes, ...annotationFonts]

    // Step 2: apply the requested label/tick font size. GeoGebra stores it in the GUI font, which
    // only a reload honours, so text sizes are re-applied afterwards.
    let effectiveLabelFont = await cdp.evaluate<number>(`window.__dsh.effectiveLabelFont(${DEFAULT_LABEL_FONT_PX})`)
    if (request.labelFontPx !== undefined && Math.round(request.labelFontPx) !== effectiveLabelFont) {
      const textFonts = await cdp.evaluate<FontSizeDirective[]>('window.__dsh.snapshotTextFonts()')
      const current = await cdp.evaluate<string>('new Promise(resolve => window.ggbApplet.getBase64(resolve))')
      const patched = patchGgbLabelFont(current, request.labelFontPx)
      await cdp.evaluate(`new Promise(resolve => window.ggbApplet.setBase64(${JSON.stringify(patched)}, resolve))`)
      await cdp.evaluate(`window.__dsh.applyFonts(${JSON.stringify([...textFonts, ...textFontSizes])})`)
      await cdp.evaluate(`window.__dsh.applyView(${JSON.stringify(view)})`)
      effectiveLabelFont = await cdp.evaluate<number>(`window.__dsh.effectiveLabelFont(${DEFAULT_LABEL_FONT_PX})`)
    }

    let labelReports: LabelReport[] | undefined
    let labelConflicts: number | undefined
    if (labelPlacement === 'off') {
      await cdp.evaluate('window.__dsh.hideAutomaticLabels()')
    } else if (labelPlacement === 'smart') {
      const scan = await cdp.evaluate<ScanResult>('window.__dsh.scanLabels()')
      if (scan.labels.length > 0) {
        const requests: LabelRequest[] = scan.labels.map(label => ({
          name: label.name, text: label.text, fontPx: effectiveLabelFont,
          anchorX: label.anchorX, anchorY: label.anchorY,
        }))
        const plan = await planLabels(cdp, scan, requests, request.width, request.height)
        await cdp.evaluate<{ applied: number; leaders: number }>(
          `window.__dsh.applyLabels(${JSON.stringify({ view: scan.view, offsets: plan.offsets, leaders: labelLeaders ? plan.leaders : [] })})`,
        )
        labelReports = plan.reports
        labelConflicts = plan.conflicts
      } else {
        labelReports = []
        labelConflicts = 0
      }
    }

    // Step 3: export.
    const rendered = await cdp.evaluate<{ objects: string[]; version: string; outputs: Partial<Record<GeoGebraFormat, string>> }>(`(() => {
      const api = window.ggbApplet;
      const formats = ${JSON.stringify(request.formats)};
      const outputs = {};
      if (formats.includes('png')) outputs.png = api.getPNGBase64(${request.pngScale}, ${request.transparent}, ${dpi});
      const pending = [];
      if (formats.includes('svg')) pending.push(new Promise(resolve => api.exportSVG(resolve)).then(value => { outputs.svg = value; }));
      if (formats.includes('ggb')) pending.push(new Promise(resolve => api.getBase64(resolve)).then(value => { outputs.ggb = value; }));
      return Promise.all(pending).then(() => ({ objects: api.getAllObjectNames(), version: api.getVersion(), outputs }));
    })()`)
    const rawGgb = rendered.outputs.ggb
    const outputs = rawGgb === undefined || textFontSizes.length === 0
      ? { ...rendered.outputs }
      : { ...rendered.outputs, ggb: persistGgbFontSizes(rawGgb, textFontSizes) }
    const rawSvg = outputs.svg
    if (rawSvg !== undefined) outputs.svg = withViewBox(rawSvg, request.width, request.height)
    const rawPng = outputs.png
    return {
      objects: rendered.objects,
      version: rendered.version,
      display: { width: request.width, height: request.height },
      ...(rawPng === undefined ? {} : { png: pngMetadata(rawPng) }),
      ...(textFontSizes.length === 0
        ? {}
        : { minFontPx: Math.min(...textFontSizes.map(directive => directive.pixels)) }),
      labelFontPx: effectiveLabelFont,
      ...(labelReports === undefined ? {} : { labels: labelReports }),
      ...(labelConflicts === undefined ? {} : { labelConflicts }),
      outputs,
    }
  } finally {
    request.signal.removeEventListener('abort', cancel)
    if (cdp !== undefined) {
      try { await cdp.call('Browser.close') } catch { /* browser may already be gone */ }
      cdp.close()
    }
    terminate(child)
    await new Promise<void>((resolve) => {
      if (child.exitCode !== null) { resolve(); return }
      const timer = setTimeout(resolve, 2_000)
      child.once('exit', () => { clearTimeout(timer); resolve() })
    })
    await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
  }
}
