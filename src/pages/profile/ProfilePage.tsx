/**
 * Page de profil utilisateur avec section abonnement SaaS
 */

import { useAuthContext } from '@/contexts/AuthContext'
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'
import type { SubscriptionPlanTier, SubscriptionStatus, ResourceUsage } from '@/types'

// Couleurs et labels pour les tiers de plan
const PLAN_TIER_CONFIG: Record<SubscriptionPlanTier, { label: string; color: string; bg: string }> = {
  free: { label: 'Gratuit', color: 'text-gray-700', bg: 'bg-gray-100' },
  pro: { label: 'Pro', color: 'text-blue-700', bg: 'bg-blue-100' },
  enterprise: { label: 'Enterprise', color: 'text-purple-700', bg: 'bg-purple-100' },
}

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Actif', color: 'text-green-700', bg: 'bg-green-100' },
  cancelled: { label: 'Annulé', color: 'text-red-700', bg: 'bg-red-100' },
  pending: { label: 'En attente', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  expired: { label: 'Expiré', color: 'text-gray-700', bg: 'bg-gray-100' },
}

function UsageBar({ label, usage }: { label: string; usage: ResourceUsage }) {
  const percentage = usage.max > 0 ? Math.min((usage.current / usage.max) * 100, 100) : 0
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={`font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-900'}`}>
          {usage.current} / {usage.max}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${
            isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function ProfilePage() {
  const { user } = useAuthContext()
  const { plan, subscription, usage, isLoading: subLoading, error: subError } = useSubscriptionInfo()

  const tierConfig = plan?.tier ? PLAN_TIER_CONFIG[plan.tier] : null
  const statusConfig = subscription?.status ? STATUS_CONFIG[subscription.status] : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Mon profil
            </h1>
            <p className="text-gray-600">
              Gérer vos informations personnelles et votre abonnement
            </p>
          </div>

          {/* Informations personnelles */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Informations personnelles</h3>
              <button className="btn-primary">
                Modifier
              </button>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <label className="form-label">Email</label>
                  <p className="text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <label className="form-label">Rôle</label>
                  <span className="badge-primary">{user?.role}</span>
                </div>
                <div>
                  <label className="form-label">Établissement</label>
                  <p className="text-gray-900">{user?.establishmentId}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section Abonnement */}
          <div className="mt-8">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Mon abonnement</h3>
              </div>
              <div className="card-body">
                {subLoading ? (
                  <p className="text-gray-500 text-center py-4">Chargement...</p>
                ) : subError ? (
                  <p className="text-red-500 text-center py-4">{subError}</p>
                ) : (
                  <div className="space-y-6">
                    {/* Plan et statut */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-gray-900">
                          {plan?.name || 'Aucun plan'}
                        </span>
                        {tierConfig && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tierConfig.bg} ${tierConfig.color}`}>
                            {tierConfig.label}
                          </span>
                        )}
                        {statusConfig && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date de renouvellement */}
                    {subscription?.renewalDate && (
                      <div>
                        <label className="form-label">Date de renouvellement</label>
                        <p className="text-gray-900">
                          {new Date(subscription.renewalDate).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    )}

                    {/* Barres d'utilisation */}
                    {usage && (
                      <div className="space-y-4 pt-2">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          Utilisation
                        </h4>
                        <UsageBar label="Utilisateurs" usage={usage.users} />
                        <UsageBar label="Salles" usage={usage.rooms} />
                        <UsageBar label="Réservations (ce mois)" usage={usage.bookingsThisMonth} />
                      </div>
                    )}

                    {/* Contact support */}
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500 mb-3">
                        Pour changer de plan ou poser une question sur votre abonnement :
                      </p>
                      <button className="btn-secondary">
                        Contacter le support
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions du compte */}
          <div className="mt-8">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Actions du compte</h3>
              </div>
              <div className="card-body">
                <div className="flex space-x-4">
                  <button className="btn-secondary">
                    Changer le mot de passe
                  </button>
                  <button className="btn-danger">
                    Se déconnecter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage