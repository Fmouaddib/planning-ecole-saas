/**
 * Traduction des erreurs Supabase / API en messages utilisateur lisibles (FR)
 * Centralise la detection des erreurs de rate-limit, quota, auth, reseau, etc.
 */

/** Map des codes/messages d'erreur Supabase vers des messages utilisateur en francais */
const ERROR_PATTERNS: Array<{ test: (err: ErrorInfo) => boolean; message: string }> = [
  // --- Rate limits ---
  {
    test: (e) => matchesAny(e, [
      'over_email_send_rate_limit',
      'email_rate_limit_exceeded',
      'email rate limit',
      'rate limit exceeded',
    ]),
    message: 'Trop de tentatives d\'envoi. Veuillez patienter quelques minutes avant de r\u00e9essayer.',
  },
  {
    test: (e) => matchesAny(e, ['too_many_requests', 'over_request_rate_limit']) || e.status === 429,
    message: 'Trop de requ\u00eates. Veuillez patienter quelques secondes avant de r\u00e9essayer.',
  },

  // --- Auth errors ---
  {
    test: (e) => matchesAny(e, ['user_already_exists', 'already registered', 'already been registered']),
    message: 'Un compte existe d\u00e9j\u00e0 avec cette adresse email.',
  },
  {
    test: (e) => matchesAny(e, ['signup_disabled']),
    message: 'Les inscriptions sont temporairement d\u00e9sactiv\u00e9es.',
  },
  {
    test: (e) => matchesAny(e, ['invalid_credentials', 'invalid login credentials', 'invalid password']),
    message: 'Email ou mot de passe incorrect.',
  },
  {
    test: (e) => matchesAny(e, ['email_not_confirmed', 'email not confirmed']),
    message: 'Veuillez confirmer votre adresse email avant de vous connecter.',
  },
  {
    test: (e) => matchesAny(e, ['user_not_found']),
    message: 'Aucun compte trouv\u00e9 avec cette adresse email.',
  },
  {
    test: (e) => matchesAny(e, ['weak_password', 'password is too short', 'password should be']),
    message: 'Le mot de passe est trop faible. Utilisez au moins 8 caract\u00e8res avec majuscules, minuscules et chiffres.',
  },
  {
    test: (e) => matchesAny(e, ['session_not_found', 'refresh_token_not_found']),
    message: 'Votre session a expir\u00e9. Veuillez vous reconnecter.',
  },

  // --- Subscription / quota limits ---
  {
    test: (e) => matchesAny(e, ['limite du plan atteinte', 'quota exceeded', 'quota d\u00e9pass\u00e9', 'limit reached']),
    message: 'Limite de votre abonnement atteinte. Passez \u00e0 un plan sup\u00e9rieur pour continuer.',
  },

  // --- Row-level security ---
  {
    test: (e) => matchesAny(e, ['row-level security', 'new row violates']),
    message: 'Vous n\'avez pas les permissions n\u00e9cessaires pour cette action.',
  },

  // --- Network / fetch errors ---
  {
    test: (e) => matchesAny(e, ['failed to fetch', 'networkerror', 'network request failed', 'err_network', 'load failed']),
    message: 'Erreur de connexion. V\u00e9rifiez votre connexion internet et r\u00e9essayez.',
  },
  {
    test: (e) => matchesAny(e, ['timeout', 'aborted', 'request aborted']),
    message: 'La requ\u00eate a pris trop de temps. Veuillez r\u00e9essayer.',
  },

  // --- Server errors ---
  {
    test: (e) => e.status !== undefined && e.status >= 500,
    message: 'Erreur serveur. Veuillez r\u00e9essayer dans quelques instants.',
  },
]

interface ErrorInfo {
  message: string
  code?: string
  status?: number
  name?: string
}

/**
 * Extrait les informations structurees d'une erreur de type inconnu.
 */
function extractErrorInfo(error: unknown): ErrorInfo {
  if (!error) return { message: '' }

  // Supabase AuthError / PostgrestError ont .message, .code, .status
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>
    return {
      message: typeof e.message === 'string' ? e.message : '',
      code: typeof e.code === 'string' ? e.code : typeof e.error_code === 'string' ? e.error_code : undefined,
      status: typeof e.status === 'number' ? e.status : typeof e.statusCode === 'number' ? e.statusCode : undefined,
      name: typeof e.name === 'string' ? e.name : undefined,
    }
  }

  if (typeof error === 'string') {
    return { message: error }
  }

  return { message: String(error) }
}

/**
 * Teste si un des patterns correspond au message ou au code d'erreur (insensible a la casse).
 */
function matchesAny(info: ErrorInfo, patterns: string[]): boolean {
  const haystack = [info.message, info.code, info.name].filter(Boolean).join(' ').toLowerCase()
  return patterns.some(p => haystack.includes(p.toLowerCase()))
}

/**
 * Retourne un message d'erreur convivial en francais a partir d'une erreur brute.
 * Detecte les erreurs Supabase (auth, rate-limit, RLS), les erreurs reseau,
 * et les limites d'abonnement.
 */
export function getUserFriendlyError(error: unknown): string {
  const info = extractErrorInfo(error)

  // Chercher un pattern correspondant
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(info)) {
      return pattern.message
    }
  }

  // Fallback : message original s'il existe, sinon message generique
  if (info.message && info.message.trim().length > 0) {
    return info.message
  }

  return 'Une erreur est survenue. Veuillez r\u00e9essayer.'
}

/**
 * Detecte si l'erreur est un rate-limit (HTTP 429 ou codes Supabase).
 * Utile pour adapter le comportement (ex: desactiver un bouton temporairement).
 */
export function isRateLimitError(error: unknown): boolean {
  const info = extractErrorInfo(error)
  return (
    info.status === 429 ||
    matchesAny(info, [
      'over_email_send_rate_limit',
      'email_rate_limit_exceeded',
      'too_many_requests',
      'over_request_rate_limit',
      'rate limit',
    ])
  )
}

/**
 * Detecte si l'erreur est liee a un depassement de quota/abonnement.
 */
export function isQuotaError(error: unknown): boolean {
  const info = extractErrorInfo(error)
  return matchesAny(info, [
    'limite du plan atteinte',
    'quota exceeded',
    'quota d\u00e9pass\u00e9',
    'limit reached',
  ])
}
