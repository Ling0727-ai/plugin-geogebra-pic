import {
  IconChevronLeftOutline14,
  IconChevronRightOutline14,
  IconCodeOutline16,
  IconDownloadOutline16,
  IconFolderOpenOutline16,
  IconFullscreenOutline16,
  IconPanelLeftOutline16,
  IconPlayOutline16,
  IconRefreshOutline16,
  IconTrashOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ReactNode } from 'react'
import { useGeoGebraWorkspace } from './GeoGebraWorkspace.ts'
import type { GeoGebraWorkspaceProps } from './GeoGebraWorkspace.api.ts'
import { EXAMPLES } from './GeoGebraWorkspace.data.ts'
import css from './GeoGebraWorkspace.module.css'

export function GeoGebraWorkspace(props: GeoGebraWorkspaceProps): ReactNode {
  const { tab } = props.useTabInfo()
  const workspace = useGeoGebraWorkspace(tab.id, props.t)
  const disabled = workspace.status !== 'ready'

  return (
    <div ref={workspace.rootRef} className={css.root} data-geogebra-workspace>
      <header className={css.toolbar}>
        <div className={css.status} data-status={workspace.status}>
          <span className={css.statusDot} aria-hidden />
          <span>{props.t(`status.${workspace.status}`)}</span>
        </div>
        <div className={css.toolbarGroup}>
          <label className={css.switchControl} title={props.t('toolbar.grid')}>
            <input type="checkbox" checked={workspace.gridVisible} disabled={disabled} onChange={workspace.toggleGrid} />
            <span className={css.switchTrack} aria-hidden />
            <span>{props.t('toolbar.grid')}</span>
          </label>
          <label className={css.switchControl} title={props.t('toolbar.axes')}>
            <input type="checkbox" checked={workspace.axesVisible} disabled={disabled} onChange={workspace.toggleAxes} />
            <span className={css.switchTrack} aria-hidden />
            <span>{props.t('toolbar.axes')}</span>
          </label>
        </div>
        <div className={`${css.toolbarGroup} ${css.toolbarActions}`}>
          <button type="button" className={css.iconButton} disabled={disabled} onClick={workspace.undo} title={props.t('toolbar.undo')} aria-label={props.t('toolbar.undo')}><IconChevronLeftOutline14 /></button>
          <button type="button" className={css.iconButton} disabled={disabled} onClick={workspace.redo} title={props.t('toolbar.redo')} aria-label={props.t('toolbar.redo')}><IconChevronRightOutline14 /></button>
          <button type="button" className={`${css.iconButton} ${workspace.panelOpen ? css.activeButton : ''}`} onClick={() => { workspace.setPanelOpen(!workspace.panelOpen) }} title={props.t('toolbar.panel')} aria-label={props.t('toolbar.panel')} aria-pressed={workspace.panelOpen}><IconPanelLeftOutline16 /></button>
          <label className={`${css.iconButton} ${disabled ? css.disabledButton : ''}`} title={props.t('toolbar.import')}>
            <IconFolderOpenOutline16 />
            <span className={css.srOnly}>{props.t('toolbar.import')}</span>
            <input type="file" accept=".ggb,application/vnd.geogebra.file" disabled={disabled} onChange={workspace.importGgb} />
          </label>
          <button type="button" className={css.iconButton} disabled={disabled} onClick={workspace.exportGgb} title={props.t('toolbar.exportGgb')} aria-label={props.t('toolbar.exportGgb')}><IconDownloadOutline16 /></button>
          <button type="button" className={css.textButton} disabled={disabled} onClick={workspace.exportPng} title={props.t('toolbar.exportPng')}>PNG</button>
          <button type="button" className={css.textButton} disabled={disabled} onClick={workspace.exportSvg} title={props.t('toolbar.exportSvg')}>SVG</button>
          <button type="button" className={css.iconButton} onClick={workspace.toggleFullscreen} title={props.t('toolbar.fullscreen')} aria-label={props.t('toolbar.fullscreen')}><IconFullscreenOutline16 /></button>
          <button type="button" className={`${css.iconButton} ${css.dangerButton}`} disabled={disabled} onClick={workspace.clear} title={props.t('toolbar.clear')} aria-label={props.t('toolbar.clear')}><IconTrashOutline16 /></button>
        </div>
      </header>

      <div className={css.workArea}>
        <main className={css.canvasArea}>
          <div ref={workspace.appletHostRef} className={css.appletHost} />
          {workspace.status !== 'ready' && (
            <div className={css.appletState} role="status">
              {workspace.status === 'loading'
                ? <><span className={css.spinner} aria-hidden /><span>{props.t('status.loading')}</span></>
                : <><span>{props.t('status.error')}</span><button type="button" className={css.retryButton} onClick={workspace.retry}><IconRefreshOutline16 />{props.t('applet.retry')}</button></>}
            </div>
          )}
        </main>

        {workspace.panelOpen && (
          <aside className={css.panel}>
            <section className={css.panelSection}>
              <h2>{props.t('panel.objects')} <span>{workspace.objects.length}</span></h2>
              <div className={css.objectList}>
                {workspace.objects.length === 0
                  ? <p className={css.emptyState}>{props.t('panel.empty')}</p>
                  : workspace.objects.map(object => (
                    <div className={css.objectRow} key={object.name}>
                      <span className={css.objectColor} style={{ backgroundColor: object.color }} aria-hidden />
                      <div className={css.objectText}>
                        <strong>{object.name}</strong>
                        <span title={object.definition}>{object.definition}</span>
                      </div>
                      <label className={css.visibilityToggle} title={props.t(object.visible ? 'object.hide' : 'object.show')}>
                        <input type="checkbox" checked={object.visible} onChange={() => { workspace.toggleObject(object.name, object.visible) }} />
                        <span aria-hidden />
                      </label>
                      <button type="button" className={css.rowAction} onClick={() => { workspace.deleteObject(object.name) }} title={props.t('object.delete')} aria-label={`${props.t('object.delete')} ${object.name}`}><IconTrashOutline16 /></button>
                    </div>
                  ))}
              </div>
            </section>
            <section className={css.panelSection}>
              <h2>{props.t('panel.examples')}</h2>
              <div className={css.examples}>
                {EXAMPLES.map(example => (
                  <button type="button" key={example.id} onClick={() => { workspace.runCommandValue(example.command) }} disabled={disabled}>
                    <IconCodeOutline16 />
                    <span>{props.t(example.labelKey)}</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        )}
      </div>

      <form className={css.commandBar} onSubmit={workspace.submitCommand}>
        <IconCodeOutline16 />
        <label className={css.srOnly} htmlFor={`geogebra-command-${tab.id}`}>{props.t('command.label')}</label>
        <input
          id={`geogebra-command-${tab.id}`}
          value={workspace.command}
          disabled={disabled}
          spellCheck={false}
          placeholder={props.t('command.placeholder')}
          aria-invalid={workspace.commandError !== undefined}
          onChange={(event) => { workspace.setCommand(event.currentTarget.value); if (workspace.commandError !== undefined) workspace.setCommandError?.(undefined) }}
        />
        <button type="submit" disabled={disabled || workspace.command.trim().length === 0} title={props.t('command.run')} aria-label={props.t('command.run')}><IconPlayOutline16 /></button>
        {workspace.commandError !== undefined && <div className={css.commandError} role="alert">{workspace.commandError}</div>}
      </form>
    </div>
  )
}
