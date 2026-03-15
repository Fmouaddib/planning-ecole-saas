import { useState, useCallback } from 'react'

export interface TourStep {
  id: string
  title: string
  description: string
  targetSelector?: string
  route?: string
}

const STORAGE_KEY = 'onboarding_tour_completed'

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenue sur AntiPlanning\u00a0!',
    description:
      'Ce guide vous accompagne dans la prise en main de votre espace. Suivez les \u00e9tapes pour configurer votre centre.',
  },
  {
    id: 'referentiel',
    title: 'R\u00e9f\u00e9rentiel p\u00e9dagogique',
    description:
      'Commencez par cr\u00e9er vos dipl\u00f4mes, programmes, mati\u00e8res et classes. C\u2019est la base de votre organisation.',
    targetSelector: '[data-tour="referentiel"]',
  },
  {
    id: 'planning',
    title: 'Planning des s\u00e9ances',
    description:
      'Cr\u00e9ez vos s\u00e9ances de cours, examens et \u00e9v\u00e9nements. Vous pouvez les saisir une par une, en lot, ou les importer depuis un fichier Excel.',
    targetSelector: '[data-tour="planning"]',
  },
  {
    id: 'users',
    title: 'Gestion des utilisateurs',
    description:
      'Ajoutez vos \u00e9tudiants et professeurs. Vous pouvez aussi les importer en masse depuis un fichier CSV ou Excel.',
    targetSelector: '[data-tour="users"]',
  },
  {
    id: 'suivi',
    title: 'Suivi p\u00e9dagogique',
    description:
      'Suivez les pr\u00e9sences, saisissez les notes et g\u00e9n\u00e9rez les bulletins. Ces modules sont disponibles via les options de votre abonnement.',
    targetSelector: '[data-tour="attendance"]',
  },
  {
    id: 'chat',
    title: 'Communication',
    description:
      '\u00c9changez avec vos \u00e9quipes et \u00e9tudiants via le chat int\u00e9gr\u00e9. Les canaux sont cr\u00e9\u00e9s automatiquement par classe et mati\u00e8re.',
    targetSelector: '[data-tour="chat"]',
  },
  {
    id: 'done',
    title: 'Vous \u00eates pr\u00eat\u00a0!',
    description:
      'Votre espace est configur\u00e9. Vous pouvez relancer ce guide \u00e0 tout moment depuis votre profil. Bonne utilisation\u00a0!',
  },
]

export function useOnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isActive, setIsActive] = useState(false)

  const hasCompleted = localStorage.getItem(STORAGE_KEY) === 'true'

  const startTour = useCallback(() => {
    setCurrentStep(0)
    setIsActive(true)
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= TOUR_STEPS.length - 1) {
        setIsActive(false)
        localStorage.setItem(STORAGE_KEY, 'true')
        return prev
      }
      return prev + 1
    })
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  const skipTour = useCallback(() => {
    setIsActive(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  const completeTour = useCallback(() => {
    setIsActive(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  return {
    steps: TOUR_STEPS,
    currentStep,
    isActive,
    hasCompleted,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    step: TOUR_STEPS[currentStep] || null,
    totalSteps: TOUR_STEPS.length,
  }
}
