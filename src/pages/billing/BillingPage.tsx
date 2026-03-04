/**
 * Page Facturation — Plan actuel, add-ons, historique billing
 * Admin/coordinator only
 */
import { useState } from 'react'
import { CreditCard, Package, FileText, ExternalLink, Loader2 } from 'lucide-react'
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'
import { useAddonInfo } from '@/hooks/useAddonInfo'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import { useBillingHistory } from '@/hooks/useBillingHistory'
import { isDemoMode } from '@/lib/supabase'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button, Badge } from '@/components/ui'
import { AddonSubscribeModal } from '@/components/addons/AddonSubscribeModal'

const EVENT_TYPE_LABELS: Record<string, string> = {
  'checkout.session.completed': 'Paiement reçu',
  'invoice.paid': 'Facture payée',
  'invoice.payment_failed': 'Paiement échoué',
  'customer.subscription.created': 'Abonnement créé',
  'customer.subscription.updated': 'Abonnement modifié',
  'customer.subscription.deleted': 'Abonnement annulé',
  'addon_assigned': 'Add-on souscrit',
}

const STATUS_BADGE: Record<string, { variant: 'success' | 'warning' | 'error' | 'neutral'; label: string }> = {
  succeeded: { variant: 'success', label: 'Réussi' },
  paid: { variant: 'success', label: 'Payé' },
  active: { variant: 'success', label: 'Actif' },
  failed: { variant: 'error', label: 'Échoué' },
  cancelled: { variant: 'error', label: 'Annulé' },
  pending: { variant: 'warning', label: 'En attente' },
}

// Demo data
const DEMO_EVENTS = [
  { id: '1', eventType: 'checkout.session.completed', amount: 29, currency: 'eur', status: 'succeeded', description: 'Plan Professionnel', createdAt: '2026-03-01T10:00:00Z' },
  { id: '2', eventType: 'addon_assigned', amount: 5, currency: 'eur', status: 'active', description: 'Email Pack 25', createdAt: '2026-02-15T14:30:00Z' },
  { id: '3', eventType: 'invoice.paid', amount: 29, currency: 'eur', status: 'paid', description: 'Facture mensuelle', createdAt: '2026-02-01T09:00:00Z' },
]

function BillingPage() {
  const { plan, subscription } = useSubscriptionInfo()
  const { activeAddons, effectiveQuotas } = useAddonInfo()
  const { openPortal, isLoading: portalLoading } = useStripeCheckout()
  const { events, isLoading: eventsLoading } = useBillingHistory()
  const [showAddonModal, setShowAddonModal] = useState(false)

  const billingEvents = isDemoMode ? DEMO_EVENTS : events

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Facturation</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Gérez votre abonnement et vos options</p>
        </div>
        <Button
          leftIcon={ExternalLink}
          onClick={() => openPortal()}
          isLoading={portalLoading}
          variant="secondary"
        >
          Gérer dans Stripe
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Plan actuel */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <CreditCard size={20} className="text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Plan actuel</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Plan</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {plan?.name || 'Gratuit'}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Statut</p>
              <Badge variant={subscription?.status === 'active' ? 'success' : 'neutral'}>
                {subscription?.status === 'active' ? 'Actif' : subscription?.status || 'N/A'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Renouvellement</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {subscription?.endDate
                  ? format(new Date(subscription.endDate), 'dd MMMM yyyy', { locale: fr })
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Montant</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {plan?.priceMonthly ? `${plan.priceMonthly}\u20AC/mois` : 'Gratuit'}
              </p>
            </div>
          </div>

          {/* Usage bars */}
          {effectiveQuotas && (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Utilisation</p>
              {[
                { label: 'Professeurs', current: effectiveQuotas.teachers?.current ?? 0, max: effectiveQuotas.teachers?.total ?? 0 },
                { label: 'Étudiants', current: effectiveQuotas.students?.current ?? 0, max: effectiveQuotas.students?.total ?? 0 },
                { label: 'Emails/jour', current: effectiveQuotas.emails?.usedToday ?? 0, max: effectiveQuotas.emails?.total ?? 0 },
              ].map(item => {
                const pct = item.max > 0 ? Math.min(Math.round((item.current / item.max) * 100), 100) : 0
                const colorClass = pct >= 90 ? 'bg-error-500' : pct >= 70 ? 'bg-warning-500' : 'bg-primary-500'
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs text-neutral-500 mb-1">
                      <span>{item.label}</span>
                      <span>{item.max > 0 ? `${item.current}/${item.max}` : 'Illimité'}</span>
                    </div>
                    <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colorClass} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Add-ons actifs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Package size={20} className="text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Options</h2>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setShowAddonModal(true)}>
              Ajouter
            </Button>
          </div>

          {activeAddons.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-6">Aucune option active</p>
          ) : (
            <div className="space-y-3">
              {activeAddons.map((addon, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{addon.name}</p>
                    <p className="text-xs text-neutral-500">x{addon.quantity}</p>
                  </div>
                  <Badge variant="success" size="sm">Actif</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historique facturation */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <FileText size={20} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Historique de facturation</h2>
        </div>

        {eventsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-neutral-400" />
          </div>
        ) : billingEvents.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-10">Aucun événement de facturation</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Montant</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {billingEvents.map(ev => {
                  const badge = STATUS_BADGE[ev.status] || { variant: 'neutral' as const, label: ev.status }
                  return (
                    <tr key={ev.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        {format(new Date(ev.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </td>
                      <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100">
                        {EVENT_TYPE_LABELS[ev.eventType] || ev.eventType}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{ev.description || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-900 dark:text-neutral-100">
                        {ev.amount != null ? `${ev.amount}\u20AC` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddonSubscribeModal isOpen={showAddonModal} onClose={() => setShowAddonModal(false)} />
    </div>
  )
}

export default BillingPage
