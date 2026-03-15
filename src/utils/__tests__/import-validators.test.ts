import { describe, it, expect } from 'vitest'
import { validateImport } from '../import-validators'

// ---------------------------------------------------------------------------
// Students validation
// ---------------------------------------------------------------------------
describe('validateImport - students', () => {
  it('valide une ligne correcte', () => {
    const rows = [{ Prenom: 'Alice', Nom: 'Dupont', Email: 'alice@test.com' }]
    const headers = ['Prenom', 'Nom', 'Email']
    const result = validateImport('students', rows, headers)

    expect(result.validCount).toBe(1)
    expect(result.errorCount).toBe(0)
    expect(result.rows[0].status).toBe('valid')
  })

  it('detecte un email manquant', () => {
    const rows = [{ Prenom: 'Alice', Nom: 'Dupont', Email: '' }]
    const headers = ['Prenom', 'Nom', 'Email']
    const result = validateImport('students', rows, headers)

    expect(result.errorCount).toBe(1)
    expect(result.rows[0].errors).toContain('Email manquant')
  })

  it('detecte un email invalide', () => {
    const rows = [{ Prenom: 'Alice', Nom: 'Dupont', Email: 'pas-un-email' }]
    const headers = ['Prenom', 'Nom', 'Email']
    const result = validateImport('students', rows, headers)

    expect(result.errorCount).toBe(1)
    expect(result.rows[0].errors).toContain('Email invalide')
  })

  it('detecte un prenom manquant', () => {
    const rows = [{ Prenom: '', Nom: 'Dupont', Email: 'a@b.com' }]
    const headers = ['Prenom', 'Nom', 'Email']
    const result = validateImport('students', rows, headers)

    expect(result.rows[0].errors).toContain('Prénom manquant')
  })

  it('avertit si la classe n existe pas dans le contexte', () => {
    const rows = [{ 'Prénom': 'Alice', Nom: 'Dupont', Email: 'a@b.com', Classe: 'BTS SIO 1' }]
    const headers = ['Prénom', 'Nom', 'Email', 'Classe']
    const result = validateImport('students', rows, headers, {
      classNames: ['BTS SIO 2'],
    })

    expect(result.rows[0].status).toBe('warning')
    expect(result.rows[0].warnings[0]).toContain('non trouvée')
  })
})

// ---------------------------------------------------------------------------
// Sessions validation
// ---------------------------------------------------------------------------
describe('validateImport - sessions', () => {
  it('valide une seance correcte', () => {
    const rows = [{
      Titre: 'Cours de maths',
      Date: '2026-03-14',
      'Heure debut': '09:00',
      'Heure fin': '11:00',
    }]
    const headers = ['Titre', 'Date', 'Heure debut', 'Heure fin']
    const result = validateImport('sessions', rows, headers)

    expect(result.validCount).toBe(1)
    expect(result.errorCount).toBe(0)
  })

  it('detecte une date manquante', () => {
    const rows = [{
      Titre: 'Cours de maths',
      Date: '',
      'Heure debut': '09:00',
      'Heure fin': '11:00',
    }]
    const headers = ['Titre', 'Date', 'Heure debut', 'Heure fin']
    const result = validateImport('sessions', rows, headers)

    expect(result.rows[0].errors).toContain('Date manquante')
  })

  it('detecte un format de date invalide', () => {
    const rows = [{
      Titre: 'Cours',
      Date: '14/03/2026',
      'Heure debut': '09:00',
      'Heure fin': '11:00',
    }]
    const headers = ['Titre', 'Date', 'Heure debut', 'Heure fin']
    const result = validateImport('sessions', rows, headers)

    expect(result.rows[0].errors).toContain('Date invalide (format attendu: AAAA-MM-JJ)')
  })

  it('detecte un format d heure invalide', () => {
    const rows = [{
      Titre: 'Cours',
      Date: '2026-03-14',
      'Heure debut': '9h00',
      'Heure fin': '11:00',
    }]
    const headers = ['Titre', 'Date', 'Heure debut', 'Heure fin']
    const result = validateImport('sessions', rows, headers)

    expect(result.rows[0].errors).toContain('Heure de début invalide (format attendu: HH:MM)')
  })

  it('detecte une heure de fin avant l heure de debut', () => {
    const rows = [{
      Titre: 'Cours',
      Date: '2026-03-14',
      'Heure debut': '14:00',
      'Heure fin': '10:00',
    }]
    const headers = ['Titre', 'Date', 'Heure debut', 'Heure fin']
    const result = validateImport('sessions', rows, headers)

    expect(result.rows[0].errors).toContain("L'heure de fin doit être après l'heure de début")
  })
})

