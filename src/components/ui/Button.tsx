import React from 'react'
import { clsx } from 'clsx'
import { LucideIcon } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  fullWidth?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const baseClasses = [
    'inline-flex items-center justify-center font-medium rounded-lg',
    'transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-opacity-50',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'select-none'
  ]

  const variantClasses = {
    primary: [
      'bg-primary-600 hover:bg-primary-700 focus:bg-primary-700',
      'text-white focus:ring-primary-500',
      'shadow-soft hover:shadow-medium'
    ],
    secondary: [
      'bg-white hover:bg-neutral-50 focus:bg-neutral-50',
      'text-neutral-700 border border-neutral-200 hover:border-neutral-300',
      'focus:ring-primary-500 shadow-soft hover:shadow-medium',
      'dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700',
      'dark:hover:bg-neutral-800 dark:hover:border-neutral-600'
    ],
    ghost: [
      'bg-transparent hover:bg-neutral-100 focus:bg-neutral-100',
      'text-neutral-700 focus:ring-primary-500',
      'dark:text-neutral-300 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800'
    ],
    danger: [
      'bg-error-600 hover:bg-error-700 focus:bg-error-700',
      'text-white focus:ring-error-500',
      'shadow-soft hover:shadow-medium'
    ]
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5'
  }

  const widthClasses = fullWidth ? 'w-full' : ''

  const isDisabled = disabled || isLoading

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        widthClasses,
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <>
          <svg 
            className="animate-spin h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Chargement...</span>
        </>
      ) : (
        <>
          {LeftIcon && <LeftIcon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
          {children}
          {RightIcon && <RightIcon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
        </>
      )}
    </button>
  )
}