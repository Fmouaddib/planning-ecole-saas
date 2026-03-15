import { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff, CheckCircle, Mail, AlertTriangle, Loader2 } from 'lucide-react'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { supabase } from '@/lib/supabase'

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

interface SetupAccountPageProps {
  tokenHash: string
}

export default function SetupAccountPage({ tokenHash }: SetupAccountPageProps) {
  const [step, setStep] = useState<'verifying' | 'form' | 'done' | 'error'>('verifying')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordStrength = getPasswordStrength(password)

  // Step 1: Verify the token to create a session
  useEffect(() => {
    let cancelled = false

    async function verifyToken() {
      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })

        if (cancelled) return

        if (verifyError) {
          if (import.meta.env.DEV) console.error('[SetupAccount] verifyOtp error:', verifyError)
          // Clear token from URL even on error to prevent replay attempts
          history.replaceState(null, '', window.location.pathname + '#/setup-account')
          setError('Le lien d\'invitation est invalide ou a expiré. Contactez votre administrateur pour recevoir un nouveau lien.')
          setStep('error')
          return
        }

        // Extract email from the session
        const userEmail = data.user?.email || data.session?.user?.email || ''
        setEmail(userEmail)
        // Clear token from URL to prevent replay
        history.replaceState(null, '', window.location.pathname + '#/setup-account')
        setStep('form')
      } catch (err) {
        if (cancelled) return
        if (import.meta.env.DEV) console.error('[SetupAccount] unexpected error:', err)
        history.replaceState(null, '', window.location.pathname + '#/setup-account')
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setStep('error')
      }
    }

    verifyToken()
    return () => { cancelled = true }
  }, [tokenHash])

  const validate = (): string | null => {
    if (!password) return 'Le mot de passe est requis'
    if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères'
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    }
    if (password !== confirmPassword) return 'Les mots de passe ne correspondent pas'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du mot de passe')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div
            className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 shadow-medium"
            style={{ background: 'linear-gradient(135deg, #FF5B46, #FBA625)' }}
          >
            <span className="text-white font-extrabold text-2xl">A</span>
          </div>

          {step === 'verifying' && (
            <>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-display mb-2">
                Activation du compte
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Vérification de votre invitation en cours...
              </p>
            </>
          )}

          {step === 'form' && (
            <>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-display mb-2">
                Créer votre compte
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Choisissez un mot de passe pour activer votre compte
              </p>
            </>
          )}

          {step === 'done' && (
            <>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-display mb-2">
                Compte activé !
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Votre compte est prêt à utiliser
              </p>
            </>
          )}

          {step === 'error' && (
            <>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-display mb-2">
                Lien invalide
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Impossible d'activer votre compte
              </p>
            </>
          )}
        </div>

        <Card variant="elevated" className="shadow-strong">
          <CardContent>
            {/* Loading state */}
            {step === 'verifying' && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-4" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Vérification de votre invitation...
                </p>
              </div>
            )}

            {/* Error state */}
            {step === 'error' && (
              <div className="text-center py-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-error-600 dark:text-error-400" />
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                  {error}
                </p>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => { window.location.hash = '#/login' }}
                >
                  Aller à la page de connexion
                </Button>
              </div>
            )}

            {/* Success state */}
            {step === 'done' && (
              <div className="text-center py-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-success-600 dark:text-success-400" />
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  Votre compte est activé !
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                  Votre mot de passe a été créé avec succès. Vous pouvez maintenant accéder à votre espace.
                </p>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    window.location.hash = ''
                    window.location.reload()
                  }}
                >
                  Accéder à mon espace
                </Button>
              </div>
            )}

            {/* Form state */}
            {step === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 px-4 py-3 rounded-lg">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {/* Email (read-only) */}
                <Input
                  type="email"
                  label="Adresse email"
                  value={email}
                  leftIcon={Mail}
                  disabled
                  readOnly
                />

                {/* Password */}
                <div className="space-y-2">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    label="Mot de passe"
                    placeholder="Choisissez un mot de passe"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null) }}
                    leftIcon={Lock}
                    rightIcon={showPassword ? EyeOff : Eye}
                    onRightIconClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    autoComplete="new-password"
                    autoFocus
                    required
                  />

                  {/* Strength indicator */}
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

                {/* Confirm password */}
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirmer le mot de passe"
                  placeholder="Confirmez votre mot de passe"
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
                  isLoading={isLoading}
                  disabled={isLoading || !password || !confirmPassword}
                >
                  Activer mon compte
                </Button>

                <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">
                  En activant votre compte, vous acceptez les conditions d'utilisation d'AntiPlanning.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
