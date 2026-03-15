import { describe, it, expect, beforeEach } from 'vitest'
import { getCookieConsent, hasAnalyticsConsent } from '../CookieBanner'

// Test the pure utility functions (no React rendering needed)
describe('getCookieConsent', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when no consent', () => {
    expect(getCookieConsent()).toBeNull()
  })

  it('returns "accepted" when accepted', () => {
    localStorage.setItem('cookie_consent', 'accepted')
    expect(getCookieConsent()).toBe('accepted')
  })

  it('returns "refused" when refused', () => {
    localStorage.setItem('cookie_consent', 'refused')
    expect(getCookieConsent()).toBe('refused')
  })

  it('returns null for invalid values', () => {
    localStorage.setItem('cookie_consent', 'something_else')
    expect(getCookieConsent()).toBeNull()
  })

  it('returns null for empty string', () => {
    localStorage.setItem('cookie_consent', '')
    expect(getCookieConsent()).toBeNull()
  })
})

describe('hasAnalyticsConsent', () => {
  beforeEach(() => localStorage.clear())

  it('returns false when no consent', () => {
    expect(hasAnalyticsConsent()).toBe(false)
  })

  it('returns true when accepted', () => {
    localStorage.setItem('cookie_consent', 'accepted')
    expect(hasAnalyticsConsent()).toBe(true)
  })

  it('returns false when refused', () => {
    localStorage.setItem('cookie_consent', 'refused')
    expect(hasAnalyticsConsent()).toBe(false)
  })
})

describe('Cookie consent localStorage integration', () => {
  beforeEach(() => localStorage.clear())

  it('consent persists across reads', () => {
    localStorage.setItem('cookie_consent', 'accepted')
    expect(getCookieConsent()).toBe('accepted')
    expect(getCookieConsent()).toBe('accepted')
    expect(hasAnalyticsConsent()).toBe(true)
  })

  it('consent can be changed', () => {
    localStorage.setItem('cookie_consent', 'accepted')
    expect(hasAnalyticsConsent()).toBe(true)

    localStorage.setItem('cookie_consent', 'refused')
    expect(hasAnalyticsConsent()).toBe(false)
  })

  it('consent can be cleared', () => {
    localStorage.setItem('cookie_consent', 'accepted')
    expect(hasAnalyticsConsent()).toBe(true)

    localStorage.removeItem('cookie_consent')
    expect(getCookieConsent()).toBeNull()
    expect(hasAnalyticsConsent()).toBe(false)
  })
})
