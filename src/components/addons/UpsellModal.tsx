/**
 * Modal d'upsell affichée quand une limite est atteinte
 * Propose les packs pertinents pour le type de ressource bloquée
 */

import { useState } from 'react'
import { Modal, ModalFooter, Button } from '@/components/ui'
import { AlertTriangle } from 'lucide-react'
import { AddonSubscribeModal } from './AddonSubscribeModal'
import type { AddonType } from '@/types'

interface UpsellModalProps {
  isOpen: boolean
  onClose: () => void
  resourceType: AddonType
  current: number
  max: number
}

const RESOURCE_LABELS: Record<AddonType, { singular: string; plural: string }> = {
  email: { singular: 'email', plural: 'emails' },
  teacher: { singular: 'enseignant', plural: 'enseignants' },
  student: { singular: 'etudiant', plural: 'etudiants' },
}

export function UpsellModal({ isOpen, onClose, resourceType, current, max }: UpsellModalProps) {
  const [showSubscribe, setShowSubscribe] = useState(false)
  const labels = RESOURCE_LABELS[resourceType]

  if (showSubscribe) {
    return (
      <AddonSubscribeModal
        isOpen={true}
        onClose={() => { setShowSubscribe(false); onClose(); }}
        initialType={resourceType}
      />
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Limite atteinte" size="sm">
      <div className="text-center space-y-4 py-2">
        <div className="mx-auto w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center">
          <AlertTriangle size={24} className="text-warning-600" />
        </div>
        <div>
          <p className="text-neutral-900 dark:text-neutral-100 font-medium">
            Vous avez atteint la limite de {max} {labels.plural}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Utilisation actuelle : {current}/{max}
          </p>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Ajoutez un pack supplementaire pour continuer.
        </p>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Plus tard</Button>
        <Button onClick={() => setShowSubscribe(true)}>
          Voir les packs
        </Button>
      </ModalFooter>
    </Modal>
  )
}
