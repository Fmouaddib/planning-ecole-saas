import { Home, RefreshCw, ServerCrash } from 'lucide-react'

export default function ServerErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-primary-50 dark:from-neutral-950 dark:to-neutral-900 p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <h1 className="text-8xl font-bold text-neutral-200 dark:text-neutral-800">500</h1>
        </div>
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-xl bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
            <ServerCrash className="text-error-600 dark:text-error-400" size={24} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Erreur serveur
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          Le serveur a rencontr&eacute; un probl&egrave;me. Veuillez r&eacute;essayer dans quelques instants.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <RefreshCw size={18} />
            Recharger
          </button>
          <a
            href="#/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg font-medium hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
          >
            <Home size={18} />
            Accueil
          </a>
        </div>
      </div>
    </div>
  )
}
