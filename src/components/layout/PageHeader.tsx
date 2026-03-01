import React from 'react'
import { clsx } from 'clsx'
import { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  actions,
  breadcrumbs,
  className
}) => {
  return (
    <div className={clsx('mb-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4">
          <ol className="flex items-center space-x-2 text-sm text-neutral-500">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && <span className="mx-2">/</span>}
                {crumb.href ? (
                  <button className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors duration-200">
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-neutral-900 dark:text-neutral-100 font-medium">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header content */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {Icon && (
            <div className="h-12 w-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Icon size={24} className="text-primary-600" />
            </div>
          )}
          
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-display">
              {title}
            </h1>
            {subtitle && (
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center space-x-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}