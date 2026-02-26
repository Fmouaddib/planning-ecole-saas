import { useState } from 'react'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onLogin?.({ email, password, rememberMe })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <a
            href="#/"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200 mb-4"
          >
            &larr; Retour &agrave; l&apos;accueil
          </a>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connectez-vous à votre compte
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou{' '}
            <button
              onClick={onSwitchToSignup}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              créez un nouveau compte
            </button>
          </p>
        </div>

        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="form-label">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="form-input"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="form-input"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-600">Se souvenir de moi</span>
              </label>
            </div>

            <div>
              <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage