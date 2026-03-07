import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getAutoSubjectColor } from '@/utils/constants'
import type { CalendarEvent } from '@/types'

const statusItems = [
  { key: 'pending', label: 'En attente', color: '#f59e0b' },
  { key: 'cancelled', label: 'Annulé', color: '#ef4444' },
]

interface ColorLegendProps {
  activeTypes: string[]
  onToggleType: (type: string) => void
  events?: CalendarEvent[]
}

export function ColorLegend({ events }: ColorLegendProps) {
  const [expanded, setExpanded] = useState(true)

  // Extraire les matières uniques des événements visibles
  const subjectColors = useMemo(() => {
    if (!events || events.length === 0) return []
    const map = new Map<string, string>()
    for (const ev of events) {
      if (ev.matiere && !map.has(ev.matiere)) {
        map.set(ev.matiere, ev.color || getAutoSubjectColor(ev.matiere))
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [events])

  // Ne rien afficher s'il n'y a pas de matières
  if (subjectColors.length === 0) return null

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
        <div className="px-4 pb-3 border-t border-neutral-100 dark:border-neutral-800 pt-2.5 space-y-2">
          {/* Par matière */}
          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider self-center mr-1">Matières</span>
            {subjectColors.map(([name, color]) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-400"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                {name}
              </span>
            ))}

            <span className="text-neutral-300 self-center">|</span>

            {/* Par statut */}
            {statusItems.map(({ key, label, color }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs text-neutral-500"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
