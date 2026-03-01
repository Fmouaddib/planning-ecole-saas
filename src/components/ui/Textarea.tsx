import React, { forwardRef } from 'react'
import { clsx } from 'clsx'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helper?: string
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    label,
    error,
    helper,
    resize = 'vertical',
    className,
    id,
    ...props
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`

    const textareaClasses = [
      'w-full bg-white border rounded-lg px-3 py-2.5',
      'text-neutral-900 placeholder-neutral-500',
      'focus:outline-none focus:ring-2 focus:ring-opacity-50',
      'disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed',
      'transition-all duration-200 ease-out',
      'shadow-soft hover:shadow-medium focus:shadow-medium',
      'scrollbar-thin',
      'dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder-neutral-500',
      'dark:border-neutral-700 dark:disabled:bg-neutral-900'
    ]

    const errorClasses = error
      ? 'border-error-300 focus:border-error-500 focus:ring-error-500'
      : 'border-neutral-200 focus:border-primary-500 focus:ring-primary-500 hover:border-neutral-300'

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize'
    }

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={textareaId} 
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
          >
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            textareaClasses,
            errorClasses,
            resizeClasses[resize],
            className
          )}
          rows={4}
          {...props}
        />
        
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

Textarea.displayName = 'Textarea'