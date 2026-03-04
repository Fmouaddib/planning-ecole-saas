/**
 * Modal de souscription à un add-on
 * Accessible depuis ProfilePage et UpsellModal
 */

import { useState, useMemo } from 'react'
import { Modal, ModalFooter, Button } from '@/components/ui'
import { Check, Mail, Users, GraduationCap } from 'lucide-react'
import { useAddonInfo } from '@/hooks/useAddonInfo'
import { useAuthContext } from '@/contexts/AuthContext'
import { SAAddonsService } from '@/services/super-admin/addons'
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'
import toast from 'react-hot-toast'
import type { AddonPlanInfo, AddonType } from '@/types'

interface AddonSubscribeModalProps {
  isOpen: boolean
  onClose: () => void
  initialType?: AddonType
}

const TYPE_CONFIG: Record<AddonType, { label: string; icon: typeof Mail; color: string; bg: string }> = {
  email: { label: 'Emails', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100' },
  teacher: { label: 'Professeurs', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
  student: { label: 'Etudiants', icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  attendance: { label: 'Presences', icon: Check, color: 'text-teal-600', bg: 'bg-teal-100' },
  grades: { label: 'Notes', icon: GraduationCap, color: 'text-orange-600', bg: 'bg-orange-100' },
}

function computeProRata(periodEnd: string, monthlyPrice: number): number {
  const now = new Date()
  const end = new Date(periodEnd)
  const remainingDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000))
  return Math.round((monthlyPrice * remainingDays / 30) * 100) / 100
}

export function AddonSubscribeModal({ isOpen, onClose, initialType }: AddonSubscribeModalProps) {
  const { user } = useAuthContext()
  const { addonPlans, refresh } = useAddonInfo()
  const { subscription } = useSubscriptionInfo()
  const centerId = user?.establishmentId

  const [selectedType, setSelectedType] = useState<AddonType>(initialType || 'email')
  const [selectedPlan, setSelectedPlan] = useState<AddonPlanInfo | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredPlans = useMemo(() =>
    addonPlans.filter(p => p.addonType === selectedType),
    [addonPlans, selectedType]
  )

  const totalPrice = useMemo(() => {
    if (!selectedPlan) return 0
    const unitPrice = billingCycle === 'yearly' && selectedPlan.priceYearly
      ? selectedPlan.priceYearly
      : selectedPlan.priceMonthly
    return unitPrice * quantity
  }, [selectedPlan, quantity, billingCycle])

  const proRataAmount = useMemo(() => {
    if (!selectedPlan || !subscription?.endDate) return null
    return computeProRata(subscription.endDate, selectedPlan.priceMonthly * quantity)
  }, [selectedPlan, subscription?.endDate, quantity])

  const handleSubscribe = async () => {
    if (!selectedPlan || !centerId) return
    setIsSubmitting(true)
    try {
      await SAAddonsService.assignAddonToCenter({
        center_id: centerId,
        addon_plan_id: selectedPlan.id,
        quantity,
        billing_cycle: billingCycle,
      })
      toast.success('Option souscrite avec succes !')
      refresh()
      onClose()
    } catch {
      toast.error('Erreur lors de la souscription')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter une option" size="lg">
      <div className="space-y-6">
        {/* Type tabs */}
        <div className="flex gap-2">
          {(['email', 'teacher', 'student', 'attendance', 'grades'] as const).map(type => {
            const cfg = TYPE_CONFIG[type]
            const Icon = cfg.icon
            return (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setSelectedPlan(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                <Icon size={16} />
                {cfg.label}
              </button>
            )
          })}
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {filteredPlans.map(plan => {
            const isSelected = selectedPlan?.id === plan.id
            const price = billingCycle === 'yearly' && plan.priceYearly
              ? plan.priceYearly : plan.priceMonthly
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                }`}
              >
                <div className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{plan.name}</div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {price}{'\u20AC'}
                  <span className="text-sm font-normal text-neutral-500">
                    /{billingCycle === 'yearly' ? 'an' : 'mois'}
                  </span>
                </div>
                <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {plan.addonType === 'email'
                    ? `${plan.quotaValue} emails/jour`
                    : `+${plan.quotaValue} ${plan.addonType === 'teacher' ? 'profs' : 'etudiants'}`}
                </div>
                {isSelected && <Check size={16} className="text-primary-500 mt-2" />}
              </button>
            )
          })}
        </div>

        {selectedPlan && (
          <>
            {/* Quantity + billing */}
            <div className="flex items-center gap-6">
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 block mb-1">Quantite</label>
                <div className="flex items-center gap-2">
                  <button
                    className="w-8 h-8 rounded-lg border border-neutral-300 dark:border-neutral-600 flex items-center justify-center text-lg"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >-</button>
                  <span className="w-8 text-center font-semibold">{quantity}</span>
                  <button
                    className="w-8 h-8 rounded-lg border border-neutral-300 dark:border-neutral-600 flex items-center justify-center text-lg"
                    onClick={() => setQuantity(quantity + 1)}
                  >+</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 block mb-1">Facturation</label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${billingCycle === 'monthly' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>Mensuel</span>
                  <button
                    type="button"
                    onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${billingCycle === 'yearly' ? 'bg-primary-600' : 'bg-neutral-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${billingCycle === 'yearly' ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                  </button>
                  <span className={`text-xs font-medium ${billingCycle === 'yearly' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>Annuel</span>
                  {billingCycle === 'yearly' && <span className="text-[10px] font-semibold text-success-600 bg-success-50 px-1.5 py-0.5 rounded-full">Economie</span>}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">
                  {selectedPlan.name} x{quantity}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {totalPrice.toFixed(2)}{'\u20AC'}/{billingCycle === 'yearly' ? 'an' : 'mois'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Quota total
                </span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {selectedPlan.addonType === 'email'
                    ? `${selectedPlan.quotaValue * quantity}/jour`
                    : `+${selectedPlan.quotaValue * quantity}`}
                </span>
              </div>
              {proRataAmount != null && proRataAmount > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-500">Premier mois au prorata</span>
                  <span className="text-neutral-700 dark:text-neutral-300">{proRataAmount.toFixed(2)}{'\u20AC'}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSubscribe}
          isLoading={isSubmitting}
          disabled={!selectedPlan}
        >
          Souscrire
        </Button>
      </ModalFooter>
    </Modal>
  )
}
