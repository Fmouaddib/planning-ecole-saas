import { Wrench } from 'lucide-react'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-primary-50 dark:from-neutral-950 dark:to-neutral-900 p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Wrench className="text-primary-600 dark:text-primary-400" size={40} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Maintenance en cours
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Nous effectuons une mise &agrave; jour. L'application sera de retour dans quelques minutes.
        </p>
      </div>
    </div>
  )
}
