import React from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = false
}) => {
  const baseClasses = [
    'bg-white rounded-xl border border-neutral-200',
    'transition-all duration-300',
    'dark:bg-neutral-900 dark:border-neutral-800'
  ]

  const variantClasses = {
    default: 'shadow-soft',
    elevated: 'shadow-medium',
    outlined: 'shadow-none border-2'
  }

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const hoverClasses = hover ? 'hover:shadow-strong hover:-translate-y-1' : ''

  return (
    <div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        hoverClasses,
        className
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
  return (
    <div className={clsx('border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-4', className)}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
  level?: 1 | 2 | 3
}

export const CardTitle: React.FC<CardTitleProps> = ({ 
  children, 
  className, 
  level = 2 
}) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  
  const levelClasses = {
    1: 'text-2xl font-semibold',
    2: 'text-xl font-semibold',
    3: 'text-lg font-semibold'
  }

  return (
    <Tag className={clsx('text-neutral-900 dark:text-neutral-100', levelClasses[level], className)}>
      {children}
    </Tag>
  )
}

interface CardDescriptionProps {
  children: React.ReactNode
  className?: string
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ 
  children, 
  className 
}) => {
  return (
    <p className={clsx('text-neutral-600 dark:text-neutral-400 mt-2', className)}>
      {children}
    </p>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => {
  return (
    <div className={clsx('', className)}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => {
  return (
    <div className={clsx('border-t border-neutral-200 dark:border-neutral-800 pt-4 mt-4', className)}>
      {children}
    </div>
  )
}