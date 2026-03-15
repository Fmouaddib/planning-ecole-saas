import { describe, it, expect } from 'vitest'
import { isTeacherRole, isStudentRole, getPasswordStrength, isValidEmail } from '../helpers'
import type { UserRole } from '@/types'

describe('Auth role checks', () => {
  const teacherRoles: UserRole[] = ['teacher', 'trainer']
  const nonTeacherRoles: UserRole[] = ['admin', 'student', 'staff', 'super_admin', 'coordinator']
  const studentRoles: UserRole[] = ['student']
  const nonStudentRoles: UserRole[] = ['admin', 'teacher', 'staff', 'super_admin', 'trainer', 'coordinator']

  teacherRoles.forEach(role => {
    it(`isTeacherRole("${role}") = true`, () => {
      expect(isTeacherRole(role)).toBe(true)
    })
  })

  nonTeacherRoles.forEach(role => {
    it(`isTeacherRole("${role}") = false`, () => {
      expect(isTeacherRole(role)).toBe(false)
    })
  })

  studentRoles.forEach(role => {
    it(`isStudentRole("${role}") = true`, () => {
      expect(isStudentRole(role)).toBe(true)
    })
  })

  nonStudentRoles.forEach(role => {
    it(`isStudentRole("${role}") = false`, () => {
      expect(isStudentRole(role)).toBe(false)
    })
  })
})

describe('Password strength', () => {
  it('returns low score for short passwords', () => {
    const result = getPasswordStrength('abc')
    expect(result.score).toBeLessThanOrEqual(2)
    expect(result.isValid).toBe(false)
  })

  it('returns medium score for decent passwords', () => {
    const result = getPasswordStrength('Abcdef1!')
    expect(result.score).toBeGreaterThanOrEqual(3)
  })

  it('returns high score for complex passwords', () => {
    const result = getPasswordStrength('MyP@ssw0rd!2026')
    expect(result.score).toBeGreaterThanOrEqual(4)
    expect(result.isValid).toBe(true)
    expect(result.feedback).toHaveLength(0)
  })
})

describe('Email validation', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('first.last@domain.co')).toBe(true)
    expect(isValidEmail('user+tag@gmail.com')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('notanemail')).toBe(false)
    expect(isValidEmail('@domain.com')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
  })
})
