import { useState } from 'react'
import {
  Eye, EyeOff, Lock, Mail, Building2,
  ArrowRight
} from 'lucide-react'
import { Button, Input, Select, Card, CardContent } from '@/components/ui'
import { SignupForm } from '@/types'

interface SignupPageProps {
  onSignup?: (userData: SignupForm) => Promise<void>
  onSwitchToLogin?: () => void
  isLoading?: boolean
  error?: string | null
}

const USER_ROLES = [
  { value: 'teacher', label: 'Enseignant' },
  { value: 'student', label: 'Étudiant' },
  { value: 'staff', label: 'Personnel administratif' },
  { value: 'admin', label: 'Administrateur' }
]

export const SignupPage: React.FC<SignupPageProps> = ({
  onSignup,
  onSwitchToLogin,
  isLoading = false,
  error
}) => {
  const [formData, setFormData] = useState<SignupForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    schoolCode: '',
    role: 'teacher',
    acceptTerms: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Partial<SignupForm>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupForm> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis'
    }

    if (!formData.email) {
      newErrors.email = 'L\'email est requis'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide'
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Veuillez confirmer votre mot de passe'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
    }

    if (!formData.schoolCode.trim()) {
      newErrors.schoolCode = 'Le code établissement est requis'
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = true
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      await onSignup?.(formData)
    } catch (error) {
      console.error('Erreur d\'inscription:', error)
    }
  }

  const handleInputChange = (field: keyof SignupForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
    if (password.length === 0) return { level: 0, label: '', color: '' }
    
    let score = 0
    if (password.length >= 8) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    if (score <= 2) return { level: 1, label: 'Faible', color: 'bg-error-500' }
    if (score <= 3) return { level: 2, label: 'Moyen', color: 'bg-warning-500' }
    if (score <= 4) return { level: 3, label: 'Fort', color: 'bg-success-500' }
    return { level: 4, label: 'Très fort', color: 'bg-success-600' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Retour accueil */}
        <a
          href="#/"
          className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200 mb-4"
        >
          &larr; Retour &agrave; l&apos;accueil
        </a>

        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-2xl flex items-center justify-center mb-4 shadow-medium">
            <span className="text-white font-bold text-xl">PE</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 font-display mb-2">
            Créer un compte
          </h1>
          <p className="text-neutral-600">
            Rejoignez votre établissement sur PlanningÉcole
          </p>
        </div>

        {/* Formulaire d'inscription */}
        <Card variant="elevated" className="shadow-strong">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Erreur globale */}
              {error && (
                <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Nom et Prénom */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="text"
                  label="Prénom"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={handleInputChange('firstName')}
                  error={errors.firstName}
                  disabled={isLoading}
                />

                <Input
                  type="text"
                  label="Nom"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChange={handleInputChange('lastName')}
                  error={errors.lastName}
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <Input
                type="email"
                label="Adresse email"
                placeholder="jean.dupont@etablissement.fr"
                value={formData.email}
                onChange={handleInputChange('email')}
                error={errors.email}
                leftIcon={Mail}
                disabled={isLoading}
              />

              {/* Rôle */}
              <Select
                label="Rôle dans l'établissement"
                value={formData.role}
                onChange={handleInputChange('role')}
                options={USER_ROLES}
                disabled={isLoading}
              />

              {/* Code établissement */}
              <Input
                type="text"
                label="Code établissement"
                placeholder="Ex: SUPINFO-PARIS"
                value={formData.schoolCode}
                onChange={handleInputChange('schoolCode')}
                error={errors.schoolCode}
                leftIcon={Building2}
                helper="Contactez votre administration pour obtenir ce code"
                disabled={isLoading}
              />

              {/* Mot de passe */}
              <div className="space-y-2">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="Mot de passe"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  error={errors.password}
                  leftIcon={Lock}
                  rightIcon={showPassword ? EyeOff : Eye}
                  onRightIconClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                />
                
                {/* Indicateur de force du mot de passe */}
                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Force du mot de passe</span>
                      <span className={`font-medium ${
                        passwordStrength.level === 1 ? 'text-error-600' :
                        passwordStrength.level === 2 ? 'text-warning-600' :
                        'text-success-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.level / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmation mot de passe */}
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                label="Confirmer le mot de passe"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                error={errors.confirmPassword}
                leftIcon={Lock}
                rightIcon={showConfirmPassword ? EyeOff : Eye}
                onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              />

              {/* Acceptation des conditions */}
              <div className="space-y-2">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleInputChange('acceptTerms')}
                    className="mt-0.5 h-4 w-4 text-primary-600 bg-white border-neutral-300 rounded 
                             focus:ring-primary-500 focus:ring-2 focus:ring-opacity-50"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-neutral-700">
                    J'accepte les{' '}
                    <button type="button" className="text-primary-600 hover:text-primary-700 font-medium">
                      conditions d'utilisation
                    </button>
                    {' '}et la{' '}
                    <button type="button" className="text-primary-600 hover:text-primary-700 font-medium">
                      politique de confidentialité
                    </button>
                  </span>
                </label>
                {errors.acceptTerms && (
                  <p className="text-sm text-error-600 flex items-center gap-1">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.acceptTerms}
                  </p>
                )}
              </div>

              {/* Bouton d'inscription */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                rightIcon={ArrowRight}
                disabled={isLoading}
              >
                Créer mon compte
              </Button>
            </form>

            {/* Lien vers connexion */}
            <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
              <p className="text-sm text-neutral-600">
                Déjà un compte ?{' '}
                <button
                  onClick={onSwitchToLogin}
                  className="text-primary-600 hover:text-primary-700 font-medium 
                           transition-colors duration-200"
                  disabled={isLoading}
                >
                  Se connecter
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}