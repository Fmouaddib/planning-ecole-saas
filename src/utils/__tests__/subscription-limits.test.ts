import { describe, it, expect } from 'vitest'

// Test the pure computation functions that can be extracted
describe('Subscription limits computations', () => {
  // Plan limits by slug
  const PLAN_LIMITS: Record<string, { maxTeachers: number; maxStudents: number; maxRooms: number; emailsPerDay: number }> = {
    free: { maxTeachers: 3, maxStudents: 30, maxRooms: 5, emailsPerDay: 10 },
    starter: { maxTeachers: 10, maxStudents: 100, maxRooms: 20, emailsPerDay: 50 },
    pro: { maxTeachers: 50, maxStudents: 500, maxRooms: 100, emailsPerDay: 100 },
    enterprise: { maxTeachers: -1, maxStudents: -1, maxRooms: -1, emailsPerDay: 200 },
  }

  function isWithinLimit(current: number, limit: number): boolean {
    if (limit === -1) return true // unlimited
    return current < limit
  }

  function getUsagePercentage(current: number, limit: number): number {
    if (limit === -1) return 0
    if (limit === 0) return 100
    return Math.min(100, Math.round((current / limit) * 100))
  }

  it('free plan has correct limits', () => {
    const plan = PLAN_LIMITS.free
    expect(plan.maxTeachers).toBe(3)
    expect(plan.maxStudents).toBe(30)
    expect(plan.emailsPerDay).toBe(10)
  })

  it('enterprise plan has unlimited teachers', () => {
    const plan = PLAN_LIMITS.enterprise
    expect(plan.maxTeachers).toBe(-1)
    expect(isWithinLimit(999, plan.maxTeachers)).toBe(true)
  })

  it('isWithinLimit returns false when at limit', () => {
    expect(isWithinLimit(3, 3)).toBe(false)
    expect(isWithinLimit(2, 3)).toBe(true)
    expect(isWithinLimit(0, 3)).toBe(true)
  })

  it('isWithinLimit returns true for unlimited (-1)', () => {
    expect(isWithinLimit(1000000, -1)).toBe(true)
  })

  it('getUsagePercentage computes correctly', () => {
    expect(getUsagePercentage(5, 10)).toBe(50)
    expect(getUsagePercentage(10, 10)).toBe(100)
    expect(getUsagePercentage(0, 10)).toBe(0)
    expect(getUsagePercentage(15, 10)).toBe(100) // capped at 100
  })

  it('getUsagePercentage returns 0 for unlimited', () => {
    expect(getUsagePercentage(500, -1)).toBe(0)
  })

  it('getUsagePercentage returns 100 for zero limit', () => {
    expect(getUsagePercentage(1, 0)).toBe(100)
  })
})
