import { describe, it, expect } from 'vitest'
import { getUserFriendlyError, isRateLimitError, isQuotaError } from '../error-messages'

// ---------------------------------------------------------------------------
// getUserFriendlyError
// ---------------------------------------------------------------------------
describe('getUserFriendlyError', () => {
  // --- Rate limits ---
  it('detecte over_email_send_rate_limit', () => {
    const msg = getUserFriendlyError({ message: 'over_email_send_rate_limit' })
    expect(msg).toContain('patienter')
  })

  it('detecte email_rate_limit_exceeded via code', () => {
    const msg = getUserFriendlyError({ code: 'email_rate_limit_exceeded', message: '' })
    expect(msg).toContain('patienter')
  })

  it('detecte too_many_requests', () => {
    const msg = getUserFriendlyError({ message: 'too_many_requests' })
    expect(msg).toContain('requ\u00eates')
  })

  it('detecte HTTP 429', () => {
    const msg = getUserFriendlyError({ status: 429, message: '' })
    expect(msg).toContain('requ\u00eates')
  })

  // --- Auth errors ---
  it('detecte user_already_exists', () => {
    const msg = getUserFriendlyError({ message: 'user_already_exists' })
    expect(msg).toContain('existe d\u00e9j\u00e0')
  })

  it('detecte already been registered', () => {
    const msg = getUserFriendlyError({ message: 'User has already been registered' })
    expect(msg).toContain('existe d\u00e9j\u00e0')
  })

  it('detecte signup_disabled', () => {
    const msg = getUserFriendlyError({ message: 'signup_disabled' })
    expect(msg).toContain('d\u00e9sactiv\u00e9es')
  })

  it('detecte invalid_credentials', () => {
    const msg = getUserFriendlyError({ message: 'invalid_credentials' })
    expect(msg).toContain('incorrect')
  })

  it('detecte invalid login credentials', () => {
    const msg = getUserFriendlyError({ message: 'Invalid login credentials' })
    expect(msg).toContain('incorrect')
  })

  it('detecte email_not_confirmed', () => {
    const msg = getUserFriendlyError({ message: 'email_not_confirmed' })
    expect(msg).toContain('confirmer')
  })

  it('detecte user_not_found', () => {
    const msg = getUserFriendlyError({ message: 'user_not_found' })
    expect(msg).toContain('Aucun compte')
  })

  it('detecte weak_password', () => {
    const msg = getUserFriendlyError({ message: 'weak_password' })
    expect(msg).toContain('trop faible')
  })

  it('detecte password is too short', () => {
    const msg = getUserFriendlyError({ message: 'Password is too short' })
    expect(msg).toContain('trop faible')
  })

  it('detecte session_not_found', () => {
    const msg = getUserFriendlyError({ message: 'session_not_found' })
    expect(msg).toContain('session a expir\u00e9')
  })

  it('detecte refresh_token_not_found', () => {
    const msg = getUserFriendlyError({ message: 'refresh_token_not_found' })
    expect(msg).toContain('session a expir\u00e9')
  })

  // --- Quota ---
  it('detecte limite du plan atteinte', () => {
    const msg = getUserFriendlyError({ message: 'limite du plan atteinte' })
    expect(msg).toContain('abonnement')
  })

  it('detecte quota exceeded', () => {
    const msg = getUserFriendlyError({ message: 'quota exceeded' })
    expect(msg).toContain('abonnement')
  })

  // --- RLS ---
  it('detecte row-level security', () => {
    const msg = getUserFriendlyError({ message: 'new row violates row-level security policy' })
    expect(msg).toContain('permissions')
  })

  // --- Network ---
  it('detecte failed to fetch', () => {
    const msg = getUserFriendlyError({ message: 'Failed to fetch' })
    expect(msg).toContain('connexion')
  })

  it('detecte NetworkError', () => {
    const msg = getUserFriendlyError({ message: 'NetworkError when attempting to fetch' })
    expect(msg).toContain('connexion')
  })

  it('detecte timeout', () => {
    const msg = getUserFriendlyError({ message: 'Request timeout' })
    expect(msg).toContain('trop de temps')
  })

  // --- Server ---
  it('detecte erreur serveur (500)', () => {
    const msg = getUserFriendlyError({ status: 500, message: 'Internal server error' })
    expect(msg).toContain('Erreur serveur')
  })

  it('detecte erreur serveur (503)', () => {
    const msg = getUserFriendlyError({ status: 503, message: '' })
    expect(msg).toContain('Erreur serveur')
  })

  // --- Fallback ---
  it('retourne le message original si aucun pattern ne correspond', () => {
    const msg = getUserFriendlyError({ message: 'Something custom happened' })
    expect(msg).toBe('Something custom happened')
  })

  it('retourne un message generique si erreur vide', () => {
    const msg = getUserFriendlyError(null)
    expect(msg).toBe('Une erreur est survenue. Veuillez r\u00e9essayer.')
  })

  it('retourne un message generique si erreur undefined', () => {
    const msg = getUserFriendlyError(undefined)
    expect(msg).toBe('Une erreur est survenue. Veuillez r\u00e9essayer.')
  })

  it('gere une string brute', () => {
    const msg = getUserFriendlyError('user_already_exists')
    expect(msg).toContain('existe d\u00e9j\u00e0')
  })

  it('gere une Error standard', () => {
    const msg = getUserFriendlyError(new Error('Failed to fetch'))
    expect(msg).toContain('connexion')
  })

  it('gere un objet avec error_code', () => {
    const msg = getUserFriendlyError({ error_code: 'too_many_requests', message: '' })
    expect(msg).toContain('requ\u00eates')
  })

  it('gere un objet avec statusCode', () => {
    const msg = getUserFriendlyError({ statusCode: 500, message: '' })
    expect(msg).toContain('Erreur serveur')
  })
})

