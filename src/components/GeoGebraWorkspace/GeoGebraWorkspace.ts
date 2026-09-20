import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { GeoGebraWorkspaceProps } from './GeoGebraWorkspace.api.ts'
import {
  AUTOSAVE_DELAY_MS,
  GEOGEBRA_SCRIPT_URL,
  RESTORE_TIMEOUT_MS,
  SCRIPT_LOAD_TIMEOUT_MS,
  STORAGE_PREFIX,
  UPDATE_COALESCE_MS,
  type AppletStatus,
  type GeoGebraApi,
  type GeoGebraObject,
} from './GeoGebraWorkspace.data.ts'

let scriptPromise: Promise<void> | undefined

const PNG_EXPORT_SCALE = 2
const BASE_DPI = 96

function loadGeoGebraScript(): Promise<void> {
  if (window.GGBApplet !== undefined) return Promise.resolve()
  if (scriptPromise !== undefined) return scriptPromise
  const pending = new Promise<void>((resolve, reject) => {
    // A tag whose load/error already fired never fires again, so a retry has to inject a fresh one:
    // reusing the old element would leave this promise pending forever and the pane stuck on its
    // spinner with no way back. A deadline covers a request that neither loads nor errors.
    for (const stale of document.querySelectorAll('script[data-geogebra-pic="true"]')) stale.remove()
    const script = document.createElement('script')
    const settle = (action: () => void): void => { clearTimeout(timer); action() }
    const timer = setTimeout(() => {
      settle(() => { reject(new Error('GeoGebra script load timed out')) })
    }, SCRIPT_LOAD_TIMEOUT_MS)
    script.addEventListener('load', () => {
      settle(() => {
        if (window.GGBApplet !== undefined) resolve()
        else reject(new Error('GeoGebra constructor was not exposed'))
      })
    }, { once: true })
    script.addEventListener('error', () => { settle(() => { reject(new Error('GeoGebra script failed to load')) }) }, { once: true })
    script.src = GEOGEBRA_SCRIPT_URL
    script.async = true
    script.dataset.geogebraPic = 'true'
    document.head.append(script)
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
    let restoreTimer: ReturnType<typeof setTimeout> | undefined
    let coalesceTimer: ReturnType<typeof setTimeout> | undefined
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
          // Update events fire continuously while a point is dragged, and each rebuild costs an
          // applet call per object plus a full re-render, so a large construction would freeze the
          // pane. Coalesce them into one rebuild per quiet interval.
          const changed = (): void => {
            if (coalesceTimer !== undefined) clearTimeout(coalesceTimer)
            coalesceTimer = setTimeout(() => {
              coalesceTimer = undefined
              if (disposed) return
              syncObjects()
              saveConstruction()
            }, UPDATE_COALESCE_MS)
          }
          listeners = { add: changed, remove: changed, update: changed }
          api.registerAddListener(listeners.add)
          api.registerRemoveListener(listeners.remove)
          api.registerUpdateListener(listeners.update)
          const ready = (): void => {
            if (disposed) return
            syncObjects()
            setStatus('ready')
          }
          const saved = window.localStorage.getItem(`${STORAGE_PREFIX}${persistenceKey}`)
          if (saved === null) {
            ready()
          } else {
            // Error dialogs are off, so a corrupt or truncated construction can leave GeoGebra
            // without ever invoking the callback: reach 'ready' on a deadline instead of pinning
            // the spinner forever with no reachable retry button.
            restoreTimer = setTimeout(() => { restoreTimer = undefined; ready() }, RESTORE_TIMEOUT_MS)
            const restored = (): void => {
              if (restoreTimer !== undefined) { clearTimeout(restoreTimer); restoreTimer = undefined }
              ready()
            }
            try {
              api.setBase64(saved, restored)
            } catch (error) {
              console.warn('GeoGebra restore failed:', error)
              restored()
            }
          }
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
      if (restoreTimer !== undefined) clearTimeout(restoreTimer)
      if (coalesceTimer !== undefined) clearTimeout(coalesceTimer)
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
    // DPI tracks the raster multiplier so the download keeps the on-screen physical size.
    const value = apiRef.current?.getPNGBase64(PNG_EXPORT_SCALE, false, BASE_DPI * PNG_EXPORT_SCALE)
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
