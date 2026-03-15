import { Home, ShieldX } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-primary-50 dark:from-neutral-950 dark:to-neutral-900 p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <h1 className="text-8xl font-bold text-neutral-200 dark:text-neutral-800">403</h1>
        </div>
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-xl bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
            <ShieldX className="text-warning-600 dark:text-warning-400" size={24} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Acc&egrave;s interdit
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          Vous n'avez pas les permissions n&eacute;cessaires pour acc&eacute;der &agrave; cette page.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a
            href="#/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <Home size={18} />
            Retour &agrave; l'accueil
          </a>
        </div>
      </div>
    </div>
  )
}
