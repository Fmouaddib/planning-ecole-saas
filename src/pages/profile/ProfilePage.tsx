import { useState } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'
import { Button, Input, Modal, ModalFooter } from '@/components/ui'
import type { SubscriptionPlanTier, SubscriptionStatus, ResourceUsage } from '@/types'
import { User, KeyRound, Mail, LogOut } from 'lucide-react'

interface ProfilePageProps {
  onLogout?: () => void
}

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

function ProfilePage({ onLogout }: ProfilePageProps) {
  const { user } = useAuthContext()
  const { plan, subscription, usage, isLoading: subLoading, error: subError } = useSubscriptionInfo()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: user?.email?.split('@')[0] || '',
    lastName: '',
    email: user?.email || '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [editSaving, setEditSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const tierConfig = plan?.tier ? PLAN_TIER_CONFIG[plan.tier] : null
  const statusConfig = subscription?.status ? STATUS_CONFIG[subscription.status] : null

  const handleEditProfile = async () => {
    setEditSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      setEditModalOpen(false)
    } finally {
      setEditSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return
    }
    setPasswordSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      setPasswordModalOpen(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Mon profil</h1>
        <p className="text-neutral-500 mt-1">Gérer vos informations personnelles et votre abonnement</p>
      </div>

      {/* Informations personnelles */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-soft p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <User size={20} className="text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">Informations personnelles</h3>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>
            Modifier
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-neutral-500">Email</label>
            <p className="text-neutral-900 mt-1">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500">Rôle</label>
            <p className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                {user?.role}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500">Établissement</label>
            <p className="text-neutral-900 mt-1">{user?.establishmentId || '-'}</p>
          </div>
        </div>
      </div>

      {/* Section Abonnement */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-soft p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-success-100 rounded-lg">
            <Mail size={20} className="text-success-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">Mon abonnement</h3>
        </div>
        {subLoading ? (
          <p className="text-neutral-500 text-center py-4">Chargement...</p>
        ) : subError ? (
          <p className="text-error-500 text-center py-4">{subError}</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-neutral-900">
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

            {subscription?.renewalDate && (
              <div>
                <label className="text-sm font-medium text-neutral-500">Date de renouvellement</label>
                <p className="text-neutral-900 mt-1">
                  {new Date(subscription.renewalDate).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {usage && (
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">
                  Utilisation
                </h4>
                <UsageBar label="Utilisateurs" usage={usage.users} />
                <UsageBar label="Salles" usage={usage.rooms} />
                <UsageBar label="Séances (ce mois)" usage={usage.bookingsThisMonth} />
              </div>
            )}

            <div className="pt-4 border-t border-neutral-200">
              <p className="text-sm text-neutral-500 mb-3">
                Pour changer de plan ou poser une question sur votre abonnement :
              </p>
              <a href="mailto:support@antiplanning.com">
                <Button variant="secondary">Contacter le support</Button>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Actions du compte */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-warning-100 rounded-lg">
            <KeyRound size={20} className="text-warning-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">Actions du compte</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setPasswordModalOpen(true)}>
            Changer le mot de passe
          </Button>
          <Button variant="danger" leftIcon={LogOut} onClick={onLogout}>
            Se déconnecter
          </Button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Modifier le profil"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Prénom"
              placeholder="Votre prénom"
              value={editForm.firstName}
              onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
            />
            <Input
              label="Nom"
              placeholder="Votre nom"
              value={editForm.lastName}
              onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <Input
            label="Email"
            type="email"
            placeholder="votre@email.com"
            value={editForm.email}
            onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Annuler</Button>
          <Button onClick={handleEditProfile} isLoading={editSaving} disabled={!editForm.email}>
            Enregistrer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Changer le mot de passe"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Mot de passe actuel"
            type="password"
            value={passwordForm.currentPassword}
            onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
          />
          <Input
            label="Nouveau mot de passe"
            type="password"
            value={passwordForm.newPassword}
            onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
          />
          <Input
            label="Confirmer le nouveau mot de passe"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
          />
          {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
            <p className="text-sm text-error-600">Les mots de passe ne correspondent pas</p>
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setPasswordModalOpen(false)}>Annuler</Button>
          <Button
            onClick={handleChangePassword}
            isLoading={passwordSaving}
            disabled={!passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
          >
            Changer le mot de passe
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default ProfilePage