// ---------------------------------------------------------------------------
// isRateLimitError
// ---------------------------------------------------------------------------
describe('isRateLimitError', () => {
  it('retourne true pour HTTP 429', () => {
    expect(isRateLimitError({ status: 429, message: '' })).toBe(true)
  })

  it('retourne true pour over_email_send_rate_limit', () => {
    expect(isRateLimitError({ message: 'over_email_send_rate_limit' })).toBe(true)
  })

  it('retourne true pour email_rate_limit_exceeded', () => {
    expect(isRateLimitError({ message: 'email_rate_limit_exceeded' })).toBe(true)
  })

  it('retourne true pour too_many_requests', () => {
    expect(isRateLimitError({ message: 'too_many_requests' })).toBe(true)
  })

  it('retourne true pour over_request_rate_limit', () => {
    expect(isRateLimitError({ code: 'over_request_rate_limit', message: '' })).toBe(true)
  })

  it('retourne true pour "rate limit" dans le message', () => {
    expect(isRateLimitError({ message: 'You hit a rate limit' })).toBe(true)
  })

  it('retourne false pour une erreur auth normale', () => {
    expect(isRateLimitError({ message: 'invalid_credentials' })).toBe(false)
  })

  it('retourne false pour null', () => {
    expect(isRateLimitError(null)).toBe(false)
  })

  it('retourne false pour une string quelconque', () => {
    expect(isRateLimitError('some error')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isQuotaError
// ---------------------------------------------------------------------------
describe('isQuotaError', () => {
  it('retourne true pour "limite du plan atteinte"', () => {
    expect(isQuotaError({ message: 'limite du plan atteinte' })).toBe(true)
  })

  it('retourne true pour "quota exceeded"', () => {
    expect(isQuotaError({ message: 'quota exceeded' })).toBe(true)
  })

  it('retourne true pour "quota depass\u00e9"', () => {
    expect(isQuotaError({ message: 'quota d\u00e9pass\u00e9' })).toBe(true)
  })

  it('retourne true pour "limit reached"', () => {
    expect(isQuotaError({ message: 'limit reached' })).toBe(true)
  })

  it('retourne false pour une erreur rate-limit', () => {
    expect(isQuotaError({ message: 'too_many_requests' })).toBe(false)
  })

  it('retourne false pour null', () => {
    expect(isQuotaError(null)).toBe(false)
  })

  it('est insensible a la casse', () => {
    expect(isQuotaError({ message: 'QUOTA EXCEEDED' })).toBe(true)
  })
})
