import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import type { IconProps } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ComponentType } from 'react'

type Icon = ComponentType<IconProps>
const exports = primitives as unknown as Readonly<Record<string, Icon | undefined>>

/** Harness 0.2 names icons by weight; older hosts name them by default size. */
function icon(name: string, legacySize: number): Icon {
  const component = exports[`${name}Regular`] ?? exports[`${name}${legacySize}`]
  if (component === undefined) throw new Error(`GeoGebra Pic: missing Harness icon ${name}`)
  return component
}

export const IconChevronLeftOutline14 = icon('IconChevronLeftOutline', 14)
export const IconChevronRightOutline14 = icon('IconChevronRightOutline', 14)
export const IconCodeOutline16 = icon('IconCodeOutline', 16)
export const IconDataOutline16 = icon('IconDataOutline', 16)
export const IconDownloadOutline16 = icon('IconDownloadOutline', 16)
export const IconFolderOpenOutline16 = icon('IconFolderOpenOutline', 16)
export const IconFullscreenOutline16 = icon('IconFullscreenOutline', 16)
export const IconPanelLeftOutline16 = icon('IconPanelLeftOutline', 16)
export const IconPlayOutline16 = icon('IconPlayOutline', 16)
export const IconRefreshOutline16 = icon('IconRefreshOutline', 16)
export const IconTrashOutline16 = icon('IconTrashOutline', 16)
