import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { GeoGebraAction } from '../components/GeoGebraAction/GeoGebraAction.tsx'
import { GeoGebraWorkspace } from '../components/GeoGebraWorkspace/GeoGebraWorkspace.tsx'
import { GEOGEBRA_ID, GEOGEBRA_KIND, geoGebraDefinition } from './definition.tsx'
import { en, NS, zh, type GeoGebraPicKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    geoGebraPic: GeoGebraPicKey
  }
}

export const inject = ['slots', 'locale', 'sidebarRight', 'sidebarRightTabs']

export function apply(ctx: Context): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'geogebra-pic: dictionaries')
  ctx.effect(() => ctx.sidebarRightTabs.register(geoGebraDefinition(t)), 'geogebra-pic: tab type')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: GEOGEBRA_ID,
    locale: NS,
  }, GeoGebraWorkspace)), 'geogebra-pic: workspace')
  ctx.effect(() => ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'geogebra-pic-open',
    order: 30,
    locale: NS,
    inject: () => ({ openGeoGebra: () => { ctx.sidebarRight.openTab(GEOGEBRA_KIND) } }),
  }, GeoGebraAction)), 'geogebra-pic: header action')
}
