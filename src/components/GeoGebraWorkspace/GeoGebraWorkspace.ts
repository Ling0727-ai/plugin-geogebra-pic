import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { GeoGebraWorkspaceProps } from './GeoGebraWorkspace.api.ts'
import {
  AUTOSAVE_DELAY_MS,
  GEOGEBRA_SCRIPT_URL,
  STORAGE_PREFIX,
  type AppletStatus,
  type GeoGebraApi,
  type GeoGebraObject,
} from './GeoGebraWorkspace.data.ts'

let scriptPromise: Promise<void> | undefined

function loadGeoGebraScript(): Promise<void> {
  if (window.GGBApplet !== undefined) return Promise.resolve()
  if (scriptPromise !== undefined) return scriptPromise
  const pending = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GEOGEBRA_SCRIPT_URL}"]`)
    const script = existing ?? document.createElement('script')
    const loaded = (): void => {
      if (window.GGBApplet !== undefined) resolve()
      else reject(new Error('GeoGebra constructor was not exposed'))
    }
    script.addEventListener('load', loaded, { once: true })
    script.addEventListener('error', () => { reject(new Error('GeoGebra script failed to load')) }, { once: true })
    if (existing === null) {
      script.src = GEOGEBRA_SCRIPT_URL
      script.async = true
      script.dataset.geogebraPic = 'true'
      document.head.append(script)
    }
  }).catch((error: unknown) => {
    scriptPromise = undefined
    throw error
  })
  scriptPromise = pending
  return pending
}

function downloadBase64(filename: string, mime: string, value: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = value.startsWith('data:') ? value : `data:${mime};base64,${value}`
  link.click()
}

function downloadText(filename: string, mime: string, value: string): void {
  const url = URL.createObjectURL(new Blob([value], { type: mime }))
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result.split(',')[1] : undefined
      if (value === undefined) reject(new Error('FileReader returned no data'))
      else resolve(value)
    }
    reader.onerror = () => { reject(reader.error ?? new Error('FileReader failed')) }
    reader.readAsDataURL(file)
  })
}

