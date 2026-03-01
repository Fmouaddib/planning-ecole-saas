import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className
}) => {
  return (
    <div className={`text-center py-12 px-4 ${className || ''}`}>
      {Icon && (
        <div className="mx-auto w-16 h-16 mb-4 text-neutral-400">
          <Icon size={64} />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
        {title}
      </h3>
      
      <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
        {description}
      </p>
      
      {action && (
        <Button
          variant="primary"
          leftIcon={action.icon}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}