import { useEffect, useState } from 'react'
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui'

export default function CheckoutSuccessPage() {
  const [countdown, setCountdown] = useState(8)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.hash = '#/'
          window.location.reload()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-success-50 via-primary-50 to-accent-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Animated success icon */}
        <div className="relative mx-auto mb-8">
          <div className="h-24 w-24 mx-auto rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center animate-bounce-slow">
            <CheckCircle className="h-12 w-12 text-success-600 dark:text-success-400" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-warning-400 animate-pulse" />
          <Sparkles className="absolute -bottom-1 -left-3 h-6 w-6 text-primary-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-3 font-display">
          Paiement confirmé !
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-2">
          Votre abonnement est maintenant actif.
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-8">
          Toutes les fonctionnalités de votre plan sont débloquées. Profitez-en !
        </p>

        {/* CTA */}
        <Button
          variant="primary"
          size="lg"
          rightIcon={ArrowRight}
          onClick={() => {
            window.location.hash = '#/'
            window.location.reload()
          }}
          className="mx-auto"
        >
          Accéder à mon espace
        </Button>

        {/* Countdown */}
        <p className="text-xs text-neutral-400 mt-4">
          Redirection automatique dans {countdown}s...
        </p>
      </div>

      {/* CSS for slow bounce animation */}
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
