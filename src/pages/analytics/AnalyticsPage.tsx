import { useMemo, useState, useRef, useEffect } from 'react'
import { startOfWeek, endOfWeek, getDay, isWithinInterval, differenceInMinutes, format } from 'date-fns'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { useUsers } from '@/hooks/useUsers'
import { isDemoMode } from '@/lib/supabase'
import { LoadingSpinner, BarChart, DonutChart, HeatmapGrid } from '@/components/ui'
import { CalendarCheck, Building2, Users, TrendingUp, Download, ChevronDown } from 'lucide-react'
import type { AnalyticsExportData } from '@/utils/export-analytics'

// ==================== LABELS & COULEURS ====================

const bookingTypeLabels: Record<string, string> = {
  course: 'Cours',
  exam: 'Examen',
  meeting: 'Réunion',
  event: 'Événement',
  maintenance: 'Maintenance',
}

const bookingTypeColors: Record<string, string> = {
  course: '#3b82f6',
  exam: '#ef4444',
  meeting: '#22c55e',
  event: '#0d9488',
  maintenance: '#6b7280',
}

const statusLabels: Record<string, string> = {
  scheduled: 'Planifié',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

const statusColors: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
const SLOT_LABELS = ['8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h']

// ==================== DONNÉES DÉMO ====================

const DEMO_WEEK_BARS = [
  { label: 'Lun', value: 5, color: '#3b82f6' },
  { label: 'Mar', value: 8, color: '#2563eb' },
  { label: 'Mer', value: 3, color: '#60a5fa' },
  { label: 'Jeu', value: 7, color: '#3b82f6' },
  { label: 'Ven', value: 4, color: '#2563eb' },
]

const DEMO_STATUS_DONUT = [
  { label: 'Planifié', value: 65, color: '#3b82f6' },
  { label: 'En cours', value: 3, color: '#f59e0b' },
  { label: 'Terminé', value: 78, color: '#22c55e' },
  { label: 'Annulé', value: 10, color: '#ef4444' },
]

const DEMO_HEATMAP: number[][] = [
  [0.2, 0.8, 0.6, 0.4, 0.9, 0.3, 0.7, 0.5, 0.1, 0.0],
  [0.5, 0.7, 0.3, 0.6, 0.8, 0.2, 0.9, 0.4, 0.3, 0.1],
  [0.1, 0.3, 0.5, 0.7, 0.4, 0.6, 0.2, 0.8, 0.5, 0.0],
  [0.8, 0.6, 0.4, 0.9, 0.3, 0.7, 0.5, 0.2, 0.6, 0.1],
  [0.3, 0.5, 0.7, 0.2, 0.6, 0.4, 0.8, 0.3, 0.1, 0.0],
]

const DEMO_TEACHER_BARS = [
  { label: 'J. Martin', value: 14, color: '#3b82f6' },
  { label: 'M. Dupont', value: 12, color: '#2563eb' },
  { label: 'S. Bernard', value: 10, color: '#60a5fa' },
  { label: 'P. Leroy', value: 9, color: '#3b82f6' },
  { label: 'C. Moreau', value: 7, color: '#2563eb' },
  { label: 'A. Thomas', value: 6, color: '#60a5fa' },
  { label: 'L. Petit', value: 5, color: '#3b82f6' },
  { label: 'F. Robert', value: 4, color: '#2563eb' },
]

// ==================== COMPOSANT ====================

function AnalyticsPage() {
  const { bookings, isLoading: bookingsLoading } = useBookings()
  const { rooms, isLoading: roomsLoading } = useRooms()
  const { users, isLoading: usersLoading } = useUsers()

  const isLoading = bookingsLoading || roomsLoading || usersLoading

  // ==================== EXPORT ====================
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleExport(fmt: 'pdf' | 'excel') {
    const exportData: AnalyticsExportData = {
      kpis,
      weekBarData: weekBarData.map(d => ({ label: d.label, value: d.value })),
      statusData: statusDonutData.map(d => ({ label: d.label, value: d.value })),
      heatmapData,
      dayLabels: DAY_LABELS,
      slotLabels: SLOT_LABELS,
      teacherData: teacherBarData.map(d => ({ label: d.label, value: d.value })),
      typeData: typeBarData.map(d => ({ label: d.label, value: d.value })),
      roomData: roomBarData.map(d => ({ label: d.label, value: d.value })),
    }
    const dateStr = format(new Date(), 'yyyy-MM-dd')
    const filename = `statistiques-${dateStr}`
    const mod = await import('@/utils/export-analytics')
    if (fmt === 'pdf') mod.exportAnalyticsToPDF(exportData, filename)
    else await mod.exportAnalyticsToExcel(exportData, filename)
    setShowExportMenu(false)
  }

  // ==================== DONNÉES CALCULÉES ====================

  // KPIs
  const kpis = useMemo(() => {
    if (isDemoMode) {
      return {
        totalSessions: 156,
        occupancyRate: 62,
        roomCount: 12,
        userCount: 48,
      }
    }

    // Taux d'occupation (semaine courante, Lu-Ve, 8h-18h)
    const now = new Date()
    const wStart = startOfWeek(now, { weekStartsOn: 1 })
    const wEnd = endOfWeek(now, { weekStartsOn: 1 })
    const TOTAL_MINUTES = 50 * 60 // 5j × 10h

    let totalPct = 0
    for (const room of rooms) {
      const roomBookings = bookings.filter(b => b.roomId === room.id && b.status !== 'cancelled')
      let totalMinutes = 0
      for (const b of roomBookings) {
        const bStart = new Date(b.startDateTime)
        const bEnd = new Date(b.endDateTime)
        if (bEnd <= wStart || bStart >= wEnd) continue
        for (let d = 0; d < 5; d++) {
          const dayStart = new Date(wStart)
          dayStart.setDate(dayStart.getDate() + d)
          dayStart.setHours(8, 0, 0, 0)
          const dayEnd = new Date(dayStart)
          dayEnd.setHours(18, 0, 0, 0)
          const cs = new Date(Math.max(bStart.getTime(), dayStart.getTime()))
          const ce = new Date(Math.min(bEnd.getTime(), dayEnd.getTime()))
          if (cs < ce) totalMinutes += differenceInMinutes(ce, cs)
        }
      }
      totalPct += rooms.length > 0 ? Math.min(Math.round((totalMinutes / TOTAL_MINUTES) * 100), 100) : 0
    }

    return {
      totalSessions: bookings.length,
      occupancyRate: rooms.length > 0 ? Math.round(totalPct / rooms.length) : 0,
      roomCount: rooms.length,
      userCount: users.length,
    }
  }, [bookings, rooms, users])

  // Séances par jour (semaine courante)
  const weekBarData = useMemo(() => {
    if (isDemoMode) return DEMO_WEEK_BARS

    const now = new Date()
    const wStart = startOfWeek(now, { weekStartsOn: 1 })
    const wEnd = endOfWeek(now, { weekStartsOn: 1 })
    const dayColors = ['#3b82f6', '#2563eb', '#60a5fa', '#3b82f6', '#2563eb']
    const counts = [0, 0, 0, 0, 0]

    for (const b of bookings) {
      if (b.status === 'cancelled') continue
      const d = new Date(b.startDateTime)
      if (isWithinInterval(d, { start: wStart, end: wEnd })) {
        const dow = getDay(d)
        if (dow >= 1 && dow <= 5) counts[dow - 1]++
      }
    }

    return DAY_LABELS.map((label, i) => ({ label, value: counts[i], color: dayColors[i] }))
  }, [bookings])

  // Répartition par statut
  const statusDonutData = useMemo(() => {
    if (isDemoMode) return DEMO_STATUS_DONUT

    const counts: Record<string, number> = {}
    for (const b of bookings) {
      counts[b.status] = (counts[b.status] || 0) + 1
    }

    return Object.entries(statusLabels).map(([key, label]) => ({
      label,
      value: counts[key] || 0,
      color: statusColors[key] || '#6b7280',
    }))
  }, [bookings])

  // Heatmap : occupation salles par créneau (5 jours × 10 créneaux 8h-18h)
  const heatmapData = useMemo(() => {
    if (isDemoMode) return DEMO_HEATMAP

    const now = new Date()
    const wStart = startOfWeek(now, { weekStartsOn: 1 })
    const totalRooms = Math.max(rooms.length, 1)

    // grid[day][slot] = count of rooms occupied
    const grid: number[][] = Array.from({ length: 5 }, () => Array(10).fill(0))

    for (const b of bookings) {
      if (b.status === 'cancelled') continue
      const bStart = new Date(b.startDateTime)
      const bEnd = new Date(b.endDateTime)

      for (let d = 0; d < 5; d++) {
        const dayBase = new Date(wStart)
        dayBase.setDate(dayBase.getDate() + d)

        for (let s = 0; s < 10; s++) {
          const slotStart = new Date(dayBase)
          slotStart.setHours(8 + s, 0, 0, 0)
          const slotEnd = new Date(dayBase)
          slotEnd.setHours(9 + s, 0, 0, 0)

          if (bStart < slotEnd && bEnd > slotStart) {
            grid[d][s]++
          }
        }
      }
    }

    // Normalize: count / totalRooms → 0-1
    return grid.map(row => row.map(v => Math.min(v / totalRooms, 1)))
  }, [bookings, rooms])

  // Charge enseignante (top 8 par nombre de séances)
  const teacherBarData = useMemo(() => {
    if (isDemoMode) return DEMO_TEACHER_BARS

    const counts: Record<string, { name: string; count: number }> = {}
    for (const b of bookings) {
      if (b.status === 'cancelled' || !b.user) continue
      const name = `${b.user.firstName} ${b.user.lastName}`.trim()
      if (!name) continue
      if (!counts[b.userId]) counts[b.userId] = { name, count: 0 }
      counts[b.userId].count++
    }

    const barColors = ['#3b82f6', '#2563eb', '#60a5fa', '#3b82f6', '#2563eb', '#60a5fa', '#3b82f6', '#2563eb']

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((t, i) => ({
        label: t.name.length > 14 ? t.name.slice(0, 12) + '…' : t.name,
        value: t.count,
        color: barColors[i % barColors.length],
      }))
  }, [bookings])

  // Séances par type (barres horizontales)
  const typeBarData = useMemo(() => {
    if (isDemoMode) {
      return [
        { label: 'Cours', value: 85, color: '#3b82f6' },
        { label: 'Examen', value: 22, color: '#ef4444' },
        { label: 'Réunion', value: 30, color: '#22c55e' },
        { label: 'Événement', value: 12, color: '#0d9488' },
        { label: 'Maintenance', value: 7, color: '#6b7280' },
      ]
    }

    const counts: Record<string, number> = {}
    for (const b of bookings) counts[b.bookingType] = (counts[b.bookingType] || 0) + 1

    return Object.entries(bookingTypeLabels).map(([key, label]) => ({
      label,
      value: counts[key] || 0,
      color: bookingTypeColors[key] || '#6b7280',
    }))
  }, [bookings])

  // Utilisation des salles (top 10)
  const roomBarData = useMemo(() => {
    if (isDemoMode) {
      return [
        { label: 'Salle A101', value: 18, color: '#3b82f6' },
        { label: 'Amphi B', value: 15, color: '#2563eb' },
        { label: 'Labo Info 2', value: 12, color: '#60a5fa' },
        { label: 'Salle C305', value: 10, color: '#3b82f6' },
        { label: 'Salle conseil', value: 8, color: '#2563eb' },
      ]
    }

    const counts: Record<string, number> = {}
    for (const b of bookings) {
      if (b.room?.name) counts[b.room.name] = (counts[b.room.name] || 0) + 1
    }

    const barColors = ['#3b82f6', '#2563eb', '#60a5fa']
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count], i) => ({
        label: name.length > 14 ? name.slice(0, 12) + '…' : name,
        value: count,
        color: barColors[i % barColors.length],
      }))
  }, [bookings])

  // ==================== RENDU ====================

  if (isLoading && !isDemoMode) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Chargement des statistiques..." />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Statistiques</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Vue d'ensemble de l'activité</p>
        </div>

        {/* Export dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <Download size={16} />
            Export
            <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 z-50 mt-1 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
              {([
                { fmt: 'pdf' as const, label: 'PDF', ext: '.pdf' },
                { fmt: 'excel' as const, label: 'Excel', ext: '.xlsx' },
              ]).map(({ fmt, label, ext }) => (
                <button
                  key={fmt}
                  className="w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-neutral-800 hover:text-primary-700 transition-colors flex items-center justify-between"
                  onClick={() => handleExport(fmt)}
                >
                  <span>{label}</span>
                  <span className="text-[10px] text-neutral-400">{ext}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ligne 1 — 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total séances', value: kpis.totalSessions, icon: CalendarCheck, iconBg: 'bg-primary-100', iconColor: 'text-primary-600' },
          { label: 'Taux d\'occupation', value: `${kpis.occupancyRate}%`, icon: TrendingUp, iconBg: 'bg-success-100', iconColor: 'text-success-600' },
          { label: 'Salles', value: kpis.roomCount, icon: Building2, iconBg: 'bg-warning-100', iconColor: 'text-warning-600' },
          { label: 'Utilisateurs', value: kpis.userCount, icon: Users, iconBg: 'bg-error-100', iconColor: 'text-error-600' },
        ].map(kpi => (
          <div key={kpi.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{kpi.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{kpi.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${kpi.iconBg}`}>
                <kpi.icon size={22} className={kpi.iconColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ligne 2 — Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Séances par jour</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Semaine courante (Lu-Ve)</p>
          <BarChart data={weekBarData} height={160} showValues />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Répartition par statut</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Toutes les séances</p>
          <DonutChart data={statusDonutData} size={140} thickness={22} />
        </div>
      </div>

      {/* Ligne 3 — Heatmap + Charge enseignante */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Occupation des salles</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Par créneau horaire (semaine courante)</p>
          <HeatmapGrid
            data={heatmapData}
            rowLabels={DAY_LABELS}
            colLabels={SLOT_LABELS}
          />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Charge enseignante</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Top 8 — nombre de séances</p>
          {teacherBarData.length > 0 ? (
            <BarChart data={teacherBarData} horizontal showValues />
          ) : (
            <p className="text-sm text-neutral-400 text-center py-6">Aucune donnée</p>
          )}
        </div>
      </div>

      {/* Ligne 4 — Barres détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Séances par type</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Répartition globale</p>
          {typeBarData.some(d => d.value > 0) ? (
            <BarChart data={typeBarData} horizontal showValues />
          ) : (
            <p className="text-sm text-neutral-400 text-center py-6">Aucune donnée</p>
          )}
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Utilisation des salles</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Top 10 — nombre de séances</p>
          {roomBarData.length > 0 ? (
            <BarChart data={roomBarData} horizontal showValues />
          ) : (
            <p className="text-sm text-neutral-400 text-center py-6">Aucune donnée</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
