import { useMemo } from 'react'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { useUsers } from '@/hooks/useUsers'
import { LoadingSpinner } from '@/components/ui'
import { CalendarCheck, Building2, Users, TrendingUp } from 'lucide-react'

const bookingTypeLabels: Record<string, string> = {
  course: 'Cours',
  exam: 'Examen',
  meeting: 'Réunion',
  event: 'Événement',
  maintenance: 'Maintenance',
}

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmé',
  pending: 'En attente',
  cancelled: 'Annulé',
  completed: 'Terminé',
}

const roleLabels: Record<string, string> = {
  admin: 'Administrateurs',
  teacher: 'Enseignants',
  student: 'Étudiants',
  staff: 'Personnel',
}

const typeColors: Record<string, string> = {
  course: 'bg-blue-500',
  exam: 'bg-red-500',
  meeting: 'bg-green-500',
  event: 'bg-purple-500',
  maintenance: 'bg-gray-500',
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-success-500',
  pending: 'bg-warning-500',
  cancelled: 'bg-error-500',
  completed: 'bg-neutral-500',
}

function AnalyticsPage() {
  const { bookings, isLoading: bookingsLoading } = useBookings()
  const { rooms, isLoading: roomsLoading } = useRooms()
  const { users, userStats, isLoading: usersLoading } = useUsers()

  const isLoading = bookingsLoading || roomsLoading || usersLoading

  const stats = useMemo(() => {
    const totalBookings = bookings.length
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
    const occupancyRate = rooms.length > 0 ? Math.round((confirmedBookings / Math.max(rooms.length * 20, 1)) * 100) : 0

    // By type
    const byType: Record<string, number> = {}
    bookings.forEach(b => {
      byType[b.bookingType] = (byType[b.bookingType] || 0) + 1
    })

    // By status
    const byStatus: Record<string, number> = {}
    bookings.forEach(b => {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1
    })

    // Room usage
    const roomUsage: Record<string, number> = {}
    bookings.forEach(b => {
      if (b.room?.name) {
        roomUsage[b.room.name] = (roomUsage[b.room.name] || 0) + 1
      }
    })

    return { totalBookings, occupancyRate, byType, byStatus, roomUsage }
  }, [bookings, rooms])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Chargement des statistiques..." />
      </div>
    )
  }

  const maxByType = Math.max(...Object.values(stats.byType), 1)
  const maxByStatus = Math.max(...Object.values(stats.byStatus), 1)
  const maxRoomUsage = Math.max(...Object.values(stats.roomUsage), 1)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Statistiques</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Vue d'ensemble de l'activité</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Total séances</p>
              <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{stats.totalBookings}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-xl">
              <CalendarCheck size={22} className="text-primary-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Taux d'occupation</p>
              <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{stats.occupancyRate}%</p>
            </div>
            <div className="p-3 bg-success-100 rounded-xl">
              <TrendingUp size={22} className="text-success-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Salles</p>
              <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{rooms.length}</p>
            </div>
            <div className="p-3 bg-warning-100 rounded-xl">
              <Building2 size={22} className="text-warning-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Utilisateurs</p>
              <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{users.length}</p>
            </div>
            <div className="p-3 bg-error-100 rounded-xl">
              <Users size={22} className="text-error-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* By Type */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Séances par type</h3>
          <div className="space-y-3">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-neutral-600 dark:text-neutral-400">{bookingTypeLabels[type] || type}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{count}</span>
                </div>
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${typeColors[type] || 'bg-blue-500'}`}
                    style={{ width: `${(count / maxByType) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(stats.byType).length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-4">Aucune donnée</p>
            )}
          </div>
        </div>

        {/* By Status */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Séances par statut</h3>
          <div className="space-y-3">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-neutral-600 dark:text-neutral-400">{statusLabels[status] || status}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{count}</span>
                </div>
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${statusColors[status] || 'bg-blue-500'}`}
                    style={{ width: `${(count / maxByStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(stats.byStatus).length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-4">Aucune donnée</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Usage */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Utilisation des salles</h3>
          <div className="space-y-3">
            {Object.entries(stats.roomUsage)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([room, count]) => (
                <div key={room}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-600 dark:text-neutral-400">{room}</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{count} séance{count > 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-primary-500"
                      style={{ width: `${(count / maxRoomUsage) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            {Object.keys(stats.roomUsage).length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-4">Aucune donnée</p>
            )}
          </div>
        </div>

        {/* Users by Role */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Utilisateurs par rôle</h3>
          <div className="space-y-3">
            {Object.entries(userStats.byRole).map(([role, count]) => (
              <div key={role}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-neutral-600 dark:text-neutral-400">{roleLabels[role] || role}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{count}</span>
                </div>
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-indigo-500"
                    style={{ width: `${(count / Math.max(users.length, 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(userStats.byRole).length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-4">Aucune donnée</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
