import { describe, it, expect } from 'vitest'
import {
  buildEquipmentCatalog,
  catalogToOptions,
  namesToEquipment,
  computeRenameUpdates,
  computeDeleteUpdates,
  computeCategoryUpdates,
} from '../equipmentCatalog'
import type { Room, Equipment } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRoom(id: string, equipment: Equipment[]): Room {
  return {
    id,
    name: `Salle ${id}`,
    code: `S${id}`,
    capacity: 30,
    type: 'classroom',
    roomType: 'classroom',
    equipment,
    location: 'Batiment A',
    isActive: true,
    schoolId: 'school-1',
    establishmentId: 'est-1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
}

function makeEquip(name: string, category: Equipment['category'] = 'technology'): Equipment {
  return { id: `eq-${name}`, name, category }
}

// ---------------------------------------------------------------------------
// buildEquipmentCatalog
// ---------------------------------------------------------------------------
describe('buildEquipmentCatalog', () => {
  it('inclut les equipements predefinis', () => {
    const catalog = buildEquipmentCatalog([])
    const names = catalog.map(e => e.name)
    expect(names).toContain('Vidéoprojecteur')
    expect(names).toContain('Ordinateur fixe')
    expect(names).toContain('Extincteur')
  })

  it('ajoute les equipements custom des salles', () => {
    const rooms = [makeRoom('1', [makeEquip('Casque VR', 'specialized')])]
    const catalog = buildEquipmentCatalog(rooms)
    const names = catalog.map(e => e.name)
    expect(names).toContain('Casque VR')
  })

  it('deduplique case-insensitive (predefini gagne)', () => {
    const rooms = [makeRoom('1', [makeEquip('vidéoprojecteur', 'furniture')])]
    const catalog = buildEquipmentCatalog(rooms)
    const vp = catalog.find(e => e.name.toLowerCase() === 'vidéoprojecteur')
    // Predefined entry should win, category = 'multimedia'
    expect(vp).toBeDefined()
    expect(vp!.category).toBe('multimedia')
  })

  it('retourne un catalogue trie par nom', () => {
    const catalog = buildEquipmentCatalog([])
    const names = catalog.map(e => e.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'fr'))
    expect(names).toEqual(sorted)
  })

  it('ignore les salles sans equipment (non-array)', () => {
    const room = makeRoom('1', [])
    ;(room as any).equipment = null
    const catalog = buildEquipmentCatalog([room])
    // Should not crash, just use predefined
    expect(catalog.length).toBeGreaterThan(0)
  })

  it('ignore les equipements null ou sans nom', () => {
    const room = makeRoom('1', [null as any, { id: 'x', name: '', category: 'technology' }])
    // Should not crash
    expect(() => buildEquipmentCatalog([room])).not.toThrow()
  })

  it('utilise "specialized" comme categorie par defaut pour equipements sans categorie', () => {
    const room = makeRoom('1', [{ id: 'x', name: 'Custom Thing', category: undefined as any }])
    const catalog = buildEquipmentCatalog([room])
    const entry = catalog.find(e => e.name === 'Custom Thing')
    expect(entry).toBeDefined()
    expect(entry!.category).toBe('specialized')
  })
})

