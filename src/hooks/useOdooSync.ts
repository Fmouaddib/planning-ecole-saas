import { useState, useEffect, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'

export interface OdooSyncLog {
  id: string
  center_id: string
  started_at: string
  finished_at: string | null
  status: string
  stats: Record<string, unknown>
  error_message: string | null
  triggered_by: string
}

export function useOdooSync() {
  const { user } = useAuthContext()
  const centerId = user?.establishmentId

  const [syncLogs, setSyncLogs] = useState<OdooSyncLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const fetchLogs = useCallback(async () => {
    if (!centerId || isDemoMode) return
    setIsLoadingLogs(true)
    try {
      const { data, error } = await supabase
        .from('odoo_sync_logs')
        .select('*')
        .eq('center_id', centerId)
        .order('started_at', { ascending: false })
        .limit(10)
      if (!error && data) {
        setSyncLogs(data as OdooSyncLog[])
      }
    } finally {
      setIsLoadingLogs(false)
    }
  }, [centerId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const testConnection = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setIsTesting(true)
    try {
      const { data, error } = await supabase.functions.invoke('odoo-sync', {
        body: { action: 'test' },
      })
      if (error) return { success: false, message: error.message }
      if (data?.success) return { success: true, message: data.message }
      return { success: false, message: data?.error || 'Erreur inconnue' }
    } catch (e) {
      return { success: false, message: (e as Error).message }
    } finally {
      setIsTesting(false)
    }
  }, [])

  const triggerSync = useCallback(async (): Promise<{ success: boolean; stats?: Record<string, unknown>; error?: string }> => {
    setIsSyncing(true)
    try {
      const { data, error } = await supabase.functions.invoke('odoo-sync', {
        body: { action: 'sync' },
      })
      if (error) return { success: false, error: error.message }
      // Refresh logs after sync
      await fetchLogs()
      if (data?.success) return { success: true, stats: data.stats }
      return { success: false, error: data?.error || 'Erreur inconnue', stats: data?.stats }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    } finally {
      setIsSyncing(false)
    }
  }, [fetchLogs])

  return {
    syncLogs,
    isLoadingLogs,
    isSyncing,
    isTesting,
    testConnection,
    triggerSync,
    refreshLogs: fetchLogs,
  }
}
