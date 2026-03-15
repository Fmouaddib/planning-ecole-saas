import { describe, it, expect, beforeEach } from 'vitest'
import { getImpersonation, setImpersonation, clearImpersonation, isImpersonating } from '../impersonation'

describe('Impersonation utils', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('getImpersonation returns null when not impersonating', () => {
    expect(getImpersonation()).toBeNull()
  })

  it('isImpersonating returns false when not set', () => {
    expect(isImpersonating()).toBe(false)
  })

  it('setImpersonation stores center data', () => {
    setImpersonation({ centerId: 'center-123', centerName: 'Test Center' })
    const data = getImpersonation()
    expect(data).not.toBeNull()
    expect(data!.centerId).toBe('center-123')
    expect(data!.centerName).toBe('Test Center')
    expect(isImpersonating()).toBe(true)
  })

  it('clearImpersonation removes the stored value', () => {
    setImpersonation({ centerId: 'center-123', centerName: 'Test Center' })
    expect(isImpersonating()).toBe(true)
    clearImpersonation()
    expect(isImpersonating()).toBe(false)
    expect(getImpersonation()).toBeNull()
  })

  it('setImpersonation stores optional user fields', () => {
    setImpersonation({
      centerId: 'c1',
      centerName: 'Centre A',
      userId: 'u1',
      userName: 'John',
      userEmail: 'john@test.com',
      userRole: 'admin',
    })
    const data = getImpersonation()!
    expect(data.userId).toBe('u1')
    expect(data.userName).toBe('John')
    expect(data.userRole).toBe('admin')
  })
})
