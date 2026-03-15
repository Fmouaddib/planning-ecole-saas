import React, { useEffect, useState, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Rocket, MapPin } from 'lucide-react'
import type { TourStep } from '@/hooks/useOnboardingTour'

interface OnboardingTourProps {
  steps: TourStep[]
  currentStep: number
  isActive: boolean
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onComplete: () => void
}

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  steps,
  currentStep,
  isActive,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}) => {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [arrowSide, setArrowSide] = useState<'left' | 'top'>('left')
  const [visible, setVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1
  const hasTarget = !!step?.targetSelector

  // Locate target element and compute positions
  const computePosition = useCallback(() => {
    if (!step) return

    if (!step.targetSelector) {
      setTargetRect(null)
      setTooltipPos({ top: 0, left: 0 })
      return
    }

    const el = document.querySelector(step.targetSelector)
    if (!el) {
      // Target not found -- show centered
      setTargetRect(null)
      setTooltipPos({ top: 0, left: 0 })
      return
    }

    const rect = el.getBoundingClientRect()

    // If element is hidden (collapsed group), treat as not found
    if (rect.width === 0 || rect.height === 0) {
      setTargetRect(null)
      setTooltipPos({ top: 0, left: 0 })
      return
    }
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    })

    const tooltipWidth = 360
    const tooltipHeight = 240
    const gap = 16

    // Prefer placing tooltip to the right of the target
    let top = rect.top + rect.height / 2 - tooltipHeight / 2
    let left = rect.right + gap
    let side: 'left' | 'top' = 'left'

    // If tooltip goes off right edge, place below instead
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = rect.left + rect.width / 2 - tooltipWidth / 2
      top = rect.bottom + gap
      side = 'top'
    }

    // Clamp within viewport
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16))
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))

    setTooltipPos({ top, left })
    setArrowSide(side)
  }, [step])

  useEffect(() => {
    if (!isActive) {
      setVisible(false)
      return
    }
    // Slight delay for entrance animation
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [isActive])

  useEffect(() => {
    if (!isActive) return
    computePosition()

    // Expand collapsed sidebar groups if target is inside one
    if (step?.targetSelector) {
      const el = document.querySelector(step.targetSelector)
      if (!el) {
        // Element might be in a collapsed group -- try to find the sidebar nav and look for collapsed sections
        // We'll just recompute after a short delay in case of animation
        const retry = setTimeout(computePosition, 300)
        return () => clearTimeout(retry)
      }
    }

    window.addEventListener('resize', computePosition)
    window.addEventListener('scroll', computePosition, true)
    return () => {
      window.removeEventListener('resize', computePosition)
      window.removeEventListener('scroll', computePosition, true)
    }
  }, [isActive, currentStep, computePosition, step])

  if (!isActive || !step) return null

  const handleNext = () => {
    if (isLast) {
      onComplete()
    } else {
      onNext()
    }
  }

  // Overlay with cutout for targeted element
  const renderOverlay = () => {
    if (!hasTarget || !targetRect) {
      // Full semi-transparent overlay
      return (
        <div
          className="fixed inset-0 z-[9998] bg-black/40 transition-opacity duration-300"
          style={{ opacity: visible ? 1 : 0 }}
          onClick={onSkip}
        />
      )
    }

    const pad = 6
    const r = 8
    const { top, left, width, height } = targetRect
    const cutout = `
      M 0 0
      H ${window.innerWidth}
      V ${window.innerHeight}
      H 0
      Z
      M ${left - pad} ${top - pad + r}
      a ${r} ${r} 0 0 1 ${r} -${r}
      H ${left + width + pad - r}
      a ${r} ${r} 0 0 1 ${r} ${r}
      V ${top + height + pad - r}
      a ${r} ${r} 0 0 1 -${r} ${r}
      H ${left - pad + r}
      a ${r} ${r} 0 0 1 -${r} -${r}
      Z
    `

    return (
      <svg
        className="fixed inset-0 z-[9998] transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        width="100%"
        height="100%"
        onClick={onSkip}
      >
        <path
          d={cutout}
          fillRule="evenodd"
          fill="rgba(0,0,0,0.45)"
        />
      </svg>
    )
  }

  // Pulse ring around target
  const renderPulse = () => {
    if (!hasTarget || !targetRect) return null
    const pad = 6
    return (
      <div
        className="fixed z-[9999] pointer-events-none"
        style={{
          top: targetRect.top - pad,
          left: targetRect.left - pad,
          width: targetRect.width + pad * 2,
          height: targetRect.height + pad * 2,
        }}
      >
        <div className="absolute inset-0 rounded-lg ring-2 ring-primary-400 animate-pulse" />
      </div>
    )
  }

  // Arrow pointing towards target
  const renderArrow = () => {
    if (!hasTarget || !targetRect) return null

    if (arrowSide === 'left') {
      return (
        <div
          className="absolute w-3 h-3 bg-white dark:bg-neutral-900 rotate-45 -left-1.5 border-l border-b border-neutral-200 dark:border-neutral-700"
          style={{ top: '50%', transform: 'translateY(-50%) rotate(45deg)' }}
        />
      )
    }
    // top arrow
    return (
      <div
        className="absolute w-3 h-3 bg-white dark:bg-neutral-900 rotate-45 -top-1.5 border-l border-t border-neutral-200 dark:border-neutral-700"
        style={{ left: '50%', transform: 'translateX(-50%) rotate(45deg)' }}
      />
    )
  }

  // Progress dots
  const renderProgress = () => (
    <div className="flex items-center gap-1.5 mt-4">
      {steps.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === currentStep
              ? 'w-6 bg-primary-500'
              : i < currentStep
              ? 'w-1.5 bg-primary-300 dark:bg-primary-700'
              : 'w-1.5 bg-neutral-300 dark:bg-neutral-600'
          }`}
        />
      ))}
    </div>
  )

  // Centered card (no target)
  if (!hasTarget || !targetRect) {
    return (
      <>
        {renderOverlay()}
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms' }}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-6 sm:p-8 max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onSkip}
              className="absolute top-4 right-4 p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Fermer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-900/40">
                {isLast ? <Rocket size={24} className="text-primary-600 dark:text-primary-400" /> : <MapPin size={24} className="text-primary-600 dark:text-primary-400" />}
              </div>
              <div>
                <p className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  {currentStep + 1} / {steps.length}
                </p>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {step.title}
                </h3>
              </div>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
              {step.description}
            </p>

            {renderProgress()}

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={onSkip}
                className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              >
                Passer
              </button>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={onPrev}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Retour
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
                >
                  {isLast ? 'Terminer' : 'Suivant'}
                  {!isLast && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Tooltip positioned near target
  return (
    <>
      {renderOverlay()}
      {renderPulse()}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] w-[340px] sm:w-[360px]"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 300ms, transform 300ms',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {renderArrow()}
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-5 relative">
          <button
            onClick={onSkip}
            className="absolute top-3 right-3 p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Fermer"
          >
            <X size={16} />
          </button>

          <p className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">
            {currentStep + 1} / {steps.length}
          </p>
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2 pr-6">
            {step.title}
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
            {step.description}
          </p>

          {renderProgress()}

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={onSkip}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              Passer
            </button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={onPrev}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <ChevronLeft size={14} />
                  Retour
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
              >
                {isLast ? 'Terminer' : 'Suivant'}
                {!isLast && <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
