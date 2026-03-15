import { describe, it, expect } from 'vitest'
import {
  isTeacherRole,
  isStudentRole,
  formatTimeRange,
  localToISO,
  capitalize,
  truncate,
  isValidEmail,
  getPasswordStrength,
  filterBySearch,
  sortBy,
  groupBy,
  calculateUsagePercentage,
  formatFileSize,
  getErrorMessage,
  centerDisplayName,
  formatCenterAddress,
  formatNumber,
} from '../helpers'

// ---------------------------------------------------------------------------
// isTeacherRole
// ---------------------------------------------------------------------------
describe('isTeacherRole', () => {
  it('retourne true pour "teacher"', () => {
    expect(isTeacherRole('teacher')).toBe(true)
  })

  it('retourne true pour "trainer"', () => {
    expect(isTeacherRole('trainer')).toBe(true)
  })

  it('retourne false pour "student"', () => {
    expect(isTeacherRole('student')).toBe(false)
  })

  it('retourne false pour "admin"', () => {
    expect(isTeacherRole('admin')).toBe(false)
  })

  it('retourne false pour undefined', () => {
    expect(isTeacherRole(undefined)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isStudentRole
// ---------------------------------------------------------------------------
describe('isStudentRole', () => {
  it('retourne true pour "student"', () => {
    expect(isStudentRole('student')).toBe(true)
  })

  it('retourne false pour "teacher"', () => {
    expect(isStudentRole('teacher')).toBe(false)
  })

  it('retourne false pour undefined', () => {
    expect(isStudentRole(undefined)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// formatTimeRange
// ---------------------------------------------------------------------------
describe('formatTimeRange', () => {
  it('formate correctement une plage horaire ISO', () => {
    const start = '2026-03-14T09:00:00.000Z'
    const end = '2026-03-14T11:30:00.000Z'
    const result = formatTimeRange(start, end)
    // Format: "HH:mm - HH:mm" (UTC hours because date-fns uses local by default,
    // but the important thing is the pattern)
    expect(result).toMatch(/^\d{2}:\d{2} - \d{2}:\d{2}$/)
  })

  it('formate des objets Date', () => {
    const start = new Date(2026, 2, 14, 9, 0)
    const end = new Date(2026, 2, 14, 11, 30)
    const result = formatTimeRange(start, end)
    expect(result).toBe('09:00 - 11:30')
  })
})

// ---------------------------------------------------------------------------
// localToISO
// ---------------------------------------------------------------------------
describe('localToISO', () => {
  it('convertit date + heure en ISO string', () => {
    const result = localToISO('2026-03-14', '09:00')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(result).toContain('2026-03-14')
  })

  it('retourne un ISO valide parsable', () => {
    const result = localToISO('2026-06-01', '14:30')
    const parsed = new Date(result)
    expect(parsed.getTime()).not.toBeNaN()
  })
})

// ---------------------------------------------------------------------------
// capitalize
// ---------------------------------------------------------------------------
describe('capitalize', () => {
  it('capitalise la premiere lettre', () => {
    expect(capitalize('bonjour')).toBe('Bonjour')
  })

  it('met le reste en minuscules', () => {
    expect(capitalize('BONJOUR')).toBe('Bonjour')
  })

  it('gere une chaine vide', () => {
    expect(capitalize('')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// truncate
// ---------------------------------------------------------------------------
describe('truncate', () => {
  it('ne tronque pas un texte court', () => {
    expect(truncate('court', 10)).toBe('court')
  })

  it('tronque un texte long avec "..."', () => {
    const result = truncate('un texte tres tres long', 10)
    expect(result.length).toBeLessThanOrEqual(13) // 10 + "..."
    expect(result).toContain('...')
  })

  it('utilise la longueur par defaut de 100', () => {
    const short = 'abc'
    expect(truncate(short)).toBe('abc')
  })
})

// ---------------------------------------------------------------------------
// isValidEmail
// ---------------------------------------------------------------------------
describe('isValidEmail', () => {
  it('accepte un email valide', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
  })

  it('refuse un email sans @', () => {
    expect(isValidEmail('testexample.com')).toBe(false)
  })

  it('refuse un email sans domaine', () => {
    expect(isValidEmail('test@')).toBe(false)
  })

  it('refuse une chaine vide', () => {
    expect(isValidEmail('')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getPasswordStrength
// ---------------------------------------------------------------------------
describe('getPasswordStrength', () => {
  it('retourne un score faible pour un mot de passe court', () => {
    const result = getPasswordStrength('abc')
    expect(result.score).toBeLessThan(4)
    expect(result.isValid).toBe(false)
    expect(result.feedback.length).toBeGreaterThan(0)
  })

  it('retourne un score eleve pour un mot de passe fort', () => {
    const result = getPasswordStrength('MyP@ssw0rd!')
    expect(result.score).toBeGreaterThanOrEqual(4)
    expect(result.isValid).toBe(true)
  })

  it('detecte les criteres manquants', () => {
    const result = getPasswordStrength('aaaaaaaa') // 8 chars, lowercase only
    expect(result.score).toBe(2) // length + lowercase
    expect(result.feedback).toContain('Au moins une majuscule')
    expect(result.feedback).toContain('Au moins un chiffre')
  })
})

// ---------------------------------------------------------------------------
// filterBySearch
// ---------------------------------------------------------------------------
describe('filterBySearch', () => {
  const items = [
    { name: 'Alice Dupont', email: 'alice@test.com' },
    { name: 'Bob Martin', email: 'bob@test.com' },
    { name: 'Charlie Dupont', email: 'charlie@test.com' },
  ]

  it('retourne tout si le terme de recherche est vide', () => {
    expect(filterBySearch(items, '', ['name'])).toHaveLength(3)
  })

  it('filtre par nom', () => {
    const result = filterBySearch(items, 'dupont', ['name'])
    expect(result).toHaveLength(2)
  })

  it('filtre par email', () => {
    const result = filterBySearch(items, 'bob@', ['email'])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Bob Martin')
  })

  it('recherche insensible a la casse', () => {
    const result = filterBySearch(items, 'ALICE', ['name'])
    expect(result).toHaveLength(1)
  })

  it('retourne un tableau vide si rien ne correspond', () => {
    expect(filterBySearch(items, 'zzz', ['name', 'email'])).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// sortBy
// ---------------------------------------------------------------------------
describe('sortBy', () => {
  const items = [
    { name: 'Charlie', age: 30 },
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 28 },
  ]

  it('trie par ordre croissant par defaut', () => {
    const result = sortBy(items, 'name')
    expect(result[0].name).toBe('Alice')
    expect(result[2].name).toBe('Charlie')
  })

  it('trie par ordre decroissant', () => {
    const result = sortBy(items, 'age', 'desc')
    expect(result[0].age).toBe(30)
    expect(result[2].age).toBe(25)
  })

  it('ne modifie pas le tableau original', () => {
    const original = [...items]
    sortBy(items, 'name')
    expect(items).toEqual(original)
  })
})

// ---------------------------------------------------------------------------
// groupBy
// ---------------------------------------------------------------------------
describe('groupBy', () => {
  it('groupe les elements par cle', () => {
    const items = [
      { type: 'fruit', name: 'pomme' },
      { type: 'legume', name: 'carotte' },
      { type: 'fruit', name: 'banane' },
    ]
    const result = groupBy(items, 'type')
    expect(Object.keys(result)).toHaveLength(2)
    expect(result['fruit']).toHaveLength(2)
    expect(result['legume']).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// calculateUsagePercentage
// ---------------------------------------------------------------------------
describe('calculateUsagePercentage', () => {
  it('calcule le pourcentage correctement', () => {
    expect(calculateUsagePercentage(50, 200)).toBe(25)
  })

  it('retourne 0 si total est 0', () => {
    expect(calculateUsagePercentage(10, 0)).toBe(0)
  })

  it('retourne 100 pour utilisation complete', () => {
    expect(calculateUsagePercentage(100, 100)).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// formatFileSize
// ---------------------------------------------------------------------------
describe('formatFileSize', () => {
  it('formate 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
  })

  it('formate en KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
  })

  it('formate en MB', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
  })

  it('formate avec decimales', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })
})

// ---------------------------------------------------------------------------
// getErrorMessage
// ---------------------------------------------------------------------------
describe('getErrorMessage', () => {
  it('extrait le message d une Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('retourne une string telle quelle', () => {
    expect(getErrorMessage('erreur simple')).toBe('erreur simple')
  })

  it('extrait .message d un objet quelconque', () => {
    expect(getErrorMessage({ message: 'pg error' })).toBe('pg error')
  })

  it('retourne un message par defaut pour un type inconnu', () => {
    expect(getErrorMessage(42)).toBe('Une erreur est survenue')
  })
})

// ---------------------------------------------------------------------------
// centerDisplayName
// ---------------------------------------------------------------------------
describe('centerDisplayName', () => {
  it('retourne l acronyme si disponible', () => {
    expect(centerDisplayName({ name: 'Formation Professionnelle Paris', acronym: 'FPP' })).toBe('FPP')
  })

  it('retourne le nom si pas d acronyme', () => {
    expect(centerDisplayName({ name: 'Mon Centre', acronym: null })).toBe('Mon Centre')
  })

  it('retourne une chaine vide si null', () => {
    expect(centerDisplayName(null)).toBe('')
  })
})

// ---------------------------------------------------------------------------
// formatCenterAddress
// ---------------------------------------------------------------------------
describe('formatCenterAddress', () => {
  it('formate une adresse complete', () => {
    const result = formatCenterAddress({
      address: '10 rue de la Paix',
      postal_code: '75001',
      city: 'Paris',
    })
    expect(result).toBe('10 rue de la Paix, 75001 Paris')
  })

  it('ignore les champs null', () => {
    const result = formatCenterAddress({ address: '10 rue de la Paix', city: null })
    expect(result).toBe('10 rue de la Paix')
  })
})

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------
describe('formatNumber', () => {
  it('formate un grand nombre avec separateur', () => {
    // Intl fr-FR uses non-breaking space as thousands separator
    const result = formatNumber(1234567)
    // Accept any whitespace character as separator
    expect(result.replace(/\s/g, ' ')).toMatch(/1\s234\s567/)
  })
})
