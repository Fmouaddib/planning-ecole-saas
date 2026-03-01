import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  placeholder?: string
}

export function MultiSelect({ options, value, onChange, label, placeholder = 'Sélectionner...' }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const removeValue = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter(v => v !== optionValue))
  }

  const selectedLabels = value.map(v => options.find(o => o.value === v)?.label || v)

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          className={`w-full bg-white dark:bg-neutral-950 border rounded-lg px-3 py-2 pr-10 text-left
            border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 focus:border-primary-500
            shadow-soft hover:shadow-medium transition-all duration-200 ease-out
            min-h-[42px] cursor-pointer dark:text-neutral-100`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {value.length === 0 ? (
            <span className="text-neutral-400">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedLabels.map((lbl, i) => (
                <span
                  key={value[i]}
                  className="inline-flex items-center gap-1 bg-primary-100 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full"
                >
                  {lbl}
                  <button
                    type="button"
                    onClick={(e) => removeValue(value[i], e)}
                    className="hover:text-primary-900 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown className={`h-5 w-5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map(option => {
              const isSelected = value.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${
                    isSelected ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                  onClick={() => toggleOption(option.value)}
                >
                  <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                    isSelected ? 'bg-primary-600 border-primary-600' : 'border-neutral-300 dark:border-neutral-600'
                  }`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </span>
                  {option.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
