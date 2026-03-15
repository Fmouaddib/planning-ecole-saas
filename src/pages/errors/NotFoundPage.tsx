import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-primary-50 dark:from-neutral-950 dark:to-neutral-900 p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <h1 className="text-8xl font-bold text-neutral-200 dark:text-neutral-800">404</h1>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Page non trouvée
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a
            href="#/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <Home size={18} />
            Accueil
          </a>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg font-medium hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
          >
            <ArrowLeft size={18} />
            Retour
          </button>
        </div>
      </div>
    </div>
  )
}
