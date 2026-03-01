import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BOOKING_TYPE_COLORS } from '@/utils/constants'

const typeLabels: Record<string, string> = {
  course: 'Cours',
  exam: 'Examen',
  meeting: 'Réunion',
  event: 'Événement',
  maintenance: 'Maintenance',
}

const statusItems = [
  { key: 'pending', label: 'En attente', color: '#f59e0b' },
  { key: 'cancelled', label: 'Annulé', color: '#ef4444' },
]

interface ColorLegendProps {
  activeTypes: string[]
  onToggleType: (type: string) => void
}

export function ColorLegend({ activeTypes, onToggleType }: ColorLegendProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft mb-4 no-print">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors rounded-xl"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Légende des couleurs</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 flex flex-wrap gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-2.5">
          {/* Par type */}
          {Object.entries(BOOKING_TYPE_COLORS).map(([type, color]) => {
            const isActive = activeTypes.length === 0 || activeTypes.includes(type)
            return (
              <button
                key={type}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                  isActive
                    ? 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 shadow-sm'
                    : 'border-transparent bg-neutral-100 dark:bg-neutral-800/50 text-neutral-400'
                }`}
                onClick={() => onToggleType(type)}
                title={`Filtrer par ${typeLabels[type] || type}`}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color, opacity: isActive ? 1 : 0.4 }}
                />
                {typeLabels[type] || type}
              </button>
            )
          })}

          <span className="text-neutral-300 self-center">|</span>

          {/* Par statut */}
          {statusItems.map(({ key, label, color }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-500"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
