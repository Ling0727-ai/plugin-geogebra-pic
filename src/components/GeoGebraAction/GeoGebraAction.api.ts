import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { GeoGebraActionInjected } from './GeoGebraAction.data.ts'

export type GeoGebraActionProps = PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<'geoGebraPic'>
  & InjectFace<GeoGebraActionInjected>
