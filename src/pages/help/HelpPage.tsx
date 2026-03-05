import { useState } from 'react'
import { HelpCircle, Mail, Keyboard, ChevronDown } from 'lucide-react'
import { Button, HelpBanner } from '@/components/ui'

const faqItems = [
  {
    question: 'Comment créer une séance ?',
    answer: 'Rendez-vous sur la page "Séances" via la barre latérale, puis cliquez sur le bouton "Nouvelle séance". Remplissez le formulaire avec le titre, la salle, les horaires et le type de séance.',
  },
  {
    question: 'Comment modifier une séance existante ?',
    answer: 'Dans la liste des séances, cliquez sur l\'icône de crayon à droite de la séance que vous souhaitez modifier. Vous pouvez modifier tous les champs sauf le statut.',
  },
  {
    question: 'Comment annuler une séance ?',
    answer: 'Cliquez sur l\'icône d\'annulation (cercle avec X) à côté de la séance. Vous pouvez optionnellement fournir une raison d\'annulation.',
  },
  {
    question: 'Comment ajouter un utilisateur ?',
    answer: 'Seuls les administrateurs peuvent ajouter des utilisateurs. Rendez-vous sur la page "Utilisateurs" et cliquez sur "Ajouter un utilisateur". Renseignez les informations et le rôle.',
  },
  {
    question: 'Comment utiliser le calendrier ?',
    answer: 'Le calendrier propose 3 vues : Jour, Semaine et Mois. Utilisez les flèches pour naviguer et le filtre par salle pour affiner l\'affichage. Cliquez sur un événement pour voir ses détails.',
  },
  {
    question: 'Comment changer mon mot de passe ?',
    answer: 'Rendez-vous sur votre page "Profil" via la barre latérale ou le menu utilisateur, puis cliquez sur "Changer le mot de passe" dans la section "Actions du compte".',
  },
  {
    question: 'Les données sont-elles synchronisées en temps réel ?',
    answer: 'Oui, les modifications de séances, salles et utilisateurs sont synchronisées en temps réel grâce à Supabase Realtime. Les changements faits par d\'autres utilisateurs apparaissent automatiquement.',
  },
  {
    question: 'Comment contacter le support ?',
    answer: 'Vous pouvez contacter notre équipe support par email à support@antiplanning.com. Nous répondons généralement sous 24 heures ouvrées.',
  },
]

const shortcuts = [
  { keys: ['Échap'], description: 'Fermer une modale' },
  { keys: ['Tab'], description: 'Naviguer entre les champs' },
  { keys: ['Entrée'], description: 'Valider un formulaire' },
]

function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Aide</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Trouvez des réponses à vos questions</p>
      </div>

      <HelpBanner storageKey="help">
        Retrouvez ici les réponses aux questions fréquentes, les raccourcis clavier et les informations de contact du support. N'hésitez pas à consulter cette page si vous avez un doute.
      </HelpBanner>

      {/* FAQ */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <HelpCircle size={20} className="text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Questions fréquentes</h3>
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {faqItems.map((item, index) => (
            <div key={index}>
              <button
                className="w-full flex items-center justify-between py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors rounded-lg px-2 -mx-2"
                onClick={() => toggleFaq(index)}
              >
                <span className="font-medium text-neutral-900 dark:text-neutral-100 pr-4">{item.question}</span>
                <ChevronDown
                  size={18}
                  className={`text-neutral-400 shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="pb-4 px-2 -mx-2">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Support */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-success-100 rounded-lg">
              <Mail size={20} className="text-success-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Contacter le support</h3>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Notre équipe est disponible du lundi au vendredi de 9h à 18h.
            Nous répondons généralement sous 24 heures ouvrées.
          </p>
          <a href="mailto:support@antiplanning.com">
            <Button leftIcon={Mail}>
              Envoyer un email
            </Button>
          </a>
          <p className="text-sm text-neutral-400 mt-3">support@antiplanning.com</p>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Keyboard size={20} className="text-warning-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Raccourcis clavier</h3>
          </div>
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{shortcut.description}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map(key => (
                    <kbd
                      key={key}
                      className="px-2 py-1 text-xs font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpPage
