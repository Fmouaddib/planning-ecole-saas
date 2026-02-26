/**
 * Page d'inscription - Template de base
 * À personnaliser par l'équipe Design
 */

import { Link } from 'react-router-dom'

function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Créer un compte
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              connectez-vous à votre compte existant
            </Link>
          </p>
        </div>
        
        <div className="card">
          <form className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="form-label">
                  Prénom
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="form-input"
                  placeholder="Votre prénom"
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="form-label">
                  Nom
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="form-input"
                  placeholder="Votre nom"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="form-label">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="form-input"
                placeholder="votre@email.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="form-label">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="form-input"
                placeholder="Minimum 8 caractères"
              />
            </div>

            <div>
              <label htmlFor="role" className="form-label">
                Rôle
              </label>
              <select
                id="role"
                name="role"
                required
                className="form-select"
              >
                <option value="student">Étudiant</option>
                <option value="teacher">Enseignant</option>
                <option value="staff">Personnel</option>
              </select>
            </div>

            <div>
              <button type="submit" className="btn-primary w-full">
                Créer le compte
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage