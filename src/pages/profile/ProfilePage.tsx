import { useState } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import { useAddonInfo } from '@/hooks/useAddonInfo'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { Button, Input, Modal, ModalFooter, HelpBanner } from '@/components/ui'
import { AddonSubscribeModal } from '@/components/addons/AddonSubscribeModal'
import type { SubscriptionPlanTier, SubscriptionStatus, ResourceUsage, AddonType } from '@/types'
import { priceTTC, formatPrice } from '@/utils/pricing'
import { User, KeyRound, Mail, LogOut, CreditCard, Check, Rocket, Crown, Package, Users, GraduationCap, X, Bell, MailCheck, Linkedin, ExternalLink, HelpCircle, Download, Trash2, AlertTriangle } from 'lucide-react'
import { supabase, isolatedClient } from '@/lib/supabase'
import { SAAddonsService } from '@/services/super-admin/addons'
import { useEmailPreferences, type EmailPreferences } from '@/hooks/useEmailPreferences'
import { navigateTo } from '@/utils/navigation'
import { exportCenterData } from '@/utils/export-center-data'
import toast from 'react-hot-toast'

const upgradePlans = [
  { slug: 'ecole-en-ligne', name: 'École en ligne', price: 59, priceYearly: 47, icon: Rocket, color: 'bg-teal-100 text-teal-600', features: ['15 enseignants', '200 étudiants', 'Visio intégrée'] },
  { slug: 'pro', name: 'Pro', price: 99, priceYearly: 79, icon: Crown, color: 'bg-blue-100 text-blue-600', features: ['50 enseignants', 'Salles illimitées', 'Export & stats'] },
  { slug: 'enterprise', name: 'Enterprise', price: 149, priceYearly: 119, icon: Crown, color: 'bg-purple-100 text-purple-600', features: ['Illimité', 'Multi-campus', 'SLA 99.9%'] },
]

interface ProfilePageProps {
  onLogout?: () => void
}