export function useGeoGebraWorkspace(
  persistenceKey: string,
  t: GeoGebraWorkspaceProps['t'],
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const appletHostRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<GeoGebraApi>()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [status, setStatus] = useState<AppletStatus>('loading')
  const [objects, setObjects] = useState<readonly GeoGebraObject[]>([])
  const [command, setCommand] = useState('')
  const [commandError, setCommandError] = useState<string>()
  const [panelOpen, setPanelOpen] = useState(false)
  const [gridVisible, setGridVisibleState] = useState(true)
  const [axesVisible, setAxesVisibleState] = useState(true)
  const [generation, setGeneration] = useState(0)

  const syncObjects = useCallback(() => {
    const api = apiRef.current
    if (api === undefined) return
    const next = api.getAllObjectNames().map((name): GeoGebraObject => ({
      name,
      type: api.getObjectType(name),
      definition: api.getDefinitionString(name, true) || name,
      color: api.getColor(name),
      visible: api.getVisible(name),
    }))
    setObjects(next)
  }, [])

  const saveConstruction = useCallback(() => {
    const api = apiRef.current
    if (api === undefined) return
    if (saveTimerRef.current !== undefined) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      api.getBase64((value) => {
        try { window.localStorage.setItem(`${STORAGE_PREFIX}${persistenceKey}`, value) }
        catch (error) { console.warn('GeoGebra autosave failed:', error) }
      })
    }, AUTOSAVE_DELAY_MS)
  }, [persistenceKey])

  useEffect(() => {
    const host = appletHostRef.current
    if (host === null) return
    let disposed = false
    let resizeObserver: ResizeObserver | undefined
    let listeners: { add: (name: string) => void; remove: (name: string) => void; update: (name: string) => void } | undefined
    setStatus('loading')
    host.replaceChildren()

    void loadGeoGebraScript().then(() => {
      if (disposed || window.GGBApplet === undefined) return
      const width = Math.max(320, host.clientWidth)
      const height = Math.max(360, host.clientHeight)
      const applet = new window.GGBApplet({
        appName: 'classic',
        width,
        height,
        showToolBar: true,
        showMenuBar: false,
        showAlgebraInput: false,
        showResetIcon: false,
        showZoomButtons: true,
        showFullscreenButton: false,
        enableRightClick: true,
        enableLabelDrags: true,
        enableShiftDragZoom: true,
        allowStyleBar: true,
        language: 'zh',
        appletOnLoad: (api: GeoGebraApi) => {
          if (disposed) { api.remove(); return }
          apiRef.current = api
          api.setErrorDialogsActive(false)
          api.enableShiftDragZoom(true)
          api.setGridVisible(1, true)
          api.setAxesVisible(true, true)
          const changed = (): void => { syncObjects(); saveConstruction() }
          listeners = { add: changed, remove: changed, update: changed }
          api.registerAddListener(listeners.add)
          api.registerRemoveListener(listeners.remove)
          api.registerUpdateListener(listeners.update)
          const ready = (): void => { syncObjects(); setStatus('ready') }
          const saved = window.localStorage.getItem(`${STORAGE_PREFIX}${persistenceKey}`)
          if (saved !== null) api.setBase64(saved, ready)
          else ready()
          resizeObserver = new ResizeObserver(() => {
            if (host.clientWidth > 0 && host.clientHeight > 0) api.setSize(host.clientWidth, host.clientHeight)
          })
          resizeObserver.observe(host)
        },
      }, true)
      applet.inject(host)
    }).catch((error) => {
      console.error('GeoGebra load failed:', error)
      if (!disposed) setStatus('error')
    })

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      if (saveTimerRef.current !== undefined) clearTimeout(saveTimerRef.current)
      const api = apiRef.current
      if (api !== undefined && listeners !== undefined) {
        api.unregisterAddListener(listeners.add)
        api.unregisterRemoveListener(listeners.remove)
        api.unregisterUpdateListener(listeners.update)
      }
      api?.remove()
      apiRef.current = undefined
    }
  }, [generation, persistenceKey, saveConstruction, syncObjects])

  const runCommandValue = useCallback((value: string) => {
    const api = apiRef.current
    const source = value.trim()
    if (api === undefined || source.length === 0) return false
    try {
      const result = api.evalCommand(source)
      if (result === false) throw new Error('evalCommand returned false')
      api.setUndoPoint()
      setCommandError(undefined)
      syncObjects()
      saveConstruction()
      return true
    } catch {
      setCommandError(t('command.failed'))
      return false
    }
  }, [saveConstruction, syncObjects, t])

  const submitCommand = useCallback((event: FormEvent) => {
    event.preventDefault()
    if (runCommandValue(command)) setCommand('')
  }, [command, runCommandValue])

  const toggleGrid = useCallback(() => {
    const next = !gridVisible
    setGridVisibleState(next)
    apiRef.current?.setGridVisible(1, next)
  }, [gridVisible])

  const toggleAxes = useCallback(() => {
    const next = !axesVisible
    setAxesVisibleState(next)
    apiRef.current?.setAxesVisible(next, next)
  }, [axesVisible])

  const undo = useCallback(() => { apiRef.current?.undo(); syncObjects(); saveConstruction() }, [saveConstruction, syncObjects])
  const redo = useCallback(() => { apiRef.current?.redo(); syncObjects(); saveConstruction() }, [saveConstruction, syncObjects])
  const clear = useCallback(() => {
    const api = apiRef.current
    if (api === undefined || !window.confirm(t('toolbar.clearConfirm'))) return
    api.setUndoPoint()
    api.newConstruction()
    syncObjects()
    saveConstruction()
  }, [saveConstruction, syncObjects, t])
  const toggleObject = useCallback((name: string, visible: boolean) => {
    apiRef.current?.setVisible(name, !visible)
    syncObjects()
    saveConstruction()
  }, [saveConstruction, syncObjects])
  const deleteObject = useCallback((name: string) => {
    apiRef.current?.deleteObject(name)
    apiRef.current?.setUndoPoint()
    syncObjects()
    saveConstruction()
  }, [saveConstruction, syncObjects])
  const exportPng = useCallback(() => {
    const value = apiRef.current?.getPNGBase64(2, false, 180)
    if (value !== undefined) downloadBase64('geogebra-drawing.png', 'image/png', value)
  }, [])
  const exportSvg = useCallback(() => {
    apiRef.current?.exportSVG(svg => { downloadText('geogebra-drawing.svg', 'image/svg+xml;charset=utf-8', svg) })
  }, [])
  const exportGgb = useCallback(() => {
    apiRef.current?.getBase64(value => { downloadBase64('geogebra-drawing.ggb', 'application/vnd.geogebra.file', value) })
  }, [])
  const importGgb = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file === undefined || apiRef.current === undefined) return
    try {
      const value = await fileBase64(file)
      apiRef.current.setBase64(value, () => { syncObjects(); saveConstruction() })
      setCommandError(undefined)
    } catch {
      setCommandError(t('import.failed'))
    }
  }, [saveConstruction, syncObjects, t])
  const toggleFullscreen = useCallback(() => {
    const root = rootRef.current
    if (root === null) return
    if (document.fullscreenElement === root) void document.exitFullscreen()
    else void root.requestFullscreen()
  }, [])

  return {
    rootRef,
    appletHostRef,
    status,
    objects,
    command,
    commandError,
    panelOpen,
    gridVisible,
    axesVisible,
    setCommand,
    setCommandError,
    setPanelOpen,
    submitCommand,
    runCommandValue,
    toggleGrid,
    toggleAxes,
    undo,
    redo,
    clear,
    toggleObject,
    deleteObject,
    exportPng,
    exportSvg,
    exportGgb,
    importGgb,
    toggleFullscreen,
    retry: () => { setGeneration(value => value + 1) },
  }
}
