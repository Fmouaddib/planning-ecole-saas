import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, ArrowRight, Calendar, Users, BarChart3, Sparkles } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import type { LoginForm } from '@/types'

interface LoginPageProps {
  onLogin?: (credentials: LoginForm) => Promise<void>
  onSwitchToSignup?: () => void
  isLoading?: boolean
  error?: string | null
  centerInfo?: { id: string; name: string; logoUrl?: string; slug: string }
}

function LoginPage({ onLogin, onSwitchToSignup, isLoading = false, error, centerInfo }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onLogin?.({ email, password, rememberMe })
  }

  // Center-branded initials for logo
  const centerInitials = centerInfo?.name
    ? centerInfo.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : null

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding & illustration */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] relative overflow-hidden flex-col justify-between p-10"
        style={{ background: 'linear-gradient(160deg, #FF5B46 0%, #FBA625 50%, #FF8A3D 100%)' }}
      >
        {/* Decorative shapes */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-32 -left-16 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="absolute top-1/2 right-10 w-24 h-24 rounded-2xl rotate-12 opacity-10 bg-white" />

        {/* Logo */}
        <div>
          {centerInfo ? (
            <div className="inline-flex items-center gap-3">
              {centerInfo.logoUrl ? (
                <img src={centerInfo.logoUrl} alt={centerInfo.name} className="h-11 w-11 rounded-xl object-cover shadow-lg border border-white/20" />
              ) : (
                <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                  <span className="text-white font-extrabold text-lg">{centerInitials}</span>
                </div>
              )}
              <span className="text-white font-bold text-xl tracking-tight">{centerInfo.name}</span>
            </div>
          ) : (
            <a href="#/" className="inline-flex items-center gap-3 group">
              <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                <span className="text-white font-extrabold text-xl">A</span>
              </div>
              <span className="text-white font-bold text-xl tracking-tight">AntiPlanning</span>
            </a>
          )}
        </div>

        {/* Value proposition */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-white text-3xl xl:text-4xl font-bold leading-tight mb-4">
              {centerInfo
                ? `Bienvenue sur l'espace ${centerInfo.name}`
                : 'Simplifiez la gestion de votre centre'
              }
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              {centerInfo
                ? 'Connectez-vous pour accéder à votre planning, notes et ressources.'
                : 'Planning, suivi pédagogique et collaboration en un seul outil.'
              }
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Calendar, text: 'Planning interactif drag & drop' },
              { icon: Users, text: 'Collaboration profs & étudiants' },
              { icon: BarChart3, text: 'Notes, bulletins & présences' },
              { icon: Sparkles, text: 'Visio intégrée (Zoom, Teams, Meet)' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <item.icon size={18} className="text-white" />
                </div>
                <span className="text-white/90 text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial / trust */}
        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <p className="text-white/90 text-sm italic leading-relaxed mb-3">
              "AntiPlanning a transformé notre organisation. On gagne un temps considérable sur la planification."
            </p>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">FM</div>
              <div>
                <p className="text-white text-sm font-semibold">Fahd M.</p>
                <p className="text-white/60 text-xs">Directeur, Centre ZEC</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-neutral-50 dark:bg-neutral-950">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            {centerInfo ? (
              <div className="inline-flex items-center gap-2.5">
                {centerInfo.logoUrl ? (
                  <img src={centerInfo.logoUrl} alt={centerInfo.name} className="h-10 w-10 rounded-xl object-cover shadow-md" />
                ) : (
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shadow-md"
                    style={{ background: 'linear-gradient(135deg, #FF5B46, #FBA625)' }}
                  >
                    <span className="text-white font-extrabold text-lg">{centerInitials}</span>
                  </div>
                )}
                <span className="text-neutral-900 dark:text-neutral-100 font-bold text-lg">{centerInfo.name}</span>
              </div>
            ) : (
              <a href="#/" className="inline-flex items-center gap-2.5">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shadow-md"
                  style={{ background: 'linear-gradient(135deg, #FF5B46, #FBA625)' }}
                >
                  <span className="text-white font-extrabold text-lg">A</span>
                </div>
                <span className="text-neutral-900 dark:text-neutral-100 font-bold text-lg">AntiPlanning</span>
              </a>
            )}
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              {centerInfo ? `Connexion — ${centerInfo.name}` : 'Bon retour parmi nous'}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              {centerInfo
                ? 'Entrez vos identifiants pour accéder à votre espace'
                : 'Connectez-vous pour accéder à votre espace'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 bg-error-50 dark:bg-error-950/50 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 px-4 py-3 rounded-xl">
                <div className="h-5 w-5 rounded-full bg-error-100 dark:bg-error-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-error-600 dark:text-error-400 text-xs font-bold">!</span>
                </div>
                <p className="text-sm">{error}</p>
              </div>
            )}

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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary-600 bg-white border-neutral-300 rounded focus:ring-primary-500 focus:ring-2 focus:ring-opacity-50"
                  disabled={isLoading}
                />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Se souvenir de moi</span>
              </label>
              <button
                type="button"
                onClick={() => { window.location.hash = '#/forgot-password' }}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              rightIcon={ArrowRight}
              disabled={isLoading}
              className="!rounded-xl !py-3 shadow-md hover:shadow-lg transition-shadow"
            >
              Se connecter
            </Button>
          </form>

          {/* Social login */}
          <div className="mt-7">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-neutral-50 dark:bg-neutral-950 text-neutral-400">ou continuer avec</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-400 cursor-not-allowed hover:border-neutral-300 transition-colors"
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
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-400 cursor-not-allowed hover:border-neutral-300 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                </svg>
                Microsoft
              </button>
            </div>
          </div>

          {/* Signup link */}
          <p className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Pas encore de compte ?{' '}
            <button
              onClick={onSwitchToSignup}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold transition-colors"
              disabled={isLoading}
            >
              Créer un compte
            </button>
          </p>

          {/* Back to home — mobile */}
          {!centerInfo && (
            <p className="mt-4 text-center lg:hidden">
              <a
                href="#/"
                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                &larr; Retour à l'accueil
              </a>
            </p>
          )}

          {/* Powered by AntiPlanning — center subdomain */}
          {centerInfo && (
            <p className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
              Propulsé par <span className="font-medium">AntiPlanning</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginPage
