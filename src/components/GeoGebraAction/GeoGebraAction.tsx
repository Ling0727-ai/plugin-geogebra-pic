import { IconDataOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ReactNode } from 'react'
import { useGeoGebraAction } from './GeoGebraAction.ts'
import type { GeoGebraActionProps } from './GeoGebraAction.api.ts'
import css from './GeoGebraAction.module.css'

export function GeoGebraAction(props: GeoGebraActionProps): ReactNode {
  const open = useGeoGebraAction(props)
  return (
    <div className={css.root} data-geogebra-action>
      <button type="button" className={css.trigger} onClick={open} title={props.t('action.open')}>
        <IconDataOutline16 size={14} />
        <span>{props.t('type.label')}</span>
      </button>
    </div>
  )
}
