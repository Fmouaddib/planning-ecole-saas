/**
 * Page 404 - Not Found
 */

import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300">404</h1>
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Page non trouvée
          </h2>
          <p className="text-gray-600">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>

        <div className="space-x-4">
          <Link to="/dashboard" className="btn-primary">
            Retour au tableau de bord
          </Link>
          <Link to="/" className="btn-secondary">
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage