import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn, type ChildProcess } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

export type GeoGebraFormat = 'png' | 'svg' | 'ggb'

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
  readonly signal: AbortSignal
  readonly chromePath?: string
}

export interface GeoGebraRenderResult {
  readonly objects: readonly string[]
  readonly version: string
  readonly outputs: Partial<Record<GeoGebraFormat, string>>
}

interface FontSizeDirective {
  readonly label: string
  readonly pixels: number
}

const FONT_SIZE_DIRECTIVE = /^\s*SetFontSize\(\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*(\d+(?:\.\d+)?)\s*\)\s*$/u
const MIN_TEXT_SIZE_PX = 10
const MAX_TEXT_SIZE_PX = 48

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

function persistGgbFontSizes(base64: string, directives: readonly FontSizeDirective[]): string {
  if (directives.length === 0) return base64
  const archive = unzipSync(Buffer.from(base64, 'base64'))
  const xmlBytes = archive['geogebra.xml']
  if (xmlBytes === undefined) throw new Error('GeoGebra GGB output is missing geogebra.xml')
  let xml = strFromU8(xmlBytes)
  for (const directive of directives) {
    const elementPattern = new RegExp(`(<element\\s+type="text"\\s+label="${directive.label}"[^>]*>)([\\s\\S]*?)(</element>)`, 'u')
    const match = elementPattern.exec(xml)
    if (match === null || match[1] === undefined || match[2] === undefined || match[3] === undefined) {
      throw new Error(`SetFontSize target is not a persisted text object: ${directive.label}`)
    }
    const multiplier = Math.round((directive.pixels / 16) * 10000) / 10000
    const font = `<font serif="false" sizeM="${multiplier}" size="0" style="0"/>`
    const body = /<font\b[^>]*\/>/u.test(match[2])
      ? match[2].replace(/<font\b[^>]*\/>/u, font)
      : `${match[2]}\t${font}\n`
    xml = xml.replace(elementPattern, `${match[1]}${body}${match[3]}`)
  }
  archive['geogebra.xml'] = strToU8(xml)
  return Buffer.from(zipSync(archive, { level: 6 })).toString('base64')
}

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>html,body,#app{width:100%;height:100%;margin:0;overflow:hidden}</style>
<script src="https://www.geogebra.org/apps/deployggb.js"></script></head>
<body><div id="app"></div><script>
window.__ggbError = null;
window.addEventListener('error', event => { window.__ggbError = event.message || 'page error'; });
function boot() {
  if (typeof GGBApplet !== 'function') { setTimeout(boot, 50); return; }
  const applet = new GGBApplet({ appName:'classic', width:1200, height:800, showToolBar:false,
    showMenuBar:false, showAlgebraInput:false, showResetIcon:false, showZoomButtons:false,
    enableRightClick:false, language:'en', appletOnLoad(api) { window.ggbApplet = api; window.__ggbReady = true; } }, true);
  applet.inject('app');
}
boot();
</script></body></html>`

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
    const response = await this.call<{ result: { value?: T }; exceptionDetails?: { text?: string } }>('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true,
    })
    if (response.exceptionDetails !== undefined) throw new Error(response.exceptionDetails.text ?? 'GeoGebra evaluation failed')
    return response.result.value as T
  }

  close(): void { this.socket.close() }
}

function terminate(processHandle: ChildProcess): void {
  if (processHandle.exitCode !== null) return
  try { processHandle.kill() } catch { /* process already exited */ }
}

export async function renderGeoGebra(request: GeoGebraRenderRequest): Promise<GeoGebraRenderResult> {
  if ((request.commands === undefined) === (request.ggbBase64 === undefined)) {
    throw new Error('Provide exactly one of commands or ggbBase64')
  }
  const root = await mkdtemp(join(tmpdir(), 'dsh-geogebra-'))
  const profile = join(root, 'profile')
  const htmlPath = join(root, 'index.html')
  await writeFile(htmlPath, HTML, 'utf8')
  const chrome = findChrome(request.chromePath)
  const child = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${request.width},${request.height}`,
    new URL(`file:///${htmlPath.replaceAll('\\', '/')}`).href,
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
    for (let attempt = 0; attempt < 300; attempt += 1) {
      const state = await cdp.evaluate<{ ready: boolean; error: string | null }>('({ ready: window.__ggbReady === true, error: window.__ggbError })')
      if (typeof state.error === 'string' && state.error.length > 0) throw new Error(`GeoGebra page failed: ${state.error}`)
      if (state.ready) break
      if (attempt === 299) throw new Error('GeoGebra applet did not become ready')
      await delay(100, request.signal)
    }
    const prepared = splitFontSizeDirectives(request.commands)
    const payload = JSON.stringify({
      commands: prepared.commands,
      fontSizes: prepared.fontSizes,
      ggbBase64: request.ggbBase64,
      formats: request.formats,
      view: [request.xMin, request.xMax, request.yMin, request.yMax],
      pngScale: request.pngScale,
      transparent: request.transparent,
    })
    const rendered = await cdp.evaluate<GeoGebraRenderResult>(`(async () => {
      const input = ${payload}; const api = window.ggbApplet;
      api.setErrorDialogsActive(false);
      if (input.ggbBase64) await new Promise(resolve => api.setBase64(input.ggbBase64, resolve));
      else { const result = api.evalCommand(input.commands.join('\\n')); if (result === false) throw new Error('GeoGebra rejected one or more commands'); }
      for (const directive of input.fontSizes) {
        if (api.getObjectType(directive.label) !== 'text') throw new Error('SetFontSize target is not a text object: ' + directive.label);
        api.setFont(directive.label, directive.pixels, false, false);
        const multiplier = Math.round((directive.pixels / 16) * 10000) / 10000;
        if (!api.getXML(directive.label).includes('sizeM="' + multiplier + '"')) throw new Error('SetFontSize did not persist for ' + directive.label);
      }
      api.setCoordSystem(...input.view); api.setUndoPoint();
      const outputs = {};
      if (input.formats.includes('png')) outputs.png = api.getPNGBase64(input.pngScale, input.transparent, 180);
      if (input.formats.includes('svg')) outputs.svg = await new Promise(resolve => api.exportSVG(resolve));
      if (input.formats.includes('ggb')) outputs.ggb = await new Promise(resolve => api.getBase64(resolve));
      return { objects: api.getAllObjectNames(), version: api.getVersion(), outputs };
    })()`)
    const rawGgb = rendered.outputs.ggb
    if (rawGgb === undefined || prepared.fontSizes.length === 0) return rendered
    return {
      ...rendered,
      outputs: { ...rendered.outputs, ggb: persistGgbFontSizes(rawGgb, prepared.fontSizes) },
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
