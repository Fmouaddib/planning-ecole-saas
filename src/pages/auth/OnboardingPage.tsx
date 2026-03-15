import { useState, useEffect } from 'react'
import {
  Eye, EyeOff, Lock, Mail, Building2,
  ArrowRight, ArrowLeft, CheckCircle, Copy, Check, Crown, Zap, Rocket
} from 'lucide-react'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { priceTTC, formatPrice } from '@/utils/pricing'
import { supabase, isDemoMode } from '@/lib/supabase'
import { OnboardingService } from '@/services/onboardingService'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import { useLang } from '@/hooks/useLang'
import toast, { Toaster } from 'react-hot-toast'

interface StepIndicatorProps {
  current: number
  total: number
}

function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        const isActive = step === current
        const isDone = step < current
        return (
          <div key={step} className="flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                isDone
                  ? 'bg-success-500 text-white'
                  : isActive
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {isDone ? <Check size={16} /> : step}
            </div>
            {step < total && (
              <div className={`w-12 h-0.5 transition-all duration-300 ${isDone ? 'bg-success-500' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100
  return (
    <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 mb-6">
      <div
        className="h-1.5 rounded-full bg-primary-500 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function getPasswordStrength(password: string, t: (k: string) => string): { level: number; label: string; color: string } {
  if (password.length === 0) return { level: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 2) return { level: 1, label: t('onboarding.passwordStrength.weak'), color: 'bg-error-500' }
  if (score <= 3) return { level: 2, label: t('onboarding.passwordStrength.medium'), color: 'bg-warning-500' }
  if (score <= 4) return { level: 3, label: t('onboarding.passwordStrength.strong'), color: 'bg-success-500' }
  return { level: 4, label: t('onboarding.passwordStrength.veryStrong'), color: 'bg-success-600' }
}

// Plan cards pour l'étape 2
const onboardingPlans = [
  { slug: 'free', nameKey: 'Gratuit', nameKeyEn: 'Free', price: 0, priceYearly: 0, icon: Zap, color: 'bg-gray-100 text-gray-600', features: ['3 enseignants', '3 salles', '50 séances/mois'], featuresEn: ['3 teachers', '3 rooms', '50 sessions/mo'] },
  { slug: 'ecole-en-ligne', nameKey: 'École en ligne', nameKeyEn: 'Online School', price: 59, priceYearly: 47, icon: Rocket, color: 'bg-teal-100 text-teal-600', features: ['15 enseignants', '200 étudiants', 'Visio intégrée'], featuresEn: ['15 teachers', '200 students', 'Integrated video'] },
  { slug: 'pro', nameKey: 'Pro', nameKeyEn: 'Pro', price: 99, priceYearly: 79, icon: Crown, color: 'bg-blue-100 text-blue-600', features: ['50 enseignants', 'Salles illimitées', 'Export & stats'], featuresEn: ['50 teachers', 'Unlimited rooms', 'Export & stats'] },
  { slug: 'enterprise', nameKey: 'Enterprise', nameKeyEn: 'Enterprise', price: 149, priceYearly: 119, icon: Crown, color: 'bg-purple-100 text-purple-600', features: ['Illimité', 'Multi-campus', 'SLA 99.9%'], featuresEn: ['Unlimited', 'Multi-campus', '99.9% SLA'] },
]

export default function OnboardingPage() {
  const { t, lang } = useLang()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { openCheckout, isLoading: checkoutLoading } = useStripeCheckout()

  // Étape 1 : Compte + Centre (fusionnés — 3 champs essentiels)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [centerName, setCenterName] = useState('')

  // Étape 2 : Plan
  const [selectedPlan, setSelectedPlan] = useState('free')
  const [annualBilling, setAnnualBilling] = useState(false)

  // Résultat
  const [enrollmentCode, setEnrollmentCode] = useState<string | null>(null)
  const [createdCenterName, setCreatedCenterName] = useState('')

  // Plan pré-sélectionné depuis l'URL
  const [urlPlan, setUrlPlan] = useState<string | null>(null)

  // Parse URL params
  useEffect(() => {
    const hash = window.location.hash
    const queryIndex = hash.indexOf('?')
    if (queryIndex === -1) return
    const params = new URLSearchParams(hash.slice(queryIndex))
    if (params.get('plan')) {
      const plan = params.get('plan')!
      setSelectedPlan(plan)
      if (plan !== 'free') setUrlPlan(plan)
    }
    if (params.get('billing') === 'yearly') setAnnualBilling(true)
    if (params.get('checkout') === 'success') {
      toast.success(t('onboarding.toast.paymentSuccess'))
      window.location.hash = '#/onboarding'
      setStep(3)
    }
    if (params.get('checkout') === 'cancelled') {
      toast.error(t('onboarding.toast.paymentCancelled'))
      window.location.hash = '#/onboarding'
    }
  }, [])

  const passwordStrength = getPasswordStrength(password, t)

  const sanitizeEmail = (raw: string): string =>
    raw.trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')

  const validateStep1 = (): string | null => {
    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail) return t('onboarding.error.emailRequired')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return t('onboarding.error.emailInvalid')
    if (!password) return t('onboarding.error.passwordRequired')
    if (password.length < 8) return t('onboarding.error.passwordLength')
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return t('onboarding.error.passwordStrength')
    }
    if (!centerName.trim()) return t('onboarding.error.centerRequired')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const err = validateStep1()
    if (err) {
      setError(err)
      return
    }

    if (isDemoMode) {
      setError(t('onboarding.error.demoMode'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const cleanEmail = sanitizeEmail(email)

      // 1. Créer le compte auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: centerName.trim(), // sera modifiable dans le profil
            role: 'admin',
          },
        },
      })

      if (authError) {
        if (authError.message.includes('invalid') || authError.message.includes('Invalid')) {
          throw new Error(t('onboarding.error.emailInvalid'))
        }
        if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
          throw new Error(t('onboarding.error.emailTaken'))
        }
        if (authError.message.includes('rate') || authError.status === 429) {
          throw new Error(t('onboarding.error.rateLimit'))
        }
        throw authError
      }
      if (!authData.user) throw new Error(t('onboarding.error.generic'))

      if (authData.user.identities?.length === 0) {
        throw new Error(t('onboarding.error.emailTaken'))
      }

      // 2. Attendre que le trigger crée le profil
      const profileReady = await OnboardingService.waitForProfile(authData.user.id)
      if (!profileReady) throw new Error(t('onboarding.error.profileTimeout'))

      // 3. Créer le centre
      const result = await OnboardingService.createCenterWithAdmin({
        centerName: centerName.trim(),
      })

      setEnrollmentCode(result.enrollment_code)
      setCreatedCenterName(centerName.trim())

      // Envoyer l'email de bienvenue (non bloquant)
      OnboardingService.sendWelcomeEmail({
        email: sanitizeEmail(email),
        firstName: centerName.trim(),
        centerName: centerName.trim(),
        enrollmentCode: result.enrollment_code,
      })

      // Si plan payant pré-sélectionné, aller au paiement directement
      if (urlPlan && urlPlan !== 'free') {
        toast.success(t('onboarding.toast.redirectPayment'))
        await openCheckout({
          planSlug: urlPlan,
          billingCycle: annualBilling ? 'yearly' : 'monthly',
          successUrl: `${window.location.origin}/#/checkout-success`,
          cancelUrl: `${window.location.origin}/#/onboarding?checkout=cancelled`,
        })
        return
      }

      setStep(2) // Choix du plan
      toast.success(t('onboarding.toast.created'))
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('onboarding.error.generic')
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCode = async () => {
    if (!enrollmentCode) return
    try {
      await navigator.clipboard.writeText(enrollmentCode)
      setCopied(true)
      toast.success(t('onboarding.toast.codeCopied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  const handleSelectPlan = async (planSlug: string) => {
    if (planSlug === 'free') {
      setStep(3)
      return
    }
    await openCheckout({
      planSlug,
      billingCycle: annualBilling ? 'yearly' : 'monthly',
      successUrl: `${window.location.origin}/#/checkout-success`,
      cancelUrl: `${window.location.origin}/#/onboarding?checkout=cancelled`,
    })
  }

  const handleGoToDashboard = () => {
    // Auto-login : la session Supabase est déjà active, pas besoin de re-login
    window.location.hash = '#/'
    window.location.reload()
  }

  const totalSteps = urlPlan ? 1 : 2

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div className={`w-full ${step === 2 ? 'max-w-2xl' : 'max-w-lg'} transition-all`}>
        {/* Retour */}
        <a
          href="#/"
          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200 mb-4"
        >
          <ArrowLeft size={16} />
          {t('onboarding.backHome')}
        </a>

        {/* Logo + titre */}
        <div className="text-center mb-6">
          <div
            className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 shadow-medium"
            style={{ background: 'linear-gradient(135deg, #FF5B46, #FBA625)' }}
          >
            <span className="text-white font-extrabold text-2xl">A</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-display mb-2">
            {step === 3 ? t('onboarding.title.success') : t('onboarding.title')}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {step === 1 && t('onboarding.step1.subtitle')}
            {step === 2 && t('onboarding.step2.subtitle')}
            {step === 3 && (createdCenterName + ' ' + t('onboarding.success.created'))}
          </p>
        </div>

        {/* Progress bar */}
        {step <= totalSteps && <ProgressBar current={step} total={totalSteps} />}
        {step <= totalSteps && <StepIndicator current={step} total={totalSteps} />}

        <Card variant="elevated" className="shadow-strong">
          <CardContent>
            {/* =================== Étape 3 : Succès =================== */}
            {step === 3 && (
              <div className="text-center py-4">
                <div className="mx-auto h-14 w-14 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
                  <CheckCircle className="h-7 w-7 text-success-600 dark:text-success-400" />
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  {createdCenterName} {t('onboarding.success.created')}
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                  {t('onboarding.success.shareCode')}
                </p>

                {/* Code d'inscription */}
                <div className="bg-neutral-50 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl p-6 mb-6">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider font-medium">
                    {t('onboarding.success.enrollmentCode')}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-mono font-bold text-primary-600 dark:text-primary-400 tracking-widest">
                      {enrollmentCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                      title={t('onboarding.toast.codeCopied')}
                    >
                      {copied ? (
                        <Check size={20} className="text-success-600" />
                      ) : (
                        <Copy size={20} className="text-neutral-500" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  rightIcon={ArrowRight}
                  onClick={handleGoToDashboard}
                >
                  {t('onboarding.success.goToDashboard')}
                </Button>
              </div>
            )}

            {/* =================== Étape 2 : Choix du plan =================== */}
            {step === 2 && (
              <div className="space-y-5">
                {/* Toggle mensuel/annuel */}
                <div className="flex items-center justify-center gap-3">
                  <span className={`text-sm font-medium ${!annualBilling ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>
                    {t('onboarding.plan.monthly')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAnnualBilling(!annualBilling)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${annualBilling ? 'bg-primary-600' : 'bg-neutral-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${annualBilling ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-sm font-medium ${annualBilling ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>
                    {t('onboarding.plan.annual')}
                  </span>
                  {annualBilling && (
                    <span className="text-xs font-semibold text-success-600 bg-success-50 px-2 py-0.5 rounded-full">
                      -20%
                    </span>
                  )}
                </div>

                {/* Grille des plans */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {onboardingPlans.map((plan) => {
                    const price = annualBilling ? plan.priceYearly : plan.price
                    const isSelected = selectedPlan === plan.slug
                    const Icon = plan.icon
                    const features = lang === 'en' ? plan.featuresEn : plan.features
                    const name = lang === 'en' ? plan.nameKeyEn : plan.nameKey
                    return (
                      <button
                        key={plan.slug}
                        type="button"
                        onClick={() => setSelectedPlan(plan.slug)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 shadow-md'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded-lg ${plan.color}`}>
                            <Icon size={16} />
                          </div>
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                            {name}
                          </span>
                        </div>
                        <div className="mb-2">
                          <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                            {price === 0 ? t('onboarding.plan.free') : `${price}€`}
                          </span>
                          {price > 0 && <span className="text-sm text-neutral-500"> {t('onboarding.plan.htMonth')}</span>}
                          {price > 0 && (
                            <div className="text-xs text-neutral-400 mt-0.5">
                              {t('pricing.ttcPrefix')} {formatPrice(priceTTC(price))}€ TTC
                            </div>
                          )}
                        </div>
                        <ul className="space-y-1">
                          {features.map((f, i) => (
                            <li key={i} className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                              <Check size={12} className="text-success-500 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    )
                  })}
                </div>

                {/* Code d'inscription — affiché ici aussi */}
                {enrollmentCode && (
                  <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">{t('onboarding.success.enrollmentCode')}</p>
                      <span className="text-lg font-mono font-bold text-primary-600 tracking-wider">{enrollmentCode}</span>
                    </div>
                    <button onClick={handleCopyCode} className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                      {copied ? <Check size={16} className="text-success-600" /> : <Copy size={16} className="text-neutral-400" />}
                    </button>
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  rightIcon={ArrowRight}
                  onClick={() => handleSelectPlan(selectedPlan)}
                  isLoading={checkoutLoading}
                  disabled={checkoutLoading}
                >
                  {selectedPlan === 'free' ? t('onboarding.plan.startFree') : t('onboarding.plan.goToPayment')}
                </Button>

                <p className="text-xs text-neutral-400 text-center">
                  {t('onboarding.plan.changeLater')}
                </p>
              </div>
            )}

            {/* =================== Étape 1 : Compte + Centre (fusionnés) =================== */}
            {step === 1 && (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 px-4 py-3 rounded-lg">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <Input
                  type="email"
                  label={t('onboarding.field.email')}
                  placeholder={t('onboarding.field.email.placeholder')}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  leftIcon={Mail}
                  disabled={isLoading}
                  autoComplete="email"
                  required
                />

                <div className="space-y-2">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    label={t('onboarding.field.password')}
                    placeholder={t('onboarding.field.password.placeholder')}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null) }}
                    leftIcon={Lock}
                    rightIcon={showPassword ? EyeOff : Eye}
                    onRightIconClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    autoComplete="new-password"
                    required
                  />
                  {password && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-500 dark:text-neutral-400">{t('onboarding.passwordStrength')}</span>
                        <span className={`font-medium ${
                          passwordStrength.level === 1 ? 'text-error-600' :
                          passwordStrength.level === 2 ? 'text-warning-600' :
                          'text-success-600'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.level / 4) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Input
                  type="text"
                  label={t('onboarding.field.centerName')}
                  placeholder={t('onboarding.field.centerName.placeholder')}
                  value={centerName}
                  onChange={(e) => { setCenterName(e.target.value); setError(null) }}
                  leftIcon={Building2}
                  disabled={isLoading}
                  autoComplete="organization"
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  rightIcon={ArrowRight}
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  {t('onboarding.step1.cta')}
                </Button>

                {/* Micro-copy de réassurance */}
                <p className="text-xs text-neutral-400 text-center">
                  {t('onboarding.microcopy')}
                </p>
              </form>
            )}

            {/* Liens en bas (étapes 1 et 2) */}
            {step <= 2 && (
              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700 text-center space-y-2">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t('onboarding.alreadyAccount')}{' '}
                  <a
                    href="#/login"
                    className="text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
                  >
                    {t('onboarding.login')}
                  </a>
                </p>
                {step === 1 && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {t('onboarding.haveCode')}{' '}
                    <a
                      href="#/signup"
                      className="text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
                    >
                      {t('onboarding.joinCenter')}
                    </a>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