// ---------------------------------------------------------------------------
// Classes validation
// ---------------------------------------------------------------------------
describe('validateImport - classes', () => {
  it('detecte un diplome manquant', () => {
    const rows = [{ 'Nom classe': 'BTS SIO 1', 'Diplôme': '' }]
    const headers = ['Nom classe', 'Diplôme']
    const result = validateImport('classes', rows, headers)

    expect(result.rows[0].errors).toContain('Diplôme manquant')
  })

  it('detecte un diplome inconnu dans le contexte', () => {
    const rows = [{ 'Nom classe': 'BTS SIO 1', 'Diplôme': 'BTS Inconnu' }]
    const headers = ['Nom classe', 'Diplôme']
    const result = validateImport('classes', rows, headers, {
      diplomaNames: ['BTS SIO', 'Licence Pro'],
    })

    expect(result.rows[0].errors[0]).toContain('non trouvé')
  })

  it('valide une classe avec diplome existant (case-insensitive)', () => {
    const rows = [{ 'Nom classe': 'BTS SIO 1', 'Diplôme': 'bts sio' }]
    const headers = ['Nom classe', 'Diplôme']
    const result = validateImport('classes', rows, headers, {
      diplomaNames: ['BTS SIO'],
    })

    expect(result.errorCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Header normalization (FR -> EN mapping)
// ---------------------------------------------------------------------------
describe('validateImport - normalisation des en-tetes FR', () => {
  it('mappe "Prénom" vers first_name', () => {
    const rows = [{ 'Prénom': 'Alice', 'Nom': 'D', 'E-mail': 'a@b.com' }]
    const headers = ['Prénom', 'Nom', 'E-mail']
    const result = validateImport('students', rows, headers)

    // If mapping works, the row data should have first_name
    expect(result.rows[0].data['first_name']).toBe('Alice')
    expect(result.rows[0].data['email']).toBe('a@b.com')
  })

  it('mappe "Matière" vers subjects pour les professeurs', () => {
    const rows = [{ 'Prénom': 'Jean', 'Nom': 'Prof', 'Email': 'j@p.com', 'Matière': 'Maths' }]
    const headers = ['Prénom', 'Nom', 'Email', 'Matière']
    const result = validateImport('teachers', rows, headers)

    expect(result.rows[0].data['subjects']).toBe('Maths')
  })
})

// ---------------------------------------------------------------------------
// Subjects validation
// ---------------------------------------------------------------------------
describe('validateImport - subjects', () => {
  it('detecte un nom de matiere manquant', () => {
    const rows = [{ 'Nom matière': '' }]
    const headers = ['Nom matière']
    const result = validateImport('subjects', rows, headers)

    expect(result.rows[0].errors).toContain('Nom de matière manquant')
  })

  it('valide une matiere avec nom', () => {
    const rows = [{ 'Nom matière': 'Mathematiques', Code: 'MATH01' }]
    const headers = ['Nom matière', 'Code']
    const result = validateImport('subjects', rows, headers)

    expect(result.validCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Multiple rows / counts
// ---------------------------------------------------------------------------
describe('validateImport - compteurs', () => {
  it('compte correctement valid/error/warning', () => {
    const rows = [
      { Prenom: 'Alice', Nom: 'A', Email: 'a@b.com', Classe: '' },  // valid
      { Prenom: '', Nom: 'B', Email: 'b@c.com', Classe: '' },      // error
      { Prenom: 'Charlie', Nom: 'C', Email: 'c@d.com', Classe: 'X' }, // warning (class not found)
    ]
    const headers = ['Prenom', 'Nom', 'Email', 'Classe']
    const result = validateImport('students', rows, headers, { classNames: ['Y'] })

    expect(result.validCount).toBe(2) // valid + warning count as valid
    expect(result.errorCount).toBe(1)
    expect(result.warningCount).toBe(1)
  })
})
