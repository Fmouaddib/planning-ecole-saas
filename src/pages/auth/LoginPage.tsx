import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react'
import { Button, Input, Card, CardContent } from '@/components/ui'
import type { LoginForm } from '@/types'

interface LoginPageProps {
  onLogin?: (credentials: LoginForm) => Promise<void>
  onSwitchToSignup?: () => void
  isLoading?: boolean
  error?: string | null
}

function LoginPage({ onLogin, onSwitchToSignup, isLoading = false, error }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onLogin?.({ email, password, rememberMe })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Retour accueil */}
        <a
          href="#/"
          className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200 mb-4"
        >
          &larr; Retour &agrave; l&apos;accueil
        </a>

        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div
            className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 shadow-medium"
            style={{ background: 'linear-gradient(135deg, #FF5B46, #FBA625)' }}
          >
            <span className="text-white font-extrabold text-2xl">A</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 font-display mb-2">
            Connectez-vous
          </h1>
          <p className="text-neutral-600">
            Accédez à votre espace AntiPlanning
          </p>
        </div>

        {/* Formulaire de connexion */}
        <Card variant="elevated" className="shadow-strong">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Erreur globale */}
              {error && (
                <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Email */}
              <Input
                type="email"
                label="Adresse email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={Mail}
                disabled={isLoading}
                autoComplete="email"
                required
              />

              {/* Mot de passe */}
              <Input
                type={showPassword ? 'text' : 'password'}
                label="Mot de passe"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={Lock}
                rightIcon={showPassword ? EyeOff : Eye}
                onRightIconClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />

              {/* Se souvenir de moi + Mot de passe oublié */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-primary-600 bg-white border-neutral-300 rounded focus:ring-primary-500 focus:ring-2 focus:ring-opacity-50"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-neutral-600">Se souvenir de moi</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {/* Bouton de connexion */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                rightIcon={ArrowRight}
                disabled={isLoading}
              >
                Se connecter
              </Button>
            </form>

            {/* Séparateur social */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-neutral-500">ou continuer avec</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-lg bg-white text-sm font-medium text-neutral-400 cursor-not-allowed"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-lg bg-white text-sm font-medium text-neutral-400 cursor-not-allowed"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                  </svg>
                  Microsoft
                </button>
              </div>
            </div>

            {/* Lien vers inscription */}
            <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
              <p className="text-sm text-neutral-600">
                Pas encore de compte ?{' '}
                <button
                  onClick={onSwitchToSignup}
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
                  disabled={isLoading}
                >
                  Créer un compte
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
