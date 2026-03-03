import { useState, useEffect } from 'react'
import {
  Eye, EyeOff, Lock, Mail, Building2, Phone, MapPin,
  ArrowRight, ArrowLeft, User, CheckCircle, Copy, Check, Crown, Zap, Rocket
} from 'lucide-react'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { supabase, isDemoMode } from '@/lib/supabase'
import { OnboardingService } from '@/services/onboardingService'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
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
              <div className={`w-12 h-0.5 ${isDone ? 'bg-success-500' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (password.length === 0) return { level: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 2) return { level: 1, label: 'Faible', color: 'bg-error-500' }
  if (score <= 3) return { level: 2, label: 'Moyen', color: 'bg-warning-500' }
  if (score <= 4) return { level: 3, label: 'Fort', color: 'bg-success-500' }
  return { level: 4, label: 'Très fort', color: 'bg-success-600' }
}

// Plan cards pour l'étape 3
const onboardingPlans = [
  { slug: 'free', nameKey: 'Gratuit', price: 0, priceYearly: 0, icon: Zap, color: 'bg-gray-100 text-gray-600', features: ['3 enseignants', '3 salles', '50 séances/mois'] },
  { slug: 'ecole-en-ligne', nameKey: 'École en ligne', price: 59, priceYearly: 47, icon: Rocket, color: 'bg-teal-100 text-teal-600', features: ['15 enseignants', '200 étudiants', 'Visio intégrée'] },
  { slug: 'pro', nameKey: 'Pro', price: 99, priceYearly: 79, icon: Crown, color: 'bg-blue-100 text-blue-600', features: ['50 enseignants', 'Salles illimitées', 'Export & stats'] },
  { slug: 'enterprise', nameKey: 'Enterprise', price: 149, priceYearly: 119, icon: Crown, color: 'bg-purple-100 text-purple-600', features: ['Illimité', 'Multi-campus', 'SLA 99.9%'] },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { openCheckout, isLoading: checkoutLoading } = useStripeCheckout()

  // Étape 1 : Compte admin
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Étape 2 : Info centre
  const [centerName, setCenterName] = useState('')
  const [acronym, setAcronym] = useState('')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  // Étape 3 : Plan
  const [selectedPlan, setSelectedPlan] = useState('free')
  const [annualBilling, setAnnualBilling] = useState(false)

  // Résultat
  const [enrollmentCode, setEnrollmentCode] = useState<string | null>(null)

  // Parse URL params (?plan=&billing=) et checkout return (?checkout=success)
  useEffect(() => {
    const hash = window.location.hash
    const queryIndex = hash.indexOf('?')
    if (queryIndex === -1) return
    const params = new URLSearchParams(hash.slice(queryIndex))
    if (params.get('plan')) setSelectedPlan(params.get('plan')!)
    if (params.get('billing') === 'yearly') setAnnualBilling(true)
    if (params.get('checkout') === 'success') {
      toast.success('Paiement réussi ! Votre abonnement est actif.')
      // Nettoyer l'URL
      window.location.hash = '#/onboarding'
      setStep(4) // Aller directement au succès
    }
    if (params.get('checkout') === 'cancelled') {
      toast.error('Paiement annulé.')
      window.location.hash = '#/onboarding'
    }
  }, [])

  const passwordStrength = getPasswordStrength(password)

  // Nettoie l'email : trim, lowercase, suppression caractères invisibles
  const sanitizeEmail = (raw: string): string =>
    raw.trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')

  const validateStep1 = (): string | null => {
    if (!firstName.trim()) return 'Le prénom est requis'
    if (!lastName.trim()) return 'Le nom est requis'
    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail) return 'L\'email est requis'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return 'Format d\'email invalide'
    if (!password) return 'Le mot de passe est requis'
    if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères'
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre'
    }
    if (password !== confirmPassword) return 'Les mots de passe ne correspondent pas'
    return null
  }

  const validateStep2 = (): string | null => {
    if (!centerName.trim()) return 'Le nom de l\'établissement est requis'
    return null
  }

  const handleNextStep = () => {
    const err = validateStep1()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const err = validateStep2()
    if (err) {
      setError(err)
      return
    }

    if (isDemoMode) {
      setError('L\'inscription n\'est pas disponible en mode démo. Configurez les variables Supabase.')
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
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            role: 'admin',
          },
        },
      })

      if (authError) {
        // Messages d'erreur plus explicites
        if (authError.message.includes('invalid') || authError.message.includes('Invalid')) {
          throw new Error(`Adresse email refusée par le serveur. Essayez une autre adresse email ou vérifiez la configuration Supabase.`)
        }
        if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
          throw new Error('Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.')
        }
        if (authError.message.includes('rate') || authError.status === 429) {
          throw new Error('Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.')
        }
        throw authError
      }
      if (!authData.user) throw new Error('Échec de la création du compte')

      // Vérifier si l'email nécessite une confirmation
      if (authData.user.identities?.length === 0) {
        throw new Error('Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.')
      }

      // 2. Attendre que le trigger handle_new_user crée le profil
      const profileReady = await OnboardingService.waitForProfile(authData.user.id)
      if (!profileReady) throw new Error('Timeout lors de la création du profil. Veuillez réessayer.')

      // 3. Créer le centre via RPC
      const result = await OnboardingService.createCenterWithAdmin({
        centerName: centerName.trim(),
        acronym: acronym.trim() || undefined,
        address: address.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        city: city.trim() || undefined,
        phone: phone.trim() || undefined,
        email: contactEmail.trim() || undefined,
      })

      setEnrollmentCode(result.enrollment_code)
      setStep(3) // Aller à l'étape Plan
      toast.success('Établissement créé avec succès !')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création'
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
      toast.success('Code copié !')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      toast.error('Impossible de copier')
    }
  }

  const handleSelectPlan = async (planSlug: string) => {
    if (planSlug === 'free') {
      // Plan gratuit : passer directement au succès
      setStep(4)
      return
    }
    // Plan payant : rediriger vers Stripe Checkout
    await openCheckout({
      planSlug,
      billingCycle: annualBilling ? 'yearly' : 'monthly',
      successUrl: `${window.location.origin}/#/onboarding?checkout=success`,
      cancelUrl: `${window.location.origin}/#/onboarding?checkout=cancelled`,
    })
  }

  const handleGoToDashboard = () => {
    window.location.hash = '#/login'
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div className={`w-full ${step === 3 ? 'max-w-2xl' : 'max-w-lg'} transition-all`}>
        {/* Retour */}
        <a
          href="#/"
          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200 mb-4"
        >
          <ArrowLeft size={16} />
          Retour à l'accueil
        </a>

        {/* Logo */}
        <div className="text-center mb-6">
          <div
            className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 shadow-medium"
            style={{ background: 'linear-gradient(135deg, #FF5B46, #FBA625)' }}
          >
            <span className="text-white font-extrabold text-2xl">A</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-display mb-2">
            {step === 4 ? 'Félicitations !' : 'Créer mon établissement'}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {step === 1 && 'Commencez par créer votre compte administrateur'}
            {step === 2 && 'Renseignez les informations de votre établissement'}
            {step === 3 && 'Choisissez votre formule'}
            {step === 4 && 'Votre établissement est prêt à utiliser'}
          </p>
        </div>

        {step < 3 && <StepIndicator current={step} total={3} />}
        {step === 3 && <StepIndicator current={3} total={3} />}

        <Card variant="elevated" className="shadow-strong">
          <CardContent>
            {/* =================== Étape 4 : Succès =================== */}
            {step === 4 && (
              <div className="text-center py-4">
                <div className="mx-auto h-14 w-14 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
                  <CheckCircle className="h-7 w-7 text-success-600 dark:text-success-400" />
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  {acronym.trim() || centerName} est créé !
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                  Partagez ce code avec vos enseignants et étudiants pour qu'ils rejoignent votre établissement.
                </p>

                {/* Code d'inscription */}
                <div className="bg-neutral-50 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl p-6 mb-6">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider font-medium">
                    Code d'inscription
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-mono font-bold text-primary-600 dark:text-primary-400 tracking-widest">
                      {enrollmentCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                      title="Copier le code"
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
                  Accéder à mon espace
                </Button>
              </div>
            )}

            {/* =================== Étape 3 : Choix du plan =================== */}
            {step === 3 && (
              <div className="space-y-5">
                {/* Toggle mensuel/annuel */}
                <div className="flex items-center justify-center gap-3">
                  <span className={`text-sm font-medium ${!annualBilling ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>
                    Mensuel
                  </span>
                  <button
                    type="button"
                    onClick={() => setAnnualBilling(!annualBilling)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${annualBilling ? 'bg-primary-600' : 'bg-neutral-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${annualBilling ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-sm font-medium ${annualBilling ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>
                    Annuel
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
                            {plan.nameKey}
                          </span>
                        </div>
                        <div className="mb-2">
                          <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                            {price === 0 ? 'Gratuit' : `${price}€`}
                          </span>
                          {price > 0 && <span className="text-sm text-neutral-500">/mois</span>}
                        </div>
                        <ul className="space-y-1">
                          {plan.features.map((f, i) => (
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
                  {selectedPlan === 'free' ? 'Commencer gratuitement' : 'Continuer vers le paiement'}
                </Button>

                <p className="text-xs text-neutral-400 text-center">
                  Vous pourrez changer de plan à tout moment depuis votre profil.
                </p>
              </div>
            )}

            {/* =================== Étape 1 : Compte =================== */}
            {step === 1 && (
              <form
                onSubmit={(e) => { e.preventDefault(); handleNextStep() }}
                className="space-y-5"
              >
                {error && (
                  <div className="bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 px-4 py-3 rounded-lg">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="text"
                    label="Prénom"
                    placeholder="Jean"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setError(null) }}
                    leftIcon={User}
                    disabled={isLoading}
                    required
                  />
                  <Input
                    type="text"
                    label="Nom"
                    placeholder="Dupont"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); setError(null) }}
                    disabled={isLoading}
                    required
                  />
                </div>

                <Input
                  type="email"
                  label="Adresse email"
                  placeholder="jean.dupont@etablissement.fr"
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
                    label="Mot de passe"
                    placeholder="Minimum 8 caractères"
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
                        <span className="text-neutral-500 dark:text-neutral-400">Force du mot de passe</span>
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
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirmer le mot de passe"
                  placeholder="Retapez votre mot de passe"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null) }}
                  leftIcon={Lock}
                  rightIcon={showConfirmPassword ? EyeOff : Eye}
                  onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  rightIcon={ArrowRight}
                >
                  Suivant
                </Button>
              </form>
            )}

            {/* =================== Étape 2 : Centre =================== */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 px-4 py-3 rounded-lg">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <Input
                  type="text"
                  label="Nom de l'établissement"
                  placeholder="Ex: Institut Supérieur de Paris"
                  value={centerName}
                  onChange={(e) => { setCenterName(e.target.value); setError(null) }}
                  leftIcon={Building2}
                  disabled={isLoading}
                  required
                />

                <Input
                  type="text"
                  label="Acronyme / Sigle"
                  placeholder="Ex: ISP"
                  value={acronym}
                  onChange={(e) => setAcronym(e.target.value)}
                  disabled={isLoading}
                  helper="Facultatif — sera utilisé comme nom court dans l'application"
                />

                <Input
                  type="text"
                  label="Adresse"
                  placeholder="123 rue de l'Éducation"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  leftIcon={MapPin}
                  disabled={isLoading}
                  helper="Facultatif"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="text"
                    label="Code postal"
                    placeholder="75001"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    disabled={isLoading}
                    helper="Facultatif"
                  />
                  <Input
                    type="text"
                    label="Ville"
                    placeholder="Paris"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={isLoading}
                    helper="Facultatif"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="tel"
                    label="Téléphone"
                    placeholder="01 23 45 67 89"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leftIcon={Phone}
                    disabled={isLoading}
                    helper="Facultatif"
                  />
                  <Input
                    type="email"
                    label="Email de contact"
                    placeholder="contact@ecole.fr"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    leftIcon={Mail}
                    disabled={isLoading}
                    helper="Facultatif"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => { setStep(1); setError(null) }}
                    disabled={isLoading}
                  >
                    <ArrowLeft size={18} className="mr-1" />
                    Retour
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isLoading}
                    rightIcon={ArrowRight}
                    disabled={isLoading}
                  >
                    Créer mon établissement
                  </Button>
                </div>
              </form>
            )}

            {/* Lien vers connexion (étapes 1 et 2) */}
            {step < 3 && (
              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700 text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Déjà un compte ?{' '}
                  <a
                    href="#/login"
                    className="text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
                  >
                    Se connecter
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
