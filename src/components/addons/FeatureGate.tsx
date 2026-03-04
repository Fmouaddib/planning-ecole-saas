/**
 * Wrapper component: renders children if addon is active, otherwise shows upsell banner
 */
import React, { useState } from 'react'
import { useFeatureGate } from '@/hooks/useFeatureGate'
import { AddonSubscribeModal } from './AddonSubscribeModal'
import { Lock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui'
import type { AddonType } from '@/types'

interface FeatureGateProps {
  feature: AddonType
  children: React.ReactNode
  title?: string
  description?: string
}

const FEATURE_INFO: Record<string, { title: string; description: string; icon: typeof Lock }> = {
  attendance: {
    title: 'Module Presences',
    description: 'Suivez les presences et absences de vos etudiants, generez des rapports et statistiques.',
    icon: Lock,
  },
  grades: {
    title: 'Module Notes & Evaluations',
    description: 'Creez des evaluations, saisissez les notes et generez des bulletins pour vos etudiants.',
    icon: Lock,
  },
}

export function FeatureGate({ feature, children, title, description }: FeatureGateProps) {
  const { hasAddon } = useFeatureGate()
  const [showSubscribe, setShowSubscribe] = useState(false)

  if (hasAddon(feature)) {
    return <>{children}</>
  }

  const info = FEATURE_INFO[feature] || {
    title: title || 'Fonctionnalite premium',
    description: description || 'Cette fonctionnalite necessite un add-on.',
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-6">
          <Lock size={32} className="text-primary-600" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          {info.title}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
          {info.description}
        </p>
        <Button onClick={() => setShowSubscribe(true)} leftIcon={Sparkles}>
          Activer cette option
        </Button>
      </div>
      <AddonSubscribeModal
        isOpen={showSubscribe}
        onClose={() => setShowSubscribe(false)}
        initialType={feature}
      />
    </>
  )
}
