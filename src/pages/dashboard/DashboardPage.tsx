import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Building2,
  CalendarCheck,
  Clock,
  Users,
  Plus,
  ArrowUpRight,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'

const mockStats = [
  {
    label: 'Salles',
    value: '12',
    change: '+2 ce mois',
    changeType: 'success' as const,
    icon: Building2,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
  },
  {
    label: 'Réservations',
    value: '156',
    change: '+12%',
    changeType: 'success' as const,
    icon: CalendarCheck,
    iconBg: 'bg-success-100',
    iconColor: 'text-success-600',
  },
  {
    label: 'En cours',
    value: '3',
    change: 'En direct',
    changeType: 'warning' as const,
    icon: Clock,
    iconBg: 'bg-warning-100',
    iconColor: 'text-warning-600',
  },
  {
    label: 'Utilisateurs',
    value: '48',
    change: '+5 ce mois',
    changeType: 'success' as const,
    icon: Users,
    iconBg: 'bg-error-100',
    iconColor: 'text-error-600',
  },
]

const mockBookings = [
  { time: '09:00', title: 'Mathématiques L2', room: 'Salle A101', status: 'confirmed' },
  { time: '10:30', title: 'Physique L3', room: 'Amphi B', status: 'confirmed' },
  { time: '14:00', title: 'Réunion pédagogique', room: 'Salle C305', status: 'pending' },
  { time: '15:30', title: 'TD Informatique', room: 'Labo Info 2', status: 'confirmed' },
  { time: '17:00', title: 'Conseil de département', room: 'Salle du conseil', status: 'pending' },
]

const mockActivity = [
  { text: 'Jean Martin a réservé Salle A101', time: 'Il y a 2h', color: 'bg-primary-500' },
  { text: 'Nouvelle salle B203 ajoutée', time: 'Il y a 4h', color: 'bg-success-500' },
  { text: 'Conflit détecté : Amphi B, 14h-16h', time: 'Il y a 5h', color: 'bg-error-500' },
  { text: 'Marie Dupont a annulé sa réservation', time: 'Hier, 18h', color: 'bg-warning-500' },
  { text: 'Mise à jour du planning semaine 12', time: 'Hier, 14h', color: 'bg-primary-500' },
]

const quickActions = [
  { label: 'Nouvelle réservation', icon: Plus, href: '/bookings' },
  { label: 'Gérer les salles', icon: Building2, href: '/rooms' },
  { label: 'Voir le planning', icon: Calendar, href: '/planning' },
]

function DashboardPage() {
  const { user } = useAuthContext()
  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr })
  const displayName = user?.email?.split('@')[0] || 'utilisateur'

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Bonjour, {displayName}
          </h1>
          <p className="text-neutral-500 mt-1 capitalize">{today}</p>
        </div>
        <button className="btn-primary mt-4 sm:mt-0 flex items-center gap-2">
          <Plus size={18} />
          Nouvelle réservation
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {mockStats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">{stat.label}</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                <stat.icon size={22} className={stat.iconColor} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1">
              {stat.changeType === 'success' && (
                <ArrowUpRight size={14} className="text-success-600" />
              )}
              {stat.changeType === 'warning' && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning-500" />
                </span>
              )}
              <span className={`text-sm font-medium ${
                stat.changeType === 'success' ? 'text-success-600' : 'text-warning-600'
              }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Upcoming bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Prochaines réservations</h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              Voir tout <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {mockBookings.map((booking, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <div className="text-sm font-semibold text-neutral-900 w-14 shrink-0">
                  {booking.time}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{booking.title}</p>
                  <p className="text-xs text-neutral-500">{booking.room}</p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                  booking.status === 'confirmed'
                    ? 'bg-success-100 text-success-700'
                    : 'bg-warning-100 text-warning-700'
                }`}>
                  {booking.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Activité récente</h2>
          </div>
          <div className="space-y-4">
            {mockActivity.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color} mt-1.5`} />
                  {i < mockActivity.length - 1 && (
                    <div className="w-px flex-1 bg-neutral-200 mt-1" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-sm text-neutral-700">{item.text}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="card flex items-center gap-4 hover:border-primary-200 hover:shadow-medium transition-all text-left"
            >
              <div className="p-3 bg-primary-50 rounded-xl">
                <action.icon size={20} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{action.label}</p>
                <p className="text-xs text-neutral-500">Accès rapide</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
