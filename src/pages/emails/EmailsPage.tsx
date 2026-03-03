import { useState, useEffect, useCallback, useMemo } from 'react'
import { Mail, RefreshCw, Filter, CheckCircle, XCircle, Clock, Send } from 'lucide-react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface EmailLog {
  id: string
  session_id: string | null
  participant_email: string
  email_type: string
  sent_at: string
  status: string
  error_message: string | null
}

const EMAIL_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  session_created: { label: 'Nouvelle séance', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  session_updated: { label: 'Modification', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  session_cancelled: { label: 'Annulation', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  reminder_day: { label: 'Rappel J-1', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  reminder_hour: { label: 'Rappel H-1', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  invitation: { label: 'Invitation', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  weekly_recap: { label: 'Récap hebdo', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  sent: { icon: CheckCircle, color: 'text-emerald-500', label: 'Envoyé' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Échoué' },
  pending: { icon: Clock, color: 'text-amber-500', label: 'En attente' },
}

export default function EmailsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const { user } = useAuth()

  const fetchLogs = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      // email_logs n'a pas de center_id, on filtre via les sessions du centre
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching email logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterType !== 'all' && log.email_type !== filterType) return false
      if (filterStatus !== 'all' && log.status !== filterStatus) return false
      return true
    })
  }, [logs, filterType, filterStatus])

  const stats = useMemo(() => {
    const total = logs.length
    const sent = logs.filter(l => l.status === 'sent').length
    const failed = logs.filter(l => l.status === 'failed').length
    const today = logs.filter(l => {
      const d = new Date(l.sent_at)
      const now = new Date()
      return d.toDateString() === now.toDateString()
    }).length
    return { total, sent, failed, today }
  }, [logs])

  const uniqueTypes = useMemo(() => {
    const types = new Set(logs.map(l => l.email_type))
    return Array.from(types).sort()
  }, [logs])

  if (isDemoMode) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Mail className="mx-auto mb-4 text-neutral-400" size={48} />
          <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
            Emails non disponibles en mode démo
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Suivi des emails
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Historique et statut des notifications envoyées
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Send size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.total}</p>
              <p className="text-xs text-neutral-500">Total envoyés</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
              <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.sent}</p>
              <p className="text-xs text-neutral-500">Réussis</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg">
              <XCircle size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
              <p className="text-xs text-neutral-500">Échoués</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <Clock size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.today}</p>
              <p className="text-xs text-neutral-500">Aujourd'hui</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-neutral-400" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          >
            <option value="all">Tous les types</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>
                {EMAIL_TYPE_LABELS[t]?.label || t}
              </option>
            ))}
          </select>
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
        >
          <option value="all">Tous les statuts</option>
          <option value="sent">Envoyés</option>
          <option value="failed">Échoués</option>
        </select>
        <span className="text-sm text-neutral-500 self-center">
          {filteredLogs.length} résultat{filteredLogs.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-neutral-400" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Mail size={40} className="text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-neutral-500 dark:text-neutral-400">Aucun email envoyé</p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
              Les emails apparaîtront ici après l'envoi de notifications
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Destinataire</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Erreur</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending
                  const StatusIcon = statusConfig.icon
                  const typeConfig = EMAIL_TYPE_LABELS[log.email_type]

                  return (
                    <tr
                      key={log.id}
                      className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusIcon size={16} className={statusConfig.color} />
                          <span className="text-neutral-700 dark:text-neutral-300">{statusConfig.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-neutral-900 dark:text-neutral-100 font-medium">
                          {log.participant_email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig?.color || 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200'}`}>
                          {typeConfig?.label || log.email_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        {format(new Date(log.sent_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        {log.error_message ? (
                          <span className="text-red-600 dark:text-red-400 text-xs truncate max-w-[200px] inline-block" title={log.error_message}>
                            {log.error_message}
                          </span>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-600">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
