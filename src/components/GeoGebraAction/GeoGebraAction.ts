import { useCallback } from 'react'
import type { GeoGebraActionProps } from './GeoGebraAction.api.ts'

export function useGeoGebraAction({ openGeoGebra }: GeoGebraActionProps) {
  return useCallback(() => { openGeoGebra() }, [openGeoGebra])
}
