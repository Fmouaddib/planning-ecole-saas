import { useState, useMemo } from 'react'
import { useBookings } from '@/hooks/useBookings'
import { usePagination } from '@/hooks/usePagination'
import { Button, Input, Select, Badge, EmptyState, LoadingSpinner } from '@/components/ui'
import { BOOKING_STATUS } from '@/utils/constants'
import { filterBySearch, formatDate, formatTimeRange } from '@/utils/helpers'
import { Search, BookOpen, RefreshCw } from 'lucide-react'

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmé',
  pending: 'En attente',
  cancelled: 'Annulé',
  completed: 'Terminé',
}

const statusOptions = Object.entries(BOOKING_STATUS).map(([, value]) => ({
  value,
  label: statusLabels[value] || value,
}))

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'error',
  completed: 'neutral',
}

function CoursesPage() {
  const { bookings, isLoading, error, refreshBookings } = useBookings()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const courses = useMemo(() => {
    return bookings.filter(b => b.bookingType === 'course')
  }, [bookings])

  const filtered = useMemo(() => {
    let result = courses
    if (search) {
      result = filterBySearch(result, search, ['title'])
    }
    if (statusFilter) {
      result = result.filter(b => b.status === statusFilter)
    }
    return result
  }, [courses, search, statusFilter])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Chargement des cours..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-error-600 mb-4">{error}</p>
        <Button variant="secondary" leftIcon={RefreshCw} onClick={refreshBookings}>
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Cours</h1>
          <p className="text-neutral-500 mt-1">{courses.length} cours au total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par titre..."
            leftIcon={Search}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[{ value: '', label: 'Tous les statuts' }, ...statusOptions]}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table or Empty */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Aucun cours trouvé"
          description={search || statusFilter ? 'Aucun cours ne correspond à vos critères.' : 'Aucun cours n\'a été programmé.'}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-neutral-200 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Titre</th>
                    <th className="hidden sm:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Salle</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Date/Heure</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Statut</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Enseignant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedData.map(course => (
                    <tr key={course.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900">{course.title}</span>
                        <span className="block sm:hidden text-xs text-neutral-400 mt-0.5">{course.room?.name || '-'}</span>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm text-neutral-600">
                        {course.room?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        <div>{course.startDateTime ? formatDate(course.startDateTime) : '-'}</div>
                        <div className="text-xs text-neutral-400">
                          {course.startDateTime && course.endDateTime
                            ? formatTimeRange(course.startDateTime, course.endDateTime)
                            : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant[course.status] || 'neutral'} size="sm">
                          {statusLabels[course.status] || course.status}
                        </Badge>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600">
                        {course.user ? `${course.user.firstName} ${course.user.lastName}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-neutral-500">
                Page {page} sur {totalPages} ({totalItems} résultat{totalItems > 1 ? 's' : ''})
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={!canPrev} onClick={prevPage}>
                  Précédent
                </Button>
                <Button variant="secondary" size="sm" disabled={!canNext} onClick={nextPage}>
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CoursesPage
