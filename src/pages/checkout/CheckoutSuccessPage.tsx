import { useEffect, useState } from 'react'
import { CheckCircle, ArrowRight, Sparkles, Loader2, ClipboardCheck, GraduationCap, UserCog, Mail, Users } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAddonInfo } from '@/hooks/useAddonInfo'
import { ROUTES } from '@/utils/constants'

type Phase = 'verifying' | 'success' | 'fallback'

interface CheckoutSuccessPageProps {
  checkoutType?: string  // 'addon' | 'plan'
  addonType?: string     // 'attendance' | 'grades' | 'teacher' | 'email' | 'student'
  addonName?: string     // Display name, e.g. "Pack Présences"
}

const ADDON_ROUTES: Record<string, string> = {
  attendance: ROUTES.ATTENDANCE,
  grades: ROUTES.GRADES,
  teacher: ROUTES.TEACHER_COLLAB,
  email: ROUTES.EMAILS,
  student: ROUTES.USERS,
}

const ADDON_ICONS: Record<string, typeof CheckCircle> = {
  attendance: ClipboardCheck,
  grades: GraduationCap,
  teacher: UserCog,
  email: Mail,
  student: Users,
}

const ADDON_LABELS: Record<string, { fr: string; en: string }> = {
  attendance: { fr: 'Suivi des présences', en: 'Attendance Tracking' },
  grades: { fr: 'Notes et évaluations', en: 'Grades & Evaluations' },
  teacher: { fr: 'Collaboration enseignants', en: 'Teacher Collaboration' },
  email: { fr: 'Templates email', en: 'Email Templates' },
  student: { fr: 'Gestion étudiants', en: 'Student Management' },
}

const ADDON_STEPS: Record<string, { fr: string; en: string }> = {
  attendance: { fr: 'Marquez les présences de vos prochaines séances', en: 'Mark attendance for your upcoming sessions' },
  grades: { fr: 'Créez votre première évaluation', en: 'Create your first evaluation' },
  teacher: { fr: 'Envoyez une demande de disponibilité', en: 'Send an availability request' },
  email: { fr: 'Configurez vos templates email', en: 'Configure your email templates' },
  student: { fr: 'Importez vos étudiants', en: 'Import your students' },
}

export default function CheckoutSuccessPage({ checkoutType = 'plan', addonType, addonName }: CheckoutSuccessPageProps) {
  const [phase, setPhase] = useState<Phase>(checkoutType === 'addon' && addonType ? 'verifying' : 'fallback')
  const { pollForAddon } = useAddonInfo()

  const lang = (localStorage.getItem('antiplanning-lang') === 'en' ? 'en' : 'fr') as 'fr' | 'en'

  // Poll for addon activation
  useEffect(() => {
    if (phase !== 'verifying' || !addonType) return

    let cancelled = false

    const check = async () => {
      const found = await pollForAddon(addonType)
      if (cancelled) return
      setPhase(found ? 'success' : 'fallback')
    }

    check()

    return () => { cancelled = true }
  }, [phase, addonType, pollForAddon])

  const navigateTo = (route: string) => {
    window.location.hash = `#${route}`
    // Force reload to refresh addon state in the app
    window.location.reload()
  }

  const displayName = addonName || (addonType && ADDON_LABELS[addonType]?.[lang]) || ''
  const FeatureIcon = addonType ? (ADDON_ICONS[addonType] || CheckCircle) : CheckCircle
  const featureRoute = addonType ? ADDON_ROUTES[addonType] : undefined
  const nextStep = addonType ? ADDON_STEPS[addonType]?.[lang] : undefined

  // ─── Phase 1: Verifying ─────────────────────────────────
  if (phase === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="h-24 w-24 mx-auto rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-8">
            <Loader2 className="h-12 w-12 text-primary-600 dark:text-primary-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-3 font-display">
            {lang === 'fr' ? 'Vérification en cours...' : 'Verifying payment...'}
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            {lang === 'fr' ? 'Activation de votre option...' : 'Activating your addon...'}
          </p>
          <div className="mt-8 flex justify-center gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-primary-400 animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Phase 2: Success + Guidance ─────────────────────────
  if (phase === 'success' && checkoutType === 'addon') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-success-50 via-primary-50 to-accent-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          {/* Success icon */}
          <div className="relative mx-auto mb-8">
            <div className="h-24 w-24 mx-auto rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center animate-bounce-slow">
              <CheckCircle className="h-12 w-12 text-success-600 dark:text-success-400" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-warning-400 animate-pulse" />
            <Sparkles className="absolute -bottom-1 -left-3 h-6 w-6 text-primary-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-3 font-display">
            {lang === 'fr' ? `Option ${displayName} activée !` : `Addon ${displayName} activated!`}
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
            {lang === 'fr'
              ? 'Votre nouvelle fonctionnalité est prête à être utilisée.'
              : 'Your new feature is ready to use.'}
          </p>

          {/* Next steps card */}
          {nextStep && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-700 p-6 mb-8 text-left">
              <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">
                {lang === 'fr' ? 'Prochaines étapes' : 'Next steps'}
              </h3>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <FeatureIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {ADDON_LABELS[addonType!]?.[lang] || displayName}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {nextStep}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {featureRoute && (
              <Button
                variant="primary"
                size="lg"
                rightIcon={ArrowRight}
                onClick={() => navigateTo(featureRoute)}
              >
                {lang === 'fr' ? 'Découvrir la fonctionnalité' : 'Discover the feature'}
              </Button>
            )}
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigateTo('/')}
            >
              {lang === 'fr' ? 'Retour au tableau de bord' : 'Back to dashboard'}
            </Button>
          </div>
        </div>

        <style>{`
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .animate-bounce-slow {
            animation: bounce-slow 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    )
  }

  // ─── Phase 3: Fallback (plan or timeout) ─────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-success-50 via-primary-50 to-accent-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="relative mx-auto mb-8">
          <div className="h-24 w-24 mx-auto rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center animate-bounce-slow">
            <CheckCircle className="h-12 w-12 text-success-600 dark:text-success-400" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-warning-400 animate-pulse" />
          <Sparkles className="absolute -bottom-1 -left-3 h-6 w-6 text-primary-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-3 font-display">
          {checkoutType === 'addon'
            ? (lang === 'fr' ? 'Paiement confirmé !' : 'Payment confirmed!')
            : (lang === 'fr' ? 'Abonnement activé !' : 'Subscription activated!')}
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-2">
          {checkoutType === 'addon'
            ? (lang === 'fr' ? 'Votre paiement a été confirmé.' : 'Your payment has been confirmed.')
            : (lang === 'fr' ? 'Toutes les fonctionnalités de votre plan sont débloquées.' : 'All features from your plan are now unlocked.')}
        </p>
        {checkoutType === 'addon' && (
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-8">
            {lang === 'fr' ? "L'activation peut prendre quelques instants." : 'Activation may take a moment.'}
          </p>
        )}
        {checkoutType === 'plan' && (
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-8">
            {lang === 'fr' ? 'Profitez-en !' : 'Enjoy!'}
          </p>
        )}

        {/* CTA */}
        <Button
          variant="primary"
          size="lg"
          rightIcon={ArrowRight}
          onClick={() => navigateTo('/')}
          className="mx-auto"
        >
          {lang === 'fr' ? 'Accéder à mon espace' : 'Access my space'}
        </Button>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
