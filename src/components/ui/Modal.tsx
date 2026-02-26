import React, { useEffect } from 'react'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { ModalProps } from '@/types'

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  // Fermer la modale avec Échap
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={clsx(
          'relative w-full mx-4 bg-white rounded-2xl shadow-strong',
          'animate-scale-in',
          sizeClasses[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
          >
            <X size={20} className="text-neutral-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => {
  return (
    <div className={clsx(
      'flex items-center justify-end gap-3 p-6 border-t border-neutral-200 bg-neutral-50 rounded-b-2xl',
      className
    )}>
      {children}
    </div>
  )
}