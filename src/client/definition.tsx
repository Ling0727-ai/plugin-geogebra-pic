import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import { IconDataOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from './locales.ts'

export const GEOGEBRA_KIND = 'geogebra'
export const GEOGEBRA_ID = 'dsh-plugin-geogebra-pic'

export function geoGebraDefinition(t: TranslateNS<'geoGebraPic'>): SidebarRightTabDefinition {
  return {
    id: GEOGEBRA_ID,
    kind: GEOGEBRA_KIND,
    multiple: false,
    priority: 'extension',
    title: () => t('type.label'),
    guide: [{
      id: 'open',
      order: 15,
      title: () => t('guide.title'),
      description: () => t('guide.description'),
      icon: IconDataOutline16,
    }],
  }
}
