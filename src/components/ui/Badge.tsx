import React from 'react'
import { clsx } from 'clsx'
import { LucideIcon } from 'lucide-react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  icon?: LucideIcon
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon: Icon,
  className
}) => {
  const baseClasses = [
    'inline-flex items-center rounded-full font-medium select-none'
  ]

  const variantClasses = {
    success: 'bg-success-100 text-success-800',
    warning: 'bg-warning-100 text-warning-800',
    error: 'bg-error-100 text-error-800',
    info: 'bg-primary-100 text-primary-800',
    neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5'
  }

  const iconSize = size === 'sm' ? 12 : 14

  return (
    <span
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {Icon && <Icon size={iconSize} />}
      {children}
    </span>
  )
}