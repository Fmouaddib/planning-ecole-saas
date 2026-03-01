import React, { forwardRef } from 'react'
import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  error?: string
  helper?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    label,
    error,
    helper,
    options,
    placeholder,
    className,
    id,
    ...props
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`

    const selectClasses = [
      'w-full bg-white dark:bg-neutral-950 border rounded-lg px-3 py-2.5 pr-10',
      'text-neutral-900 dark:text-neutral-100',
      'focus:outline-none focus:ring-2 focus:ring-opacity-50',
      'disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed',
      'transition-all duration-200 ease-out',
      'shadow-soft hover:shadow-medium focus:shadow-medium',
      'appearance-none cursor-pointer'
    ]

    const errorClasses = error
      ? 'border-error-300 focus:border-error-500 focus:ring-error-500'
      : 'border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-primary-500 hover:border-neutral-300 dark:hover:border-neutral-600'

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={selectId} 
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              selectClasses,
              errorClasses,
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          </div>
        </div>
        
        {(error || helper) && (
          <div className="mt-2">
            {error && (
              <p className="text-sm text-error-600 flex items-center gap-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
            {helper && !error && (
              <p className="text-sm text-neutral-500">{helper}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'