const PLAN_TIER_CONFIG: Record<SubscriptionPlanTier, { label: string; color: string; bg: string }> = {
  free: { label: 'Gratuit', color: 'text-gray-700', bg: 'bg-gray-100' },
  'ecole-en-ligne': { label: 'École en ligne', color: 'text-teal-700', bg: 'bg-teal-100' },
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
  const { user, updateProfile } = useAuthContext()
  const { plan, subscription, usage, isLoading: subLoading, error: subError } = useSubscriptionInfo()
  const { openCheckout, openPortal, isLoading: portalLoading } = useStripeCheckout()
  const [annualBilling, setAnnualBilling] = useState(false)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    linkedin: user?.linkedin || '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [editSaving, setEditSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const tierConfig = plan?.tier ? PLAN_TIER_CONFIG[plan.tier] : null
  const statusConfig = subscription?.status ? STATUS_CONFIG[subscription.status] : null

  const handleEditProfile = async () => {
    setEditSaving(true)
    try {
      await updateProfile({
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone,
        linkedin: editForm.linkedin,
      })
      setEditModalOpen(false)
    } catch {
      // l'erreur est déjà gérée par updateProfile (toast)
    } finally {
      setEditSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères')
      return
    }
    setPasswordSaving(true)
    setPasswordError(null)
    try {
      // 1. Vérifier le mot de passe actuel via le client isolé (évite de perturber la session)
      const { error: verifyError } = await isolatedClient.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordForm.currentPassword,
      })
      if (verifyError) {
        setPasswordError('Le mot de passe actuel est incorrect')
        return
      }

      // 2. Mettre à jour le mot de passe
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })
      if (error) throw error

      toast.success('Mot de passe modifié avec succès')
      setPasswordModalOpen(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordError(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe'
      setPasswordError(msg)
      toast.error(msg)
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') return
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Session expirée, veuillez vous reconnecter')
        return
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Erreur lors de la suppression du compte')
      }
      await supabase.auth.signOut()
      toast.success('Votre compte a été supprimé')
      navigateTo('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression du compte'
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Mon profil</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'staff')
            ? 'Gérer vos informations personnelles et votre abonnement'
            : 'Gérer vos informations personnelles'}
        </p>
      </div>

      <HelpBanner storageKey="profile">
        {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'staff')
          ? <>Gérez vos informations personnelles, changez votre mot de passe et consultez votre abonnement. Votre photo de profil est visible par les autres membres de votre centre.
            <span className="flex gap-2 mt-2">
              <button onClick={() => navigateTo('/settings')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Configuration du centre →</button>
            </span></>
          : user?.role === 'teacher'
            ? <>Gérez vos informations personnelles et changez votre mot de passe. Activez les notifications push pour être alerté de vos séances et affectations.
              <span className="flex gap-2 mt-2">
                <button onClick={() => navigateTo('/planning')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Mon planning →</button>
                <button onClick={() => navigateTo('/chat')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Messages →</button>
              </span></>
            : <>Gérez vos informations personnelles et changez votre mot de passe. Activez les notifications push pour ne rien manquer : séances, notes, messages.
              <span className="flex gap-2 mt-2">
                <button onClick={() => navigateTo('/my-class')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Ma classe →</button>
                <button onClick={() => navigateTo('/chat')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Messages →</button>
              </span></>}
      </HelpBanner>

      {/* Informations personnelles */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6 mb-6">
        <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg shrink-0">
              <User size={20} className="text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Informations personnelles</h3>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)} className="shrink-0">
            Modifier
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Nom complet</label>
            <p className="text-neutral-900 dark:text-neutral-100 mt-1">
              {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || '-'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Email</label>
            <p className="text-neutral-900 dark:text-neutral-100 mt-1">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Rôle</label>
            <p className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                {user?.role}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Téléphone</label>
            <p className="text-neutral-900 dark:text-neutral-100 mt-1">{user?.phone || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">LinkedIn</label>
            <p className="mt-1">
              {user?.linkedin ? (
                <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  <Linkedin size={14} /> Voir le profil <ExternalLink size={12} />
                </a>
              ) : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Section Abonnement — admin/staff/super_admin uniquement */}
      {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'staff') && <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-success-100 rounded-lg shrink-0">
            <Mail size={20} className="text-success-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Mon abonnement</h3>
        </div>
        {subLoading ? (
          <p className="text-neutral-500 text-center py-4">Chargement...</p>
        ) : subError ? (
          <p className="text-error-500 text-center py-4">{subError}</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
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

            {subscription?.renewalDate && (
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Date de renouvellement</label>
                <p className="text-neutral-900 dark:text-neutral-100 mt-1">
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
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
                  Utilisation
                </h4>
                <UsageBar label="Utilisateurs" usage={usage.users} />
                <UsageBar label="Salles" usage={usage.rooms} />
                <UsageBar label="Séances (ce mois)" usage={usage.bookingsThisMonth} />
              </div>
            )}

            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
              {subscription?.stripeSubscriptionId ? (
                <>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                    Gérez votre abonnement, vos factures et vos moyens de paiement :
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      leftIcon={CreditCard}
                      onClick={openPortal}
                      isLoading={portalLoading}
                    >
                      Gérer mon abonnement
                    </Button>
                    <Button
                      variant="secondary"
                      leftIcon={CreditCard}
                      onClick={() => navigateTo('/billing')}
                    >
                      Facturation
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Passez à un plan supérieur :
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${!annualBilling ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>Mensuel</span>
                      <button
                        type="button"
                        onClick={() => setAnnualBilling(!annualBilling)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${annualBilling ? 'bg-primary-600' : 'bg-neutral-300'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${annualBilling ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                      </button>
                      <span className={`text-xs font-medium ${annualBilling ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>Annuel</span>
                      {annualBilling && <span className="text-[10px] font-semibold text-success-600 bg-success-50 px-1.5 py-0.5 rounded-full">-20%</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {upgradePlans.map((p) => {
                      const price = annualBilling ? p.priceYearly : p.price
                      const Icon = p.icon
                      return (
                        <div key={p.slug} className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded-lg ${p.color}`}><Icon size={14} /></div>
                            <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{p.name}</span>
                          </div>
                          <div className="mb-2">
                            <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{price}€</span>
                            <span className="text-xs text-neutral-500"> HT/mois</span>
                            <div className="text-[10px] text-neutral-400">{formatPrice(priceTTC(price))}€ TTC</div>
                          </div>
                          <ul className="space-y-1 mb-3 flex-1">
                            {p.features.map((f, i) => (
                              <li key={i} className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                                <Check size={10} className="text-success-500 shrink-0" />{f}
                              </li>
                            ))}
                          </ul>
                          <Button
                            variant="primary"
                            size="sm"
                            fullWidth
                            onClick={() => openCheckout({ planSlug: p.slug, billingCycle: annualBilling ? 'yearly' : 'monthly', successUrl: `${window.location.origin}/#/checkout-success`, cancelUrl: `${window.location.origin}/#/profile` })}
                            isLoading={portalLoading}
                          >
                            Choisir
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                  <div className="pt-4">
                    <Button
                      variant="secondary"
                      leftIcon={CreditCard}
                      onClick={() => navigateTo('/billing')}
                    >
                      Facturation
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>}

      {/* Section Mes options — admin/staff/super_admin uniquement */}
      {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'staff') && <AddonsSection />}

      {/* Section Notifications push */}
      <PushNotificationSection />

      {/* Section Préférences email */}
      <EmailPreferencesSection />

      {/* Actions du compte */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-warning-100 rounded-lg shrink-0">
            <KeyRound size={20} className="text-warning-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Actions du compte</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => { setPasswordModalOpen(true); setPasswordError(null); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) }}>
            Changer le mot de passe
          </Button>
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <Button
              variant="secondary"
              leftIcon={Download}
              isLoading={exporting}
              onClick={async () => {
                if (!user?.establishmentId) {
                  toast.error('Aucun centre rattache')
                  return
                }
                setExporting(true)
                try {
                  // Fetch center name
                  const { data: center } = await supabase
                    .from('training_centers')
                    .select('name')
                    .eq('id', user.establishmentId)
                    .single()
                  await exportCenterData(user.establishmentId, center?.name || 'centre')
                } finally {
                  setExporting(false)
                }
              }}
            >
              Exporter mes donnees (RGPD)
            </Button>
          )}
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <Button
              variant="secondary"
              leftIcon={HelpCircle}
              onClick={() => {
                localStorage.removeItem('onboarding_tour_completed')
                navigateTo('/')
              }}
            >
              Relancer la visite guidee
            </Button>
          )}
          <Button variant="danger" leftIcon={LogOut} onClick={onLogout}>
            Se deconnecter
          </Button>
        </div>
      </div>

      {/* Zone de danger — suppression de compte (non super_admin) */}
      {user?.role !== 'super_admin' && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border-2 border-red-300 dark:border-red-800 shadow-soft p-4 sm:p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg shrink-0">
              <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Zone de danger</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Actions irreversibles
              </p>
            </div>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            La suppression de votre compte est definitive. Toutes vos donnees personnelles seront effacees et cette action ne peut pas etre annulee.
          </p>
          <Button
            variant="danger"
            leftIcon={Trash2}
            onClick={() => { setDeleteModalOpen(true); setDeleteConfirmText('') }}
          >
            Supprimer mon compte
          </Button>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Supprimer mon compte"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex gap-3">
              <AlertTriangle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Cette action est irreversible
                </p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  Votre compte, vos donnees personnelles et votre historique seront definitivement supprimes. Vous ne pourrez plus acceder a la plateforme avec cet identifiant.
                </p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Tapez <span className="font-bold text-red-600">SUPPRIMER</span> pour confirmer
            </label>
            <Input
              placeholder="SUPPRIMER"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>Annuler</Button>
          <Button
            variant="danger"
            leftIcon={Trash2}
            onClick={handleDeleteAccount}
            isLoading={deleting}
            disabled={deleteConfirmText !== 'SUPPRIMER'}
          >
            Supprimer definitivement
          </Button>
        </ModalFooter>
      </Modal>

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
          <div>
            <Input
              label="Email"
              type="email"
              placeholder="votre@email.com"
              value={editForm.email}
              onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
            />
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Si vous modifiez votre email, un lien de confirmation sera envoyé à la nouvelle adresse. Le changement ne sera effectif qu'après confirmation.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Téléphone"
              type="tel"
              placeholder="06 12 34 56 78"
              value={editForm.phone}
              onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="LinkedIn"
              placeholder="https://linkedin.com/in/..."
              value={editForm.linkedin}
              onChange={e => setEditForm(f => ({ ...f, linkedin: e.target.value }))}
            />
          </div>
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
          {passwordError && (
            <div className="p-3 rounded-lg bg-error-50 border border-error-200">
              <p className="text-sm text-error-700">{passwordError}</p>
            </div>
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

// ═══════════════════════════════════════════════════════════
// Section Notifications push
// ═══════════════════════════════════════════════════════════

function PushNotificationSection() {
  const { isSupported, isSubscribed, isLoading, permissionState, subscribe, unsubscribe } = usePushSubscription()
  const [toggling, setToggling] = useState(false)

  if (!isSupported) return null

  const handleToggle = async () => {
    setToggling(true)
    try {
      if (isSubscribed) {
        const ok = await unsubscribe()
        if (ok) toast.success('Notifications push désactivées')
      } else {
        const ok = await subscribe()
        if (ok) toast.success('Notifications push activées')
        else if (permissionState === 'denied') toast.error('Notifications bloquées par le navigateur. Modifiez les permissions du site.')
      }
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-violet-100 rounded-lg shrink-0">
          <Bell size={20} className="text-violet-600" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Notifications push</h3>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {isSubscribed ? 'Vous recevez des notifications push sur cet appareil' : 'Activez les notifications push pour être alerté en temps réel'}
          </p>
          {permissionState === 'denied' && (
            <p className="text-xs text-red-500 mt-1">Les notifications sont bloquées. Autorisez-les dans les paramètres du navigateur.</p>
          )}
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling || isLoading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isSubscribed ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'
          } ${toggling ? 'opacity-50' : ''}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            isSubscribed ? 'translate-x-[22px]' : 'translate-x-[3px]'
          }`} />
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Section Préférences email
// ═══════════════════════════════════════════════════════════

const EMAIL_TYPE_LABELS: Record<keyof EmailPreferences, string> = {
  email_session_created: 'Création de séance',
  email_session_updated: 'Modification de séance',
  email_session_cancelled: 'Annulation de séance',
  email_reminders: 'Rappels de séance',
  email_recap_weekly: 'Récapitulatif hebdomadaire',
  email_recap_monthly: 'Récapitulatif mensuel',
  email_recap_quarterly: 'Récapitulatif trimestriel',
  email_recap_semester: 'Récapitulatif semestriel',
}

function EmailPreferencesSection() {
  const { preferences, isLoading, updatePreferences, ALL_KEYS } = useEmailPreferences()

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
          <MailCheck size={20} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Mes emails</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Choisissez les emails que vous souhaitez recevoir
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-neutral-500 text-center py-4">Chargement...</p>
      ) : (
        <div className="space-y-2">
          {ALL_KEYS.map(key => {
            const enabled = preferences[key] !== false
            return (
              <label
                key={key}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
              >
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  {EMAIL_TYPE_LABELS[key]}
                </span>
                <button
                  type="button"
                  onClick={() => updatePreferences({ [key]: !enabled })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    enabled ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`} />
                </button>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Section Mes options (add-ons actifs + barres d'utilisation)
// ═══════════════════════════════════════════════════════════

const ADDON_TYPE_ICONS: Record<AddonType, typeof Mail> = {
  email: Mail,
  teacher: Users,
  student: GraduationCap,
  attendance: Users,
  grades: GraduationCap,
}

const ADDON_TYPE_LABELS: Record<AddonType, string> = {
  email: 'Email',
  teacher: 'Professeurs',
  student: 'Etudiants',
  attendance: 'Presences',
  grades: 'Notes',
}

const ADDON_TYPE_COLORS: Record<AddonType, { text: string; bg: string }> = {
  email: { text: 'text-blue-700', bg: 'bg-blue-100' },
  teacher: { text: 'text-purple-700', bg: 'bg-purple-100' },
  student: { text: 'text-emerald-700', bg: 'bg-emerald-100' },
  attendance: { text: 'text-teal-700', bg: 'bg-teal-100' },
  grades: { text: 'text-orange-700', bg: 'bg-orange-100' },
}

function AddonsSection() {
  const { activeAddons, effectiveQuotas, isLoading, refresh } = useAddonInfo()
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const handleCancel = async (addonId: string) => {
    setCancelling(addonId)
    try {
      await SAAddonsService.cancelCenterAddon(addonId)
      toast.success('Option annulee')
      refresh()
    } catch {
      toast.error('Erreur lors de l\'annulation')
    } finally {
      setCancelling(null)
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6 mb-6">
        <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
              <Package size={20} className="text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Mes options</h3>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowSubscribeModal(true)} className="shrink-0">
            + Ajouter une option
          </Button>
        </div>

        {isLoading ? (
          <p className="text-neutral-500 text-center py-4">Chargement...</p>
        ) : (
          <div className="space-y-6">
            {/* Quotas effectifs */}
            {effectiveQuotas && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
                  Quotas
                </h4>
                {effectiveQuotas.emails.total > 0 && (
                  <UsageBar
                    label={`Emails aujourd'hui`}
                    usage={{ current: effectiveQuotas.emails.usedToday, max: effectiveQuotas.emails.total }}
                  />
                )}
                {effectiveQuotas.teachers.total !== 0 && (
                  <UsageBar
                    label="Enseignants"
                    usage={{ current: effectiveQuotas.teachers.current, max: effectiveQuotas.teachers.total }}
                  />
                )}
                {effectiveQuotas.students.total > 0 && (
                  <UsageBar
                    label="Etudiants"
                    usage={{ current: effectiveQuotas.students.current, max: effectiveQuotas.students.total }}
                  />
                )}
                {effectiveQuotas.emails.total === 0 && effectiveQuotas.students.total === 0 && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Aucune option active. Ajoutez des packs pour debloquer des quotas supplementaires.
                  </p>
                )}
              </div>
            )}

            {/* Active addons list */}
            {activeAddons.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
                  Options actives
                </h4>
                {activeAddons.map(addon => {
                  const Icon = ADDON_TYPE_ICONS[addon.addonType]
                  const colors = ADDON_TYPE_COLORS[addon.addonType]
                  return (
                    <div key={addon.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${colors.bg}`}>
                          <Icon size={14} className={colors.text} />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {addon.name}
                          </span>
                          {addon.quantity > 1 && (
                            <span className="text-xs text-neutral-500 ml-1">x{addon.quantity}</span>
                          )}
                          <div className="text-xs text-neutral-500">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colors.bg} ${colors.text}`}>
                              {ADDON_TYPE_LABELS[addon.addonType]}
                            </span>
                            <span className="ml-2">{addon.priceMonthly}€ HT/mois</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancel(addon.id)}
                        disabled={cancelling === addon.id}
                        className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Annuler cette option"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showSubscribeModal && (
        <AddonSubscribeModal
          isOpen={true}
          onClose={() => { setShowSubscribeModal(false); refresh(); }}
        />
      )}
    </>
  )
}

export default ProfilePage
