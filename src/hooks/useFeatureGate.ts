/**
 * Hook pour verifier si le centre a souscrit un addon specifique
 */
import { useMemo } from 'react'
import { useAddonInfo } from '@/hooks/useAddonInfo'
import type { AddonType } from '@/types'

export function useFeatureGate() {
  const { activeAddons } = useAddonInfo()

  const hasAddon = useMemo(() => {
    return (type: AddonType): boolean => {
      return activeAddons.some(a => a.addonType === type && a.status === 'active')
    }
  }, [activeAddons])

  return {
    hasAddon,
    hasAttendance: hasAddon('attendance'),
    hasGrades: hasAddon('grades'),
  }
}
