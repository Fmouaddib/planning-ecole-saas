import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const SignupPage = lazy(() => import('@/pages/auth/SignupPage').then(m => ({ default: m.SignupPage })))
import { Layout } from '@/components/layout'
import { User, LoginForm, SignupForm } from '@/types'
import { LoadingState } from '@/components/ui'
const SuperAdminApp = lazy(() => import('@/components/super-admin/SuperAdminApp').then(m => ({ default: m.SuperAdminApp })))
import { ROUTES } from '@/utils/constants'
import { isTeacherRole, isStudentRole } from '@/utils/helpers'
import { parseFullName } from '@/utils/transforms'
import { supabase, isDemoMode } from '@/lib/supabase'
import { OnboardingService } from '@/services/onboardingService'
import { clearImpersonation, getImpersonation, IMPERSONATION_EVENT } from '@/utils/impersonation'
import { ImpersonationBanner } from '@/components/ui/ImpersonationBanner'
import toast, { Toaster } from 'react-hot-toast'

const LandingPage = lazy(() => import('@/components/landing/LandingPage'))
const FeaturesPage = lazy(() => import('@/pages/landing/FeaturesPage'))
const HowItWorksPage = lazy(() => import('@/pages/landing/HowItWorksPage'))
const AboutPage = lazy(() => import('@/pages/landing/AboutPage'))
const OnlineSchoolPage = lazy(() => import('@/pages/landing/OnlineSchoolPage'))
const PricingPage = lazy(() => import('@/pages/landing/PricingPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const OnboardingPage = lazy(() => import('@/pages/auth/OnboardingPage'))
const CheckoutSuccessPage = lazy(() => import('@/pages/checkout/CheckoutSuccessPage'))

// Lazy-loaded pages
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const RoomsPage = lazy(() => import('@/pages/rooms/RoomsPage'))
const BookingsPage = lazy(() => import('@/pages/bookings/BookingsPage'))
const UsersPage = lazy(() => import('@/pages/users/UsersPage'))
const CalendarPage = lazy(() => import('@/pages/calendar/CalendarPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))
const HelpPage = lazy(() => import('@/pages/help/HelpPage'))
const AcademicPage = lazy(() => import('@/pages/academic/AcademicPage'))
const VisioPage = lazy(() => import('@/pages/visio/VisioPage'))
const EmailsPage = lazy(() => import('@/pages/emails/EmailsPage'))
const MyClassPage = lazy(() => import('@/pages/my-class/MyClassPage'))
const AttendancePage = lazy(() => import('@/pages/attendance/AttendancePage'))
const GradesPage = lazy(() => import('@/pages/grades/GradesPage'))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage'))
const TeacherCollabPage = lazy(() => import('@/pages/teacher-collab/TeacherCollabPage'))
const BillingPage = lazy(() => import('@/pages/billing/BillingPage'))
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'))

// Types pour l'état de l'application
type AppState = 'loading' | 'authenticated' | 'unauthenticated'

// Mock data pour le développement
const mockUser: User = {
  id: '1',
  email: 'jean.martin@supinfo.com',
  firstName: 'Jean',
  lastName: 'Martin',
  role: 'admin',
  schoolId: 'school-1',
  establishmentId: 'school-1',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

// Route mapping
const routeComponents: Record<string, React.LazyExoticComponent<() => JSX.Element> | React.LazyExoticComponent<React.ComponentType<any>>> = {
  [ROUTES.ROOMS]: RoomsPage,
  [ROUTES.BOOKINGS]: BookingsPage,
  [ROUTES.USERS]: UsersPage,
  [ROUTES.PLANNING]: CalendarPage,
  [ROUTES.ANALYTICS]: AnalyticsPage,
  [ROUTES.PROFILE]: ProfilePage,
  [ROUTES.ACADEMIC]: AcademicPage,
  [ROUTES.HELP]: HelpPage,
  [ROUTES.VISIO]: VisioPage,
  [ROUTES.MY_CLASS]: MyClassPage,
  [ROUTES.EMAILS]: EmailsPage,
  [ROUTES.ATTENDANCE]: AttendancePage,
  [ROUTES.GRADES]: GradesPage,
  [ROUTES.NOTIFICATIONS]: NotificationsPage,
  [ROUTES.TEACHER_COLLAB]: TeacherCollabPage,
  [ROUTES.BILLING]: BillingPage,
  [ROUTES.CHAT]: ChatPage,
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [currentPath, setCurrentPath] = useState('/')
  const [_user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [hash, setHash] = useState(window.location.hash)

  // Impersonation : recalculer le user effectif quand l'impersonation change
  const [_impTick, setImpTick] = useState(0)
  useEffect(() => {
    const onImp = () => {
      setImpTick(t => t + 1)
      // Quand l'impersonation change, revenir au dashboard pour éviter d'atterrir sur une page interdite
      setCurrentPath('/')
    }
    window.addEventListener(IMPERSONATION_EVENT, onImp)
    return () => window.removeEventListener(IMPERSONATION_EVENT, onImp)
  }, [])

  const effectiveUser = useMemo(() => {
    if (!_user) return null
    if (_user.role !== 'super_admin') return _user
    const imp = getImpersonation()
    if (!imp) return _user
    const overrides: Partial<User> = {
      establishmentId: imp.centerId,
    }
    if (imp.userRole) overrides.role = imp.userRole as User['role']
    if (imp.userId) {
      overrides.id = imp.userId
      if (imp.userName) {
        const parts = imp.userName.trim().split(/\s+/)
        overrides.firstName = parts[0] || ''
        overrides.lastName = parts.slice(1).join(' ') || ''
      }
      if (imp.userEmail) overrides.email = imp.userEmail
    }
    return { ..._user, ...overrides }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_user, _impTick])

  // Vérification d'authentification au démarrage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (isDemoMode) {
          // Mode démo : utiliser localStorage
          const isAuth = localStorage.getItem('isAuthenticated') === 'true'
          if (isAuth) {
            setUser(mockUser)
            setAppState('authenticated')
          } else {
            setAppState('unauthenticated')
          }
          return
        }

        // Mode réel : vérifier la session Supabase
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          // Récupérer le profil depuis Supabase
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, center_id')
            .eq('id', session.user.id)
            .single()

          if (profile) {
            const { firstName, lastName } = parseFullName(profile.full_name)
            setUser({
              id: profile.id,
              email: profile.email,
              firstName,
              lastName,
              role: profile.role || 'student',
              schoolId: profile.center_id,
              establishmentId: profile.center_id,
              isActive: true,
              createdAt: '',
              updatedAt: '',
            })
            setAppState('authenticated')
          } else {
            setAppState('unauthenticated')
          }
        } else {
          setAppState('unauthenticated')
        }
      } catch (error) {
        console.error('Erreur de vérification d\'authentification:', error)
        setAppState('unauthenticated')
      }
    }

    checkAuth()

    // Écouter les changements de session Supabase
    if (!isDemoMode) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, email, full_name, role, center_id')
              .eq('id', session.user.id)
              .single()

            if (profile) {
              const { firstName, lastName } = parseFullName(profile.full_name)
              setUser({
                id: profile.id,
                email: profile.email,
                firstName,
                lastName,
                role: profile.role || 'student',
                schoolId: profile.center_id,
                establishmentId: profile.center_id,
                isActive: true,
                createdAt: '',
                updatedAt: '',
              })
              setAppState('authenticated')
            }
          } else if (event === 'PASSWORD_RECOVERY') {
            window.location.hash = '#/reset-password'
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
            setAppState('unauthenticated')
          }
        }
      )

      return () => subscription.unsubscribe()
    }
  }, [])

  // Listen to hash changes for landing/auth routing
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Gérer le retour Stripe Checkout (?checkout=cancelled — success est géré par #/checkout-success)
  useEffect(() => {
    const handleCheckoutReturn = () => {
      const h = window.location.hash
      const qIdx = h.indexOf('?')
      if (qIdx === -1) return
      const params = new URLSearchParams(h.slice(qIdx))
      if (params.get('checkout') === 'cancelled') {
        toast.error('Paiement annulé. Vous pouvez réessayer à tout moment.')
        const basePath = h.slice(0, qIdx) || '#/'
        window.location.hash = basePath
      }
    }
    handleCheckoutReturn()
    window.addEventListener('hashchange', handleCheckoutReturn)
    return () => window.removeEventListener('hashchange', handleCheckoutReturn)
  }, [])

  const handleLogin = async (credentials: LoginForm): Promise<void> => {
    setIsLoading(true)
    setAuthError(null)

    try {
      if (!credentials.email || !credentials.password) {
        throw new Error('Veuillez remplir tous les champs')
      }

      if (isDemoMode) {
        // Mode démo : accepter tout identifiant
        await new Promise(resolve => setTimeout(resolve, 1500))
        setUser({ ...mockUser, email: credentials.email })
        setAppState('authenticated')
        localStorage.setItem('isAuthenticated', 'true')
      } else {
        // Mode réel : connexion Supabase
        console.log('[Login] Tentative signInWithPassword...')
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })

        if (error) {
          console.error('[Login] signInWithPassword error:', error)
          throw error
        }

        console.log('[Login] signInWithPassword OK, session:', !!data.session, 'user:', !!data.session?.user)

        if (!data.session?.user) {
          throw new Error('Session invalide après connexion')
        }

        // Récupérer le profil
        console.log('[Login] Query profiles pour', data.session.user.id)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, center_id')
          .eq('id', data.session.user.id)
          .single()

        if (profileError) {
          console.error('[Login] Profile query error:', profileError)
          throw new Error('Erreur chargement profil: ' + profileError.message)
        }

        if (!profile) {
          throw new Error('Profil introuvable')
        }

        console.log('[Login] Profile OK:', profile.email, 'role:', profile.role, 'center:', profile.center_id)
        const { firstName, lastName } = parseFullName(profile.full_name)
        setUser({
          id: profile.id,
          email: profile.email,
          firstName,
          lastName,
          role: profile.role || 'student',
          schoolId: profile.center_id,
          establishmentId: profile.center_id,
          isActive: true,
          createdAt: '',
          updatedAt: '',
        })
        setAppState('authenticated')
        console.log('[Login] Authentification réussie')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur de connexion'
      console.error('[Login] ERREUR:', msg, error)
      setAuthError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (userData: SignupForm): Promise<void> => {
    setIsLoading(true)
    setAuthError(null)

    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 2000))
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
      } else {
        // Mode réel : inscription Supabase
        const cleanEmail = userData.email.trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
        const { data: authData, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: userData.password,
          options: {
            data: {
              full_name: `${userData.firstName} ${userData.lastName}`,
              role: userData.role || 'student',
            },
          },
        })
        if (error) {
          if (error.message.includes('rate') || error.status === 429) {
            throw new Error('Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.')
          }
          if (error.message.includes('already registered') || error.message.includes('already been registered')) {
            throw new Error('Cette adresse email est déjà utilisée.')
          }
          throw error
        }
        if (!authData.user) throw new Error('Échec de la création du compte')

        // Vérifier si l'email est déjà enregistré (identities vide = doublon)
        if (authData.user.identities?.length === 0) {
          throw new Error('Cette adresse email est déjà utilisée.')
        }

        // Si un code établissement est fourni, rejoindre le centre
        if (userData.schoolCode?.trim()) {
          const profileReady = await OnboardingService.waitForProfile(authData.user.id)
          if (!profileReady) throw new Error('Timeout lors de la création du profil')

          await OnboardingService.joinCenterByCode(userData.schoolCode, userData.role || 'student')
          toast.success('Inscription réussie ! Bienvenue dans votre établissement.')
        }
        // Le onAuthStateChange va mettre à jour l'état
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Erreur d\'inscription')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    clearImpersonation()
    if (!isDemoMode) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setAppState('unauthenticated')
    setCurrentPath('/')
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('rememberUser')
  }

  const handleNavigate = (path: string) => {
    setCurrentPath(path)
  }

  // Le thème est appliqué par le script inline dans index.html (pas de FOUC)

  // États de chargement et d'erreur
  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <LoadingState size="lg" text="Chargement de l'application..." />
      </div>
    )
  }

  // Route reset-password accessible avec ou sans session (recovery token crée une session)
  if (hash === '#/reset-password') {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
            <LoadingState size="lg" text="Chargement..." />
          </div>
        }
      >
        <Toaster position="top-center" />
        <ResetPasswordPage />
      </Suspense>
    )
  }

  // Pages d'authentification / Landing
  if (appState === 'unauthenticated') {
    if (hash === '#/login') {
      return (
        <Suspense fallback={<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center"><LoadingState size="lg" text="Chargement..." /></div>}>
          <Toaster position="top-center" />
          <LoginPage
            onLogin={handleLogin}
            onSwitchToSignup={() => { window.location.hash = '#/signup' }}
            isLoading={isLoading}
            error={authError}
          />
        </Suspense>
      )
    }

    if (hash === '#/signup') {
      return (
        <Suspense fallback={<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center"><LoadingState size="lg" text="Chargement..." /></div>}>
          <SignupPage
            onSignup={handleSignup}
            onSwitchToLogin={() => { window.location.hash = '#/login' }}
            isLoading={isLoading}
            error={authError}
          />
        </Suspense>
      )
    }

    if (hash === '#/forgot-password') {
      return (
        <Suspense
          fallback={
            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
              <LoadingState size="lg" text="Chargement..." />
            </div>
          }
        >
          <ForgotPasswordPage />
        </Suspense>
      )
    }

    if (hash === '#/checkout-success' || hash.startsWith('#/checkout-success?')) {
      const hashParams = new URLSearchParams(hash.split('?')[1] || '')
      return (
        <Suspense
          fallback={
            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
              <LoadingState size="lg" text="Chargement..." />
            </div>
          }
        >
          <CheckoutSuccessPage
            checkoutType={hashParams.get('type') || 'plan'}
            addonType={hashParams.get('addon_type') || undefined}
            addonName={decodeURIComponent(hashParams.get('addon_name') || '')}
          />
        </Suspense>
      )
    }

    if (hash === '#/onboarding' || hash.startsWith('#/onboarding?')) {
      return (
        <Suspense
          fallback={
            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
              <LoadingState size="lg" text="Chargement..." />
            </div>
          }
        >
          <OnboardingPage />
        </Suspense>
      )
    }

    // Detail pages
    const landingSuspense = (Component: React.LazyExoticComponent<() => JSX.Element>) => (
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
            <LoadingState size="lg" text="Chargement..." />
          </div>
        }
      >
        <Component />
      </Suspense>
    )

    if (hash === '#/features') return landingSuspense(FeaturesPage)
    if (hash === '#/how-it-works') return landingSuspense(HowItWorksPage)
    if (hash === '#/about') return landingSuspense(AboutPage)
    if (hash === '#/ecole-en-ligne') return landingSuspense(OnlineSchoolPage)
    if (hash === '#/pricing') return landingSuspense(PricingPage)

    // Default: show landing page
    return landingSuspense(LandingPage)
  }

  // Page de succès Stripe Checkout
  if (hash === '#/checkout-success' || hash.startsWith('#/checkout-success?')) {
    const hashParams = new URLSearchParams(hash.split('?')[1] || '')
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
            <LoadingState size="lg" text="Chargement..." />
          </div>
        }
      >
        <CheckoutSuccessPage
          checkoutType={hashParams.get('type') || 'plan'}
          addonType={hashParams.get('addon_type') || undefined}
          addonName={decodeURIComponent(hashParams.get('addon_name') || '')}
        />
      </Suspense>
    )
  }

  // Pricing accessible aux utilisateurs authentifiés (upgrade depuis ProfilePage)
  if (hash === '#/pricing' || hash.startsWith('#/pricing?')) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
            <LoadingState size="lg" text="Chargement..." />
          </div>
        }
      >
        <PricingPage />
      </Suspense>
    )
  }

  // Super Admin space
  if (hash.startsWith('#/super-admin')) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
            <LoadingState size="lg" text="Chargement super-admin..." />
          </div>
        }
      >
        <SuperAdminApp
          user={_user ? { email: _user.email, firstName: _user.firstName, lastName: _user.lastName, role: _user.role } : null}
          onLogout={handleLogout}
        />
      </Suspense>
    )
  }

  // Render the current page based on path
  const renderPage = () => {
    // Route guards : les professeurs n'ont pas accès aux pages admin
    const teacherForbiddenRoutes: string[] = [ROUTES.ROOMS, ROUTES.USERS, ROUTES.ANALYTICS, ROUTES.ACADEMIC, ROUTES.SETTINGS, ROUTES.VISIO, ROUTES.EMAILS, ROUTES.MY_CLASS, ROUTES.BILLING]
    if (isTeacherRole(effectiveUser?.role) && teacherForbiddenRoutes.includes(currentPath)) {
      handleNavigate('/')
      return <DashboardPage onNavigate={handleNavigate} />
    }

    // Route guards : les étudiants n'ont accès qu'au dashboard et au planning
    const studentForbiddenRoutes: string[] = [ROUTES.ROOMS, ROUTES.USERS, ROUTES.ANALYTICS, ROUTES.ACADEMIC, ROUTES.SETTINGS, ROUTES.BOOKINGS, ROUTES.VISIO, ROUTES.EMAILS, ROUTES.TEACHER_COLLAB, ROUTES.BILLING]
    if (isStudentRole(effectiveUser?.role) && studentForbiddenRoutes.includes(currentPath)) {
      handleNavigate('/')
      return <DashboardPage onNavigate={handleNavigate} />
    }

    if (currentPath === '/' || currentPath === ROUTES.HOME) {
      return <DashboardPage onNavigate={handleNavigate} />
    }

    if (currentPath === ROUTES.PROFILE) {
      return <ProfilePage onLogout={handleLogout} />
    }

    if (currentPath === ROUTES.SETTINGS) {
      return <SettingsPage onLogout={handleLogout} onNavigate={handleNavigate} />
    }

    const PageComponent = routeComponents[currentPath]
    if (PageComponent) {
      return <PageComponent />
    }

    // Fallback for unknown routes
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Page introuvable
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            La page &quot;{currentPath}&quot; n'existe pas.
          </p>
          <button
            onClick={() => handleNavigate('/')}
            className="btn-primary"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    )
  }

  // Application principale
  return (
    <>
      <ImpersonationBanner />
      <Layout
        user={effectiveUser}
        currentPath={currentPath}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20 dark:bg-neutral-950">
              <LoadingState size="lg" text="Chargement de la page..." />
            </div>
          }
        >
          {renderPage()}
        </Suspense>
      </Layout>
    </>
  )
}