// ---------------------------------------------------------------------------
// catalogToOptions
// ---------------------------------------------------------------------------
describe('catalogToOptions', () => {
  it('convertit le catalogue en options value/label', () => {
    const catalog = [
      { name: 'Vidéoprojecteur', category: 'multimedia' },
      { name: 'Tableau blanc', category: 'furniture' },
    ]
    const opts = catalogToOptions(catalog)
    expect(opts).toEqual([
      { value: 'Vidéoprojecteur', label: 'Vidéoprojecteur' },
      { value: 'Tableau blanc', label: 'Tableau blanc' },
    ])
  })

  it('retourne un tableau vide pour un catalogue vide', () => {
    expect(catalogToOptions([])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// namesToEquipment
// ---------------------------------------------------------------------------
describe('namesToEquipment', () => {
  const catalog = [
    { name: 'Vidéoprojecteur', category: 'multimedia' },
    { name: 'Tableau blanc', category: 'furniture' },
  ]

  it('convertit des noms en Equipment[] avec categories du catalogue', () => {
    const result = namesToEquipment(['Vidéoprojecteur', 'Tableau blanc'], catalog)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Vidéoprojecteur')
    expect(result[0].category).toBe('multimedia')
    expect(result[1].category).toBe('furniture')
  })

  it('utilise "specialized" comme fallback pour un nom inconnu', () => {
    const result = namesToEquipment(['Inconnu'], catalog)
    expect(result[0].category).toBe('specialized')
  })

  it('genere des ids uniques', () => {
    const result = namesToEquipment(['A', 'B'], catalog)
    expect(result[0].id).not.toBe(result[1].id)
  })
})

// ---------------------------------------------------------------------------
// computeRenameUpdates
// ---------------------------------------------------------------------------
describe('computeRenameUpdates', () => {
  it('retourne les salles affectees avec l equipement renomme', () => {
    const rooms = [
      makeRoom('1', [makeEquip('Vidéoprojecteur', 'multimedia'), makeEquip('Tableau blanc', 'furniture')]),
      makeRoom('2', [makeEquip('Vidéoprojecteur', 'multimedia')]),
      makeRoom('3', [makeEquip('Sono', 'multimedia')]),
    ]
    const updates = computeRenameUpdates(rooms, 'Vidéoprojecteur', 'Projecteur HD')
    expect(updates).toHaveLength(2)
    expect(updates[0].roomId).toBe('1')
    expect(updates[0].newEquipment.find(e => e.name === 'Projecteur HD')).toBeDefined()
    expect(updates[0].newEquipment.find(e => e.name === 'Vidéoprojecteur')).toBeUndefined()
    // Tableau blanc unchanged
    expect(updates[0].newEquipment.find(e => e.name === 'Tableau blanc')).toBeDefined()
  })

  it('est insensible a la casse', () => {
    const rooms = [makeRoom('1', [makeEquip('vidéoprojecteur', 'multimedia')])]
    const updates = computeRenameUpdates(rooms, 'VIDÉOPROJECTEUR', 'VP')
    expect(updates).toHaveLength(1)
  })

  it('retourne un tableau vide si aucune salle n a cet equipement', () => {
    const rooms = [makeRoom('1', [makeEquip('Sono', 'multimedia')])]
    expect(computeRenameUpdates(rooms, 'Vidéoprojecteur', 'VP')).toEqual([])
  })

  it('ignore les salles sans equipment array', () => {
    const room = makeRoom('1', [])
    ;(room as any).equipment = null
    expect(computeRenameUpdates([room], 'Test', 'New')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// computeDeleteUpdates
// ---------------------------------------------------------------------------
describe('computeDeleteUpdates', () => {
  it('retourne les salles sans l equipement supprime', () => {
    const rooms = [
      makeRoom('1', [makeEquip('Vidéoprojecteur', 'multimedia'), makeEquip('Sono', 'multimedia')]),
      makeRoom('2', [makeEquip('Vidéoprojecteur', 'multimedia')]),
    ]
    const updates = computeDeleteUpdates(rooms, 'Vidéoprojecteur')
    expect(updates).toHaveLength(2)
    expect(updates[0].newEquipment).toHaveLength(1)
    expect(updates[0].newEquipment[0].name).toBe('Sono')
    expect(updates[1].newEquipment).toHaveLength(0)
  })

  it('est insensible a la casse', () => {
    const rooms = [makeRoom('1', [makeEquip('sono', 'multimedia')])]
    const updates = computeDeleteUpdates(rooms, 'SONO')
    expect(updates).toHaveLength(1)
    expect(updates[0].newEquipment).toHaveLength(0)
  })

  it('retourne un tableau vide si aucune salle n a cet equipement', () => {
    const rooms = [makeRoom('1', [makeEquip('Sono', 'multimedia')])]
    expect(computeDeleteUpdates(rooms, 'Inconnu')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// computeCategoryUpdates
// ---------------------------------------------------------------------------
describe('computeCategoryUpdates', () => {
  it('met a jour la categorie de l equipement dans toutes les salles', () => {
    const rooms = [
      makeRoom('1', [makeEquip('Vidéoprojecteur', 'multimedia')]),
      makeRoom('2', [makeEquip('Vidéoprojecteur', 'multimedia'), makeEquip('Sono', 'multimedia')]),
    ]
    const updates = computeCategoryUpdates(rooms, 'Vidéoprojecteur', 'technology')
    expect(updates).toHaveLength(2)
    const vp1 = updates[0].newEquipment.find(e => e.name === 'Vidéoprojecteur')
    expect(vp1!.category).toBe('technology')
    // Sono should remain unchanged
    const sono = updates[1].newEquipment.find(e => e.name === 'Sono')
    expect(sono!.category).toBe('multimedia')
  })

  it('est insensible a la casse', () => {
    const rooms = [makeRoom('1', [makeEquip('sono', 'multimedia')])]
    const updates = computeCategoryUpdates(rooms, 'SONO', 'technology')
    expect(updates).toHaveLength(1)
    expect(updates[0].newEquipment[0].category).toBe('technology')
  })

  it('retourne un tableau vide si aucune salle n a cet equipement', () => {
    const rooms = [makeRoom('1', [makeEquip('Sono', 'multimedia')])]
    expect(computeCategoryUpdates(rooms, 'Inconnu', 'technology')).toEqual([])
  })
})
