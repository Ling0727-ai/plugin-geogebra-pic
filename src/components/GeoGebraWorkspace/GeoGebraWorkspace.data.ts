export const GEOGEBRA_SCRIPT_URL = 'https://www.geogebra.org/apps/deployggb.js'
export const STORAGE_PREFIX = 'dsh-geogebra-pic:'
export const AUTOSAVE_DELAY_MS = 500

export const EXAMPLES = [
  { id: 'function', labelKey: 'example.function', command: 'f(x) = sin(x)' },
  { id: 'circle', labelKey: 'example.circle', command: 'A = (0, 0)\nc = Circle(A, 3)\nB = Point(c)\nt = Tangent(B, c)' },
  { id: 'triangle', labelKey: 'example.triangle', command: 'A = (-3, -1)\nB = (3, -1)\nC = (1, 3)\np = Polygon(A, B, C)\nc = Circumcircle(A, B, C)' },
  { id: 'slider', labelKey: 'example.slider', command: 'a = Slider(-5, 5, 0.1)\nf(x) = a sin(x)' },
] as const

export interface GeoGebraObject {
  readonly name: string
  readonly type: string
  readonly definition: string
  readonly color: string
  readonly visible: boolean
}

export type AppletStatus = 'loading' | 'ready' | 'error'

export interface GeoGebraApi {
  evalCommand(command: string): boolean | string
  setUndoPoint(): void
  undo(): void
  redo(): void
  newConstruction(): void
  remove(): void
  setSize(width: number, height: number): void
  setGridVisible(view: number, visible: boolean): void
  setAxesVisible(xAxis: boolean, yAxis: boolean): void
  setErrorDialogsActive(active: boolean): void
  enableShiftDragZoom(active: boolean): void
  getAllObjectNames(): string[]
  getObjectType(name: string): string
  getDefinitionString(name: string, substituteNumbers?: boolean): string
  getColor(name: string): string
  getVisible(name: string): boolean
  setVisible(name: string, visible: boolean): void
  deleteObject(name: string): void
  getPNGBase64(scale: number, transparent: boolean, dpi?: number): string
  exportSVG(callback: (svg: string) => void): void
  getBase64(callback: (value: string) => void): void
  setBase64(value: string, callback?: () => void): void
  registerAddListener(listener: (name: string) => void): void
  registerRemoveListener(listener: (name: string) => void): void
  registerUpdateListener(listener: (name: string) => void): void
  unregisterAddListener(listener: (name: string) => void): void
  unregisterRemoveListener(listener: (name: string) => void): void
  unregisterUpdateListener(listener: (name: string) => void): void
}

export interface GGBAppletInstance {
  inject(target: HTMLElement | string): void
}

export interface GGBAppletConstructor {
  new(parameters: Record<string, unknown>, html5?: boolean): GGBAppletInstance
}

declare global {
  interface Window {
    GGBApplet?: GGBAppletConstructor
  }
}
