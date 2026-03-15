import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, Home, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { logError } from '@/services/errorLogger'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
    logError(error, {
      component: 'ErrorBoundary',
      extra: { componentStack: errorInfo.componentStack || undefined },
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }))
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-primary-50 dark:from-neutral-950 dark:to-neutral-900 p-4">
          <div className="text-center max-w-lg">
            <div className="mb-6 flex justify-center">
              <div className="h-16 w-16 rounded-2xl bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
                <AlertTriangle className="text-error-600 dark:text-error-400" size={32} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8">
              L'application a rencontr&eacute; un probl&egrave;me inattendu.
            </p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                <RefreshCw size={18} />
                Recharger la page
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg font-medium hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
              >
                <Home size={18} />
                Retour &agrave; l'accueil
              </a>
            </div>

            {isDev && this.state.error && (
              <div className="text-left mt-6">
                <button
                  onClick={this.toggleDetails}
                  className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors mb-2"
                >
                  {this.state.showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  Details (dev)
                </button>
                {this.state.showDetails && (
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 overflow-auto max-h-80 text-xs font-mono">
                    <p className="text-error-600 dark:text-error-400 font-semibold mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
