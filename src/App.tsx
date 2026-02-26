import { useState, useEffect, lazy, Suspense } from 'react'
import { LoginPage, SignupPage } from '@/pages/auth'
import { DashboardPage } from '@/pages/dashboard'
import { User, LoginForm, SignupForm } from '@/types'
import { LoadingState } from '@/components/ui'

const LandingPage = lazy(() => import('@/components/landing/LandingPage'))

// Types pour l'état de l'application
type AppState = 'loading' | 'authenticated' | 'unauthenticated'

// Mock data pour le développement
const mockUser: User = {
  id: '1',
  email: 'jean.martin@supinfo.com',
  firstName: 'Jean',
  lastName: 'Martin',
  role: 'teacher',
  schoolId: 'school-1',
  establishmentId: 'school-1',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [currentPath, setCurrentPath] = useState('/')
  const [_user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [hash, setHash] = useState(window.location.hash)

  // Simulation de vérification d'authentification au démarrage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Simuler une vérification de token/session
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Pour le développement, on peut forcer l'authentification
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
        
        if (isAuthenticated) {
          setUser(mockUser)
          setAppState('authenticated')
        } else {
          setAppState('unauthenticated')
        }
      } catch (error) {
        console.error('Erreur de vérification d\'authentification:', error)
        setAppState('unauthenticated')
      }
    }

    checkAuth()
  }, [])

  // Listen to hash changes for landing/auth routing
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleLogin = async (credentials: LoginForm): Promise<void> => {
    setIsLoading(true)
    setAuthError(null)

    try {
      // Simulation d'une requête de connexion
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mode démo : accepter tout identifiant non vide
      if (!credentials.email || !credentials.password) {
        throw new Error('Veuillez remplir tous les champs')
      }

      setUser({
        ...mockUser,
        email: credentials.email,
      })
      setAppState('authenticated')
      localStorage.setItem('isAuthenticated', 'true')

      if (credentials.rememberMe) {
        localStorage.setItem('rememberUser', 'true')
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Erreur de connexion')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (userData: SignupForm): Promise<void> => {
    setIsLoading(true)
    setAuthError(null)

    try {
      // Simulation d'une requête d'inscription
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Pour le développement, on simule une inscription réussie
      const newUser: User = {
        id: Date.now().toString(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        schoolId: 'school-1',
        establishmentId: 'school-1',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setUser(newUser)
      setAppState('authenticated')
      localStorage.setItem('isAuthenticated', 'true')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Erreur d\'inscription')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setAppState('unauthenticated')
    setCurrentPath('/')
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('rememberUser')
  }

  const handleNavigate = (path: string) => {
    setCurrentPath(path)
    // Dans une vraie application, on utiliserait un routeur comme React Router
    console.log(`Navigation vers: ${path}`)
  }

  const _handleForgotPassword = (_email: string) => {
    console.log(`Mot de passe oublié pour: ${_email}`)
    // Implémenter la logique de récupération de mot de passe
  }

  // Ces handlers seront utilisés quand les pages accepteront les props
  void handleLogout
  void _handleForgotPassword

  // États de chargement et d'erreur
  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingState size="lg" text="Chargement de l'application..." />
      </div>
    )
  }

  // Pages d'authentification / Landing
  if (appState === 'unauthenticated') {
    if (hash === '#/login') {
      return (
        <LoginPage
          onLogin={handleLogin}
          onSwitchToSignup={() => { window.location.hash = '#/signup' }}
          isLoading={isLoading}
          error={authError}
        />
      )
    }

    if (hash === '#/signup') {
      return (
        <SignupPage
          onSignup={handleSignup}
          onSwitchToLogin={() => { window.location.hash = '#/login' }}
          isLoading={isLoading}
          error={authError}
        />
      )
    }

    // Default: show landing page
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
            <LoadingState size="lg" text="Chargement..." />
          </div>
        }
      >
        <LandingPage />
      </Suspense>
    )
  }

  // Application principale
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Router simulation - dans une vraie app, utiliser React Router */}
      {currentPath === '/' && (
        <DashboardPage />
      )}
      
      {/* Ici on ajouterait les autres routes pour:
          - /planning - Interface de planning
          - /rooms - Gestion des salles
          - /users - Gestion des utilisateurs
          - /settings - Paramètres
          - /profile - Profil utilisateur
          etc.
      */}
      
      {currentPath !== '/' && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">
              Page en cours de développement
            </h1>
            <p className="text-neutral-600 mb-6">
              La page "{currentPath}" sera bientôt disponible.
            </p>
            <button
              onClick={() => handleNavigate('/')}
              className="btn-primary"
            >
              Retour au dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}