import { describe, it, expect } from 'vitest'
import {
  isClassDay,
  getExamPeriod,
  getScheduleTypeLabel,
  getScheduleTypeBadgeVariant,
  formatDaysShort,
  SCHEDULE_TYPE_OPTIONS,
  DAY_OPTIONS,
  DEFAULT_DAYS_BY_TYPE,
} from '../scheduleUtils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('SCHEDULE_TYPE_OPTIONS', () => {
  it('contient les 4 profils de planification', () => {
    const values = SCHEDULE_TYPE_OPTIONS.map(o => o.value)
    expect(values).toEqual(['initial', 'alternance', 'formation_continue', 'cours_du_soir'])
  })
})

describe('DAY_OPTIONS', () => {
  it('contient 7 jours de la semaine (lundi=1 a dimanche=7)', () => {
    expect(DAY_OPTIONS).toHaveLength(7)
    expect(DAY_OPTIONS[0]).toEqual({ value: 1, label: 'Lundi' })
    expect(DAY_OPTIONS[6]).toEqual({ value: 7, label: 'Dimanche' })
  })
})

describe('DEFAULT_DAYS_BY_TYPE', () => {
  it('initial = lundi a vendredi', () => {
    expect(DEFAULT_DAYS_BY_TYPE.initial).toEqual([1, 2, 3, 4, 5])
  })

  it('alternance = lundi a mercredi', () => {
    expect(DEFAULT_DAYS_BY_TYPE.alternance).toEqual([1, 2, 3])
  })

  it('formation_continue = samedi uniquement', () => {
    expect(DEFAULT_DAYS_BY_TYPE.formation_continue).toEqual([6])
  })

  it('cours_du_soir = lundi a vendredi', () => {
    expect(DEFAULT_DAYS_BY_TYPE.cours_du_soir).toEqual([1, 2, 3, 4, 5])
  })
})

// ---------------------------------------------------------------------------
// getScheduleTypeLabel
// ---------------------------------------------------------------------------
describe('getScheduleTypeLabel', () => {
  it('retourne le label pour un type connu', () => {
    expect(getScheduleTypeLabel('initial')).toBe('Initial')
    expect(getScheduleTypeLabel('alternance')).toBe('Alternance')
    expect(getScheduleTypeLabel('formation_continue')).toBe('Formation continue')
    expect(getScheduleTypeLabel('cours_du_soir')).toBe('Cours du soir')
  })

  it('retourne le type brut pour un type inconnu', () => {
    expect(getScheduleTypeLabel('unknown_type')).toBe('unknown_type')
  })
})

// ---------------------------------------------------------------------------
// getScheduleTypeBadgeVariant
// ---------------------------------------------------------------------------
describe('getScheduleTypeBadgeVariant', () => {
  it('retourne success pour initial', () => {
    expect(getScheduleTypeBadgeVariant('initial')).toBe('success')
  })

  it('retourne warning pour alternance', () => {
    expect(getScheduleTypeBadgeVariant('alternance')).toBe('warning')
  })

  it('retourne info pour formation_continue et cours_du_soir', () => {
    expect(getScheduleTypeBadgeVariant('formation_continue')).toBe('info')
    expect(getScheduleTypeBadgeVariant('cours_du_soir')).toBe('info')
  })

  it('retourne neutral pour un type inconnu', () => {
    expect(getScheduleTypeBadgeVariant('other')).toBe('neutral')
  })
})

// ---------------------------------------------------------------------------
// formatDaysShort
// ---------------------------------------------------------------------------
describe('formatDaysShort', () => {
  it('formate les jours en abreviations separees par des tirets', () => {
    expect(formatDaysShort([1, 2, 3, 4, 5])).toBe('L-M-Me-J-V')
  })

  it('trie les jours avant de formater', () => {
    expect(formatDaysShort([5, 1, 3])).toBe('L-Me-V')
  })

  it('gere le samedi et dimanche', () => {
    expect(formatDaysShort([6, 7])).toBe('S-D')
  })

  it('gere un tableau vide', () => {
    expect(formatDaysShort([])).toBe('')
  })

  it('retourne ? pour un jour invalide (0)', () => {
    expect(formatDaysShort([0])).toBe('?')
  })
})

