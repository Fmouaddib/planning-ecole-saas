/**
 * Fonctions pures pour la gestion du catalogue d'équipements.
 * Fusionne le catalogue prédéfini avec les équipements existants en DB.
 */

import type { Room, Equipment, EquipmentCategory } from '@/types'
import { PREDEFINED_EQUIPMENT } from './constants'

export interface CatalogEntry {
  name: string
  category: string
}

/**
 * Fusionne les équipements prédéfinis + ceux déjà présents dans les salles.
 * Dédupliqué case-insensitive, les entrées existantes conservent leur catégorie.
 */
export function buildEquipmentCatalog(rooms: Room[]): CatalogEntry[] {
  const map = new Map<string, CatalogEntry>()

  // D'abord les prédéfinis
  for (const eq of PREDEFINED_EQUIPMENT) {
    map.set(eq.name.toLowerCase(), { name: eq.name, category: eq.category })
  }

  // Puis les équipements existants des salles (ajout si pas déjà présent)
  for (const room of rooms) {
    if (!Array.isArray(room.equipment)) continue
    for (const eq of room.equipment) {
      if (!eq || !eq.name) continue
      const key = eq.name.toLowerCase()
      if (!map.has(key)) {
        map.set(key, { name: eq.name, category: eq.category || 'specialized' })
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/**
 * Convertit le catalogue en options pour le composant MultiSelect.
 */
export function catalogToOptions(catalog: CatalogEntry[]): { value: string; label: string }[] {
  return catalog.map(entry => ({
    value: entry.name,
    label: entry.name,
  }))
}

/**
 * Convertit des noms sélectionnés en Equipment[] pour stockage Supabase.
 * Cherche la catégorie dans le catalogue, fallback 'specialized'.
 */
export function namesToEquipment(names: string[], catalog: CatalogEntry[]): Equipment[] {
  const catMap = new Map<string, string>()
  for (const entry of catalog) {
    catMap.set(entry.name.toLowerCase(), entry.category)
  }

  return names.map((name, i) => ({
    id: `eq-${i}-${Date.now()}`,
    name,
    category: (catMap.get(name.toLowerCase()) || 'specialized') as Equipment['category'],
  }))
}

/**
 * Calcule les salles à mettre à jour lors d'un renommage d'équipement.
 * Retourne un tableau de { roomId, newEquipment } pour chaque salle affectée.
 */
export function computeRenameUpdates(
  rooms: Room[],
  oldName: string,
  newName: string
): { roomId: string; newEquipment: Equipment[] }[] {
  const updates: { roomId: string; newEquipment: Equipment[] }[] = []
  const oldLower = oldName.toLowerCase()

  for (const room of rooms) {
    if (!Array.isArray(room.equipment)) continue
    const hasMatch = room.equipment.some(eq => eq?.name?.toLowerCase() === oldLower)
    if (!hasMatch) continue

    const newEquipment = room.equipment.map(eq =>
      eq?.name?.toLowerCase() === oldLower ? { ...eq, name: newName } : eq
    )
    updates.push({ roomId: room.id, newEquipment })
  }

  return updates
}

/**
 * Calcule les salles à mettre à jour lors de la suppression d'un équipement.
 * Retourne un tableau de { roomId, newEquipment } pour chaque salle affectée.
 */
export function computeDeleteUpdates(
  rooms: Room[],
  equipName: string
): { roomId: string; newEquipment: Equipment[] }[] {
  const updates: { roomId: string; newEquipment: Equipment[] }[] = []
  const nameLower = equipName.toLowerCase()

  for (const room of rooms) {
    if (!Array.isArray(room.equipment)) continue
    const hasMatch = room.equipment.some(eq => eq?.name?.toLowerCase() === nameLower)
    if (!hasMatch) continue

    const newEquipment = room.equipment.filter(eq => eq?.name?.toLowerCase() !== nameLower)
    updates.push({ roomId: room.id, newEquipment })
  }

  return updates
}

/**
 * Calcule les salles à mettre à jour lors du changement de catégorie d'un équipement.
 * Retourne un tableau de { roomId, newEquipment } pour chaque salle affectée.
 */
export function computeCategoryUpdates(
  rooms: Room[],
  equipName: string,
  newCategory: EquipmentCategory
): { roomId: string; newEquipment: Equipment[] }[] {
  const updates: { roomId: string; newEquipment: Equipment[] }[] = []
  const nameLower = equipName.toLowerCase()

  for (const room of rooms) {
    if (!Array.isArray(room.equipment)) continue
    const hasMatch = room.equipment.some(eq => eq?.name?.toLowerCase() === nameLower)
    if (!hasMatch) continue

    const newEquipment = room.equipment.map(eq =>
      eq?.name?.toLowerCase() === nameLower ? { ...eq, category: newCategory } : eq
    )
    updates.push({ roomId: room.id, newEquipment })
  }

  return updates
}
