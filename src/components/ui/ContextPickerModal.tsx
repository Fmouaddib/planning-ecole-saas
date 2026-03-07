import { Modal } from './Modal'
import { Building2, Shield, GraduationCap, UserCheck, Briefcase, Users } from 'lucide-react'
import type { UserContext } from '@/utils/userContext'

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string; bg: string }> = {
  super_admin: { label: 'Super Admin', icon: Shield, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  admin: { label: 'Administrateur', icon: Briefcase, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' },
  teacher: { label: 'Professeur', icon: UserCheck, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  trainer: { label: 'Formateur', icon: UserCheck, color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/40' },
  student: { label: 'Etudiant', icon: GraduationCap, color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/40' },
  staff: { label: 'Personnel', icon: Users, color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/40' },
  coordinator: { label: 'Coordinateur', icon: Briefcase, color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40' },
}

interface ContextPickerModalProps {
  isOpen: boolean
  contexts: UserContext[]
  currentContext?: UserContext | null
  onSelect: (ctx: UserContext) => void
  onClose?: () => void
  closable?: boolean
}

export function ContextPickerModal({ isOpen, contexts, currentContext, onSelect, onClose, closable = false }: ContextPickerModalProps) {
  const handleClose = closable && onClose ? onClose : undefined

  return (
    <Modal isOpen={isOpen} onClose={handleClose || (() => {})} title="Choisir votre espace" size="md">
      <div className="space-y-2">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
          Votre compte est rattache a plusieurs espaces. Selectionnez celui que vous souhaitez utiliser.
        </p>
        {contexts.map((ctx, i) => {
          const config = ROLE_CONFIG[ctx.role] || ROLE_CONFIG.staff
          const Icon = config.icon
          const isCurrent = currentContext?.centerId === ctx.centerId && currentContext?.role === ctx.role

          return (
            <button
              key={`${ctx.centerId}-${ctx.role}-${i}`}
              onClick={() => onSelect(ctx)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                isCurrent
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 shadow-sm'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <div className={`p-2.5 rounded-lg ${config.bg} shrink-0`}>
                <Icon size={22} className={config.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {config.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/50 px-1.5 py-0.5 rounded">
                      actif
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                  <Building2 size={13} />
                  <span className="truncate">{ctx.centerName}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