// ---------------------------------------------------------------------------
// isClassDay
// ---------------------------------------------------------------------------
describe('isClassDay', () => {
  const baseClass = {
    name: 'BTS SIO 1A',
    attendanceDays: [1, 2, 3, 4, 5], // lun-ven
    alternanceConfig: undefined,
    scheduleExceptions: undefined,
  }

  it('retourne isPresent=true pour un jour ouvrable inclus dans attendanceDays', () => {
    // 2026-03-16 est un lundi
    const result = isClassDay(baseClass, new Date(2026, 2, 16))
    expect(result.isPresent).toBe(true)
  })

  it('retourne isPresent=false pour un samedi non inclus', () => {
    // 2026-03-21 est un samedi
    const result = isClassDay(baseClass, new Date(2026, 2, 21))
    expect(result.isPresent).toBe(false)
    expect(result.reason).toContain('Samedi')
  })

  it('retourne isPresent=false pour un dimanche non inclus', () => {
    // 2026-03-22 est un dimanche
    const result = isClassDay(baseClass, new Date(2026, 2, 22))
    expect(result.isPresent).toBe(false)
    expect(result.reason).toContain('Dimanche')
  })

  it('accepte une date sous forme de string ISO', () => {
    const result = isClassDay(baseClass, '2026-03-16') // lundi
    expect(result.isPresent).toBe(true)
  })

  // --- Exceptions ---
  describe('exceptions', () => {
    const classWithExceptions = {
      ...baseClass,
      scheduleExceptions: {
        schoolDays: ['2026-03-21'], // samedi exceptionnel cours
        companyDays: ['2026-03-16'], // lundi exceptionnel pas cours
      },
    }

    it('schoolDays override : cours un samedi exceptionnel', () => {
      const result = isClassDay(classWithExceptions, new Date(2026, 2, 21))
      expect(result.isPresent).toBe(true)
    })

    it('companyDays override : pas cours un lundi exceptionnel', () => {
      const result = isClassDay(classWithExceptions, new Date(2026, 2, 16))
      expect(result.isPresent).toBe(false)
      expect(result.reason).toBe('Jour entreprise exceptionnel')
    })

    it('exceptions ont priorite sur le cycle alternance', () => {
      const classAlt = {
        ...classWithExceptions,
        alternanceConfig: {
          schoolWeeks: 1,
          companyWeeks: 1,
          referenceDate: '2026-03-16', // semaine ecole
        },
      }
      // 2026-03-16 is forced companyDay via exception
      const result = isClassDay(classAlt, new Date(2026, 2, 16))
      expect(result.isPresent).toBe(false)
    })
  })

  // --- Alternance ---
  describe('cycle alternance', () => {
    const classAlternance = {
      ...baseClass,
      attendanceDays: [1, 2, 3], // lun-mer
      alternanceConfig: {
        schoolWeeks: 2,
        companyWeeks: 1,
        referenceDate: '2026-03-02', // lundi de reference = debut cycle
      },
    }

    it('retourne isPresent=true pendant une semaine ecole', () => {
      // semaine 0 (from ref): ecole
      const result = isClassDay(classAlternance, new Date(2026, 2, 2)) // lun 2 mars
      expect(result.isPresent).toBe(true)
    })

    it('retourne isPresent=true pendant la 2e semaine ecole du cycle', () => {
      // semaine 1 (from ref): encore ecole (schoolWeeks=2)
      const result = isClassDay(classAlternance, new Date(2026, 2, 9)) // lun 9 mars
      expect(result.isPresent).toBe(true)
    })

    it('retourne isPresent=false pendant une semaine entreprise', () => {
      // semaine 2 (from ref): entreprise (companyWeeks=1)
      const result = isClassDay(classAlternance, new Date(2026, 2, 16)) // lun 16 mars
      expect(result.isPresent).toBe(false)
      expect(result.reason).toContain('Semaine entreprise')
    })

    it('le cycle recommence apres schoolWeeks+companyWeeks', () => {
      // semaine 3 = retour ecole (cycle de 3)
      const result = isClassDay(classAlternance, new Date(2026, 2, 23))
      expect(result.isPresent).toBe(true)
    })

    it('ignore alternance si schoolWeeks=0', () => {
      const noSchool = {
        ...classAlternance,
        alternanceConfig: { schoolWeeks: 0, companyWeeks: 2, referenceDate: '2026-03-02' },
      }
      // Should only check attendanceDays (no alternance logic)
      const result = isClassDay(noSchool, new Date(2026, 2, 2))
      expect(result.isPresent).toBe(true)
    })

    it('ignore alternance si pas de referenceDate', () => {
      const noRef = {
        ...classAlternance,
        alternanceConfig: { schoolWeeks: 2, companyWeeks: 1, referenceDate: '' },
      }
      const result = isClassDay(noRef, new Date(2026, 2, 16))
      expect(result.isPresent).toBe(true) // no alternance check
    })
  })
})

// ---------------------------------------------------------------------------
// getExamPeriod
// ---------------------------------------------------------------------------
describe('getExamPeriod', () => {
  const classWithExams = {
    examPeriods: [
      { name: 'Partiels Janvier', startDate: '2026-01-12', endDate: '2026-01-23' },
      { name: 'Partiels Mai', startDate: '2026-05-04', endDate: '2026-05-15' },
    ],
  }

  it('retourne la periode d examen si la date est dans la plage', () => {
    const result = getExamPeriod(classWithExams, '2026-01-15')
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Partiels Janvier')
  })

  it('retourne la bonne periode parmi plusieurs', () => {
    const result = getExamPeriod(classWithExams, '2026-05-10')
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Partiels Mai')
  })

  it('retourne null si la date n est pas en periode d examen', () => {
    const result = getExamPeriod(classWithExams, '2026-03-15')
    expect(result).toBeNull()
  })

  it('inclut les bornes (startDate et endDate)', () => {
    expect(getExamPeriod(classWithExams, '2026-01-12')).not.toBeNull()
    expect(getExamPeriod(classWithExams, '2026-01-23')).not.toBeNull()
  })

  it('retourne null si examPeriods est undefined', () => {
    expect(getExamPeriod({ examPeriods: undefined }, '2026-01-15')).toBeNull()
  })

  it('retourne null si examPeriods est vide', () => {
    expect(getExamPeriod({ examPeriods: [] }, '2026-01-15')).toBeNull()
  })

  it('accepte un objet Date', () => {
    const result = getExamPeriod(classWithExams, new Date(2026, 0, 15))
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Partiels Janvier')
  })
})
