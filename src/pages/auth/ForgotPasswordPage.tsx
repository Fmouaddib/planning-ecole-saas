import { useState } from 'react'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { AuthService } from '@/services/authService'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      await AuthService.requestPasswordReset(email.trim())
      setIsSent(true)
    } catch (err) {
      // On affiche toujours le succès pour des raisons de sécurité
      // (ne pas révéler si un email existe ou non)
      setIsSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Retour connexion */}
        <a
          href="#/login"
          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200 mb-4"
        >
          <ArrowLeft size={16} />
          Retour à la connexion
        </a>

        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div
            className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 shadow-medium"
            style={{ background: 'linear-gradient(135deg, #FF5B46, #FBA625)' }}
          >
            <span className="text-white font-extrabold text-2xl">A</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-display mb-2">
            Mot de passe oublié
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Entrez votre adresse email pour recevoir un lien de réinitialisation
          </p>
        </div>

        <Card variant="elevated" className="shadow-strong">
          <CardContent>
            {isSent ? (
              <div className="text-center py-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-success-600 dark:text-success-400" />
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  Email envoyé !
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                  Si un compte est associé à <strong>{email}</strong>, vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-6">
                  Pensez à vérifier votre dossier spam si vous ne voyez pas l'email.
                </p>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => { window.location.hash = '#/login' }}
                >
                  Retour à la connexion
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 px-4 py-3 rounded-lg">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <Input
                  type="email"
                  label="Adresse email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={Mail}
                  disabled={isLoading}
                  autoComplete="email"
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isLoading}
                  disabled={isLoading || !email.trim()}
                >
                  Envoyer le lien de réinitialisation
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